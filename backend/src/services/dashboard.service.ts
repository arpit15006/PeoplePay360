import prisma from '../config/db';
import { AttendanceStatus, EmployeeType, PayrunStatus, TimeOffStatus } from '@prisma/client';

export interface DashboardFilters {
  period?: string; // "September 2026"
  departmentId?: string;
  employeeType?: string;
}

export class DashboardService {
  static async getMetrics(filters: DashboardFilters) {
    const period = filters.period || 'September 2026';

    // Base employee filter
    const empWhere: any = {};
    if (filters.departmentId) empWhere.departmentId = filters.departmentId;
    if (filters.employeeType) empWhere.employeeType = filters.employeeType as EmployeeType;

    // 1. Payslips for period
    const payslipWhere: any = { period };
    if (filters.departmentId || filters.employeeType) {
      payslipWhere.employee = empWhere;
    }

    const payslips = await prisma.payslip.findMany({
      where: payslipWhere,
      include: {
        employee: { select: { departmentId: true, employeeType: true } },
      },
    });

    const payslipsGenerated = payslips.length;
    const totalNetSalaryPaid = payslips.reduce((sum, p) => sum + p.netSalary, 0);
    const totalGrossSalary = payslips.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalDeductions = payslips.reduce((sum, p) => sum + p.totalDeductions, 0);
    const averageSalary = payslipsGenerated > 0 ? Math.round(totalNetSalaryPaid / payslipsGenerated) : 0;

    // 2. Approved Time Off / Leaves
    const approvedTimeOff = await prisma.timeOffRequest.count({
      where: {
        status: TimeOffStatus.APPROVED,
        employee: Object.keys(empWhere).length > 0 ? empWhere : undefined,
      },
    });

    // 3. Attendance Health
    const attendances = await prisma.attendance.findMany({
      where: {
        employee: Object.keys(empWhere).length > 0 ? empWhere : undefined,
      },
      select: { status: true },
    });

    const attendanceHealth = {
      present: attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length,
      late: attendances.filter((a) => a.status === AttendanceStatus.LATE).length,
      halfDay: attendances.filter((a) => a.status === AttendanceStatus.HALF_DAY).length,
      absent: attendances.filter((a) => a.status === AttendanceStatus.ABSENT).length,
      totalLogs: attendances.length,
    };

    // 4. Salary Cost by Department
    const departments = await prisma.department.findMany({
      include: {
        employees: {
          where: filters.employeeType ? { employeeType: filters.employeeType as EmployeeType } : undefined,
          select: { id: true },
        },
      },
    });

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

    // 5. Time Off Overview by Type
    const timeOffTypes = await prisma.timeOffType.findMany({
      include: {
        requests: {
          where: {
            status: TimeOffStatus.APPROVED,
            employee: Object.keys(empWhere).length > 0 ? empWhere : undefined,
          },
        },
      },
    });

    const timeOffOverview = timeOffTypes.map((t) => ({
      typeName: t.name,
      unit: t.unit,
      approvedRequestsCount: t.requests.length,
      totalDuration: t.requests.reduce((sum, r) => sum + r.duration, 0),
    }));

    // 6. Actionable Alerts
    const alerts = [];
    const draftPayruns = await prisma.payrun.count({ where: { status: PayrunStatus.DRAFT } });
    if (draftPayruns > 0) {
      alerts.push({
        type: 'warning',
        message: `${draftPayruns} payrun(s) in Draft state awaiting computation`,
      });
    }

    const pendingLeaves = await prisma.timeOffRequest.count({ where: { status: TimeOffStatus.TO_APPROVE } });
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
      timeOffOverview,
      alerts,
    };
  }
}
