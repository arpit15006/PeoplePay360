import prisma from '../config/db';
import { AttendanceStatus, EmployeeType, PayrunStatus, TimeOffStatus } from '@prisma/client';

export interface DashboardFilters {
  period?: string; // "September 2026"
  departmentId?: string;
  employeeType?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Turn a payslip period label ("September 2026") into the calendar range it covers.
 *
 * Payslips store the period as a string, but attendance and time off are dated
 * rows, so they can only be scoped to the selected period through a date range.
 * Built in UTC because the calendar dates elsewhere in the app are UTC — using
 * local time would pull a neighbouring day in at either boundary.
 *
 * Returns null for a label that does not parse, in which case the caller leaves
 * those sections unfiltered rather than silently reporting zero.
 */
function periodRange(period: string): { gte: Date; lte: Date } | null {
  const [monthName, yearText] = period.trim().split(/\s+/);
  const monthIndex = MONTHS.indexOf(monthName);
  const year = Number(yearText);

  if (monthIndex < 0 || !Number.isInteger(year)) return null;

  return {
    gte: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
    lte: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)),
  };
}

export class DashboardService {
  static async getMetrics(filters: DashboardFilters) {
    const period = filters.period || 'September 2026';
    const range = periodRange(period);

    // Base employee filter
    const empWhere: any = {};
    if (filters.departmentId) empWhere.departmentId = filters.departmentId;
    if (filters.employeeType) empWhere.employeeType = filters.employeeType as EmployeeType;

    const employeeFilter = Object.keys(empWhere).length > 0 ? empWhere : undefined;

    // Attendance and time off are dated rows, so the selected period scopes them
    // by date. Time off is counted when it overlaps the period at all, not only
    // when it starts inside it, so a leave spanning a month boundary still shows.
    const attendanceDateWhere = range ? { date: range } : {};
    const timeOffOverlapWhere = range
      ? { startDate: { lte: range.lte }, endDate: { gte: range.gte } }
      : {};

    // 1. Payslips for period
    const payslipWhere: any = { period };
    if (filters.departmentId || filters.employeeType) {
      payslipWhere.employee = empWhere;
    }

    // Every query below is independent — none reads another's result — so they are
    // issued concurrently. The database is remote, so each sequential await used to
    // cost a full network round-trip; running them together collapses seven
    // round-trips into roughly one.
    const [payslips, approvedTimeOff, attendances, departments, timeOffTypes, trendRows, draftPayruns, pendingLeaves] =
      await Promise.all([
        // 1. Payslips for period
        prisma.payslip.findMany({
          where: payslipWhere,
          include: {
            employee: { select: { departmentId: true, employeeType: true } },
          },
        }),

        // 2. Approved Time Off / Leaves
        prisma.timeOffRequest.count({
          where: {
            status: TimeOffStatus.APPROVED,
            employee: employeeFilter,
            ...timeOffOverlapWhere,
          },
        }),

        // 3. Attendance Health
        prisma.attendance.findMany({
          where: {
            employee: employeeFilter,
            ...attendanceDateWhere,
          },
          select: {
            status: true,
            checkOut: true,
            overtimeHours: true,
            manuallyEdited: true,
          },
        }),

        // 4. Salary Cost by Department
        prisma.department.findMany({
          include: {
            employees: {
              where: filters.employeeType ? { employeeType: filters.employeeType as EmployeeType } : undefined,
              select: { id: true },
            },
          },
        }),

        // 5. Time Off Overview by Type
        prisma.timeOffType.findMany({
          include: {
            requests: {
              where: {
                status: TimeOffStatus.APPROVED,
                employee: employeeFilter,
                ...timeOffOverlapWhere,
              },
            },
          },
        }),

        // 7. Monthly net salary trend. Grouped in the database rather than
        // pulling every payslip back, and deliberately not scoped to the
        // selected period: a trend needs the periods either side of it.
        prisma.payslip.groupBy({
          by: ['period'],
          where: employeeFilter ? { employee: employeeFilter } : undefined,
          _sum: { netSalary: true, grossSalary: true },
          _count: { _all: true },
        }),

        // 6. Actionable Alerts — payruns still awaiting computation
        prisma.payrun.count({ where: { status: PayrunStatus.DRAFT } }),

        // 6. Actionable Alerts — leave requests awaiting approval
        prisma.timeOffRequest.count({ where: { status: TimeOffStatus.TO_APPROVE } }),
      ]);

    const payslipsGenerated = payslips.length;
    const totalNetSalaryPaid = payslips.reduce((sum, p) => sum + p.netSalary, 0);
    const totalGrossSalary = payslips.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalDeductions = payslips.reduce((sum, p) => sum + p.totalDeductions, 0);
    const averageSalary = payslipsGenerated > 0 ? Math.round(totalNetSalaryPaid / payslipsGenerated) : 0;

    const totalLogs = attendances.length;
    const presentLogs = attendances.filter((a) => a.status !== AttendanceStatus.ABSENT).length;

    const attendanceHealth = {
      present: attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length,
      late: attendances.filter((a) => a.status === AttendanceStatus.LATE).length,
      halfDay: attendances.filter((a) => a.status === AttendanceStatus.HALF_DAY).length,
      absent: attendances.filter((a) => a.status === AttendanceStatus.ABSENT).length,
      totalLogs,
      // Hours logged beyond the scheduled day.
      overtimeHours: Math.round(attendances.reduce((sum, a) => sum + a.overtimeHours, 0) * 100) / 100,
      // Someone clocked in and never clocked out; the day cannot be trusted.
      missingCheckOuts: attendances.filter((a) => !a.checkOut).length,
      // Records an authorised user corrected rather than the employee clocking.
      manualEdits: attendances.filter((a) => a.manuallyEdited).length,
      // Share of logged days where the employee actually turned up.
      coverage: totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 1000) / 10 : 0,
    };

    const salaryCostByDepartment = [];
    for (const dept of departments) {
      const deptEmpIds = dept.employees.map((e) => e.id);
      const deptPayslips = payslips.filter((p) => deptEmpIds.includes(p.employeeId));
      const deptNet = deptPayslips.reduce((sum, p) => sum + p.netSalary, 0);
      const deptGross = deptPayslips.reduce((sum, p) => sum + p.grossSalary, 0);

      salaryCostByDepartment.push({
        departmentId: dept.id,
        departmentName: dept.name,
        employeeCount: dept.employees.length,
        payslipsCount: deptPayslips.length,
        totalNet: Math.round(deptNet * 100) / 100,
        totalGross: Math.round(deptGross * 100) / 100,
      });
    }

    const timeOffOverview = timeOffTypes.map((t) => ({
      typeName: t.name,
      unit: t.unit,
      approvedRequestsCount: t.requests.length,
      totalDuration: t.requests.reduce((sum, r) => sum + r.duration, 0),
    }));

    // Payslip periods are labels, so they sort alphabetically rather than
    // chronologically; parsing each one back to a date restores real order.
    const salaryTrend = trendRows
      .map((row) => {
        const range = periodRange(row.period);
        return {
          period: row.period,
          sortKey: range ? range.gte.getTime() : 0,
          totalNet: Math.round((row._sum.netSalary ?? 0) * 100) / 100,
          totalGross: Math.round((row._sum.grossSalary ?? 0) * 100) / 100,
          payslipsCount: row._count._all,
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ sortKey: _sortKey, ...rest }) => rest);

    // 6. Actionable Alerts
    const alerts = [];
    if (draftPayruns > 0) {
      alerts.push({
        type: 'warning',
        message: `${draftPayruns} payrun(s) in Draft state awaiting computation`,
      });
    }

    if (pendingLeaves > 0) {
      alerts.push({
        type: 'info',
        message: `${pendingLeaves} time-off request(s) awaiting manager approval`,
      });
    }

    return {
      period,
      kpis: {
        totalNetSalaryPaid: Math.round(totalNetSalaryPaid * 100) / 100,
        totalGrossSalary: Math.round(totalGrossSalary * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        payslipsGenerated,
        averageSalary,
        approvedTimeOff,
      },
      attendanceHealth,
      salaryCostByDepartment,
      salaryTrend,
      timeOffOverview,
      alerts,
    };
  }
}
