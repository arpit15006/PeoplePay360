import { PrismaClient, Role, EmployeeStatus, EmployeeType, ContractStatus, ScheduleType, AttendanceStatus, TimeOffStatus, RuleCategory, RuleCalcType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for PeoplePay360...');

  // 1. Clean existing records in correct reverse dependency order
  await prisma.payslipLine.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrun.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.timeOffAllocation.deleteMany();
  await prisma.timeOffType.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.salaryRule.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.dailySchedule.deleteMany();
  await prisma.workingSchedule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Create Departments
  console.log('Creating Departments...');
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } });
  const sales = await prisma.department.create({ data: { name: 'Sales' } });
  const hrDept = await prisma.department.create({ data: { name: 'Human Resources' } });
  const finance = await prisma.department.create({ data: { name: 'Finance & Payroll' } });
  const marketing = await prisma.department.create({ data: { name: 'Marketing' } });

  // 3. Create Working Schedules with Monday-Sunday shifts & auto-calculated weekly hours
  console.log('Creating Working Schedules...');
  const standardSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Standard 40h Working Schedule',
      type: ScheduleType.STANDARD,
      weeklyHours: 40.0, // (9h - 1h break) * 5 = 40h
      status: 'Active',
      dailyShifts: {
        create: [
          { dayOfWeek: 0, dayName: 'Sunday', startTime: '00:00', endTime: '00:00', breakMinutes: 0, isWorkingDay: false },
          { dayOfWeek: 1, dayName: 'Monday', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkingDay: true },
          { dayOfWeek: 2, dayName: 'Tuesday', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkingDay: true },
          { dayOfWeek: 3, dayName: 'Wednesday', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkingDay: true },
          { dayOfWeek: 4, dayName: 'Thursday', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkingDay: true },
          { dayOfWeek: 5, dayName: 'Friday', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isWorkingDay: true },
          { dayOfWeek: 6, dayName: 'Saturday', startTime: '00:00', endTime: '00:00', breakMinutes: 0, isWorkingDay: false },
        ],
      },
    },
  });

  // 4. Create Salary Structures & Sequential Salary Rules (PRD Section 14 & 15)
  console.log('Creating Salary Structures & Rules...');
  const regularStructure = await prisma.salaryStructure.create({
    data: {
      name: 'Regular Salary',
      status: 'Active',
      rules: {
        create: [
          {
            name: 'Basic Salary',
            code: 'BASIC',
            category: RuleCategory.BASIC,
            sequence: 10,
            calculationType: RuleCalcType.PERCENTAGE,
            value: '0.60 * contract.wage',
            condition: 'True',
            status: 'Active',
          },
          {
            name: 'House Rent Allowance (HRA)',
            code: 'HRA',
            category: RuleCategory.ALLOWANCE,
            sequence: 20,
            calculationType: RuleCalcType.PERCENTAGE,
            value: '0.40 * BASIC',
            condition: 'True',
            status: 'Active',
          },
          {
            name: 'Transport Allowance',
            code: 'TRANS',
            category: RuleCategory.ALLOWANCE,
            sequence: 30,
            calculationType: RuleCalcType.FIXED,
            value: '5000',
            condition: 'True',
            status: 'Active',
          },
          {
            name: 'Performance Bonus',
            code: 'PERF',
            category: RuleCategory.ALLOWANCE,
            sequence: 35,
            calculationType: RuleCalcType.FIXED,
            value: '8000',
            condition: 'contract.wage >= 70000',
            status: 'Active',
          },
          {
            name: 'Provident Fund (PF)',
            code: 'PF',
            category: RuleCategory.DEDUCTION,
            sequence: 40,
            calculationType: RuleCalcType.PERCENTAGE,
            value: '0.12 * BASIC',
            condition: 'True',
            status: 'Active',
          },
          {
            name: 'Professional Tax & TDS',
            code: 'TAX',
            category: RuleCategory.DEDUCTION,
            sequence: 50,
            calculationType: RuleCalcType.FIXED,
            value: '2300',
            condition: 'True',
            status: 'Active',
          },
          {
            name: 'Net Salary',
            code: 'NET',
            category: RuleCategory.NET,
            sequence: 60,
            calculationType: RuleCalcType.FORMULA,
            value: 'GROSS - DEDUCTIONS',
            condition: 'True',
            status: 'Active',
          },
        ],
      },
    },
  });

  // 5. Create Employees (matching PRD characters: Aarav Sharma, Priya Patel, Rahul Mehta, Ananya Singh)
  console.log('Creating Employees...');
  const aarav = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-001',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@peoplepay360.com',
      phone: '+91 98765 43210',
      departmentId: engineering.id,
      jobPosition: 'Lead Software Architect',
      employeeType: EmployeeType.FULL_TIME,
      scheduleId: standardSchedule.id,
      status: EmployeeStatus.ACTIVE,
    },
  });

  const priya = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-002',
      name: 'Priya Patel',
      email: 'priya.patel@peoplepay360.com',
      phone: '+91 98765 43211',
      departmentId: engineering.id,
      jobPosition: 'Senior Product Designer',
      employeeType: EmployeeType.FULL_TIME,
      scheduleId: standardSchedule.id,
      status: EmployeeStatus.ACTIVE,
      managerId: aarav.id,
    },
  });

  const rahul = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-003',
      name: 'Rahul Mehta',
      email: 'rahul.mehta@peoplepay360.com',
      phone: '+91 98765 43212',
      departmentId: sales.id,
      jobPosition: 'Enterprise Account Executive',
      employeeType: EmployeeType.FULL_TIME,
      scheduleId: standardSchedule.id,
      status: EmployeeStatus.ACTIVE,
    },
  });

  const ananya = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-004',
      name: 'Ananya Singh',
      email: 'ananya.singh@peoplepay360.com',
      phone: '+91 98765 43213',
      departmentId: engineering.id,
      jobPosition: 'Fullstack Engineer',
      employeeType: EmployeeType.FULL_TIME,
      scheduleId: standardSchedule.id,
      status: EmployeeStatus.ACTIVE,
      managerId: aarav.id,
    },
  });

  const sunita = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-005',
      name: 'Sunita Rao',
      email: 'hr.manager@peoplepay360.com',
      phone: '+91 98765 43214',
      departmentId: hrDept.id,
      jobPosition: 'Head of People & Culture',
      employeeType: EmployeeType.FULL_TIME,
      scheduleId: standardSchedule.id,
      status: EmployeeStatus.ACTIVE,
    },
  });

  // Assign department managers
  await prisma.department.update({ where: { id: engineering.id }, data: { managerId: aarav.id } });
  await prisma.department.update({ where: { id: hrDept.id }, data: { managerId: sunita.id } });

  // 6. Create Users for all 5 roles (matching demo logins)
  console.log('Creating User accounts for all 5 roles...');
  await prisma.user.createMany({
    data: [
      {
        name: 'Super Admin',
        email: 'admin@peoplepay360.com',
        password: passwordHash,
        role: Role.ADMIN,
      },
      {
        name: 'Sunita Rao',
        email: 'hr.manager@peoplepay360.com',
        password: passwordHash,
        role: Role.HR_MANAGER,
        employeeId: sunita.id,
      },
      {
        name: 'Rohan Verma',
        email: 'payroll.user@peoplepay360.com',
        password: passwordHash,
        role: Role.HR_PAYROLL_USER,
      },
      {
        name: 'Meera Joshi',
        email: 'payroll.manager@peoplepay360.com',
        password: passwordHash,
        role: Role.HR_PAYROLL_MANAGER,
      },
      {
        name: 'Aarav Sharma',
        email: 'employee@peoplepay360.com',
        password: passwordHash,
        role: Role.EMPLOYEE,
        employeeId: aarav.id,
      },
      {
        name: 'Priya Patel',
        email: 'priya.patel@peoplepay360.com',
        password: passwordHash,
        role: Role.EMPLOYEE,
        employeeId: priya.id,
      },
    ],
  });

  // 7. Create Contracts — Including the PRD Section 6 Contract-Period Requirement!
  console.log('Creating Contracts with period validity...');
  // Aarav Sharma Contract 1: Expired (01/01/2025 -> 31/12/2025 at ₹50,000)
  await prisma.contract.create({
    data: {
      employeeId: aarav.id,
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2025-12-31T23:59:59.000Z'),
      wage: 50000.0,
      departmentId: engineering.id,
      position: 'Senior Software Engineer',
      salaryStructureId: regularStructure.id,
      status: ContractStatus.EXPIRED,
    },
  });

  // Aarav Sharma Contract 2: ACTIVE (01/01/2026 -> 31/12/2026 at ₹75,000)
  await prisma.contract.create({
    data: {
      employeeId: aarav.id,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      wage: 75000.0,
      departmentId: engineering.id,
      position: 'Lead Software Architect',
      salaryStructureId: regularStructure.id,
      status: ContractStatus.ACTIVE,
    },
  });

  // Priya Patel Contract (2026 Active)
  await prisma.contract.create({
    data: {
      employeeId: priya.id,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      wage: 65000.0,
      departmentId: engineering.id,
      position: 'Senior Product Designer',
      salaryStructureId: regularStructure.id,
      status: ContractStatus.ACTIVE,
    },
  });

  // Rahul Mehta Contract (2026 Active)
  await prisma.contract.create({
    data: {
      employeeId: rahul.id,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      wage: 55000.0,
      departmentId: sales.id,
      position: 'Enterprise Account Executive',
      salaryStructureId: regularStructure.id,
      status: ContractStatus.ACTIVE,
    },
  });

  // Ananya Singh Contract (2026 Active)
  await prisma.contract.create({
    data: {
      employeeId: ananya.id,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      wage: 60000.0,
      departmentId: engineering.id,
      position: 'Fullstack Engineer',
      salaryStructureId: regularStructure.id,
      status: ContractStatus.ACTIVE,
    },
  });

  // 8. Create Time Off Types & Allocations (PRD Section 12 & 13)
  console.log('Creating Time Off Types and Allocations...');
  const annualLeave = await prisma.timeOffType.create({
    data: {
      name: 'Annual Leave',
      unit: 'Days',
      allocationRequired: true,
      approvalType: 'Manager Approval',
      payrollIntegration: false,
      status: 'Active',
    },
  });

  const sickLeave = await prisma.timeOffType.create({
    data: {
      name: 'Sick Leave',
      unit: 'Days',
      allocationRequired: true,
      approvalType: 'Manager Approval',
      payrollIntegration: true,
      status: 'Active',
    },
  });

  const unpaidLeave = await prisma.timeOffType.create({
    data: {
      name: 'Unpaid Leave',
      unit: 'Days',
      allocationRequired: false,
      approvalType: 'Manager Approval',
      payrollIntegration: true,
      status: 'Active',
    },
  });

  // Allocations for Aarav Sharma (Allocated: 24, Taken: 8, Remaining: 16)
  await prisma.timeOffAllocation.create({
    data: {
      employeeId: aarav.id,
      timeOffTypeId: annualLeave.id,
      allocated: 24.0,
      taken: 8.0,
      remaining: 16.0,
      validityYear: 2026,
      status: 'Approved',
    },
  });

  await prisma.timeOffAllocation.create({
    data: {
      employeeId: aarav.id,
      timeOffTypeId: sickLeave.id,
      allocated: 12.0,
      taken: 2.0,
      remaining: 10.0,
      validityYear: 2026,
      status: 'Approved',
    },
  });

  await prisma.timeOffAllocation.create({
    data: {
      employeeId: priya.id,
      timeOffTypeId: annualLeave.id,
      allocated: 24.0,
      taken: 4.0,
      remaining: 20.0,
      validityYear: 2026,
      status: 'Approved',
    },
  });

  await prisma.timeOffAllocation.create({
    data: {
      employeeId: ananya.id,
      timeOffTypeId: annualLeave.id,
      allocated: 24.0,
      taken: 3.0,
      remaining: 21.0,
      validityYear: 2026,
      status: 'Approved',
    },
  });

  // 9. Create Time Off Requests
  console.log('Creating Time Off Requests...');
  await prisma.timeOffRequest.create({
    data: {
      employeeId: aarav.id,
      timeOffTypeId: annualLeave.id,
      startDate: new Date('2026-09-05T00:00:00.000Z'),
      endDate: new Date('2026-09-07T23:59:59.000Z'),
      duration: 3.0,
      reason: 'Family function',
      status: TimeOffStatus.APPROVED,
    },
  });

  await prisma.timeOffRequest.create({
    data: {
      employeeId: priya.id,
      timeOffTypeId: sickLeave.id,
      startDate: new Date('2026-09-12T00:00:00.000Z'),
      endDate: new Date('2026-09-13T23:59:59.000Z'),
      duration: 2.0,
      reason: 'Doctor appointment & recovery',
      status: TimeOffStatus.APPROVED,
    },
  });

  // 10. Create Attendance Logs (PRD Section 8)
  console.log('Creating Attendance logs for September 2026...');
  // Aarav: 09:05 -> 18:02, 8h 57m, Present
  await prisma.attendance.create({
    data: {
      employeeId: aarav.id,
      date: new Date('2026-09-01T00:00:00.000Z'),
      checkIn: '09:05',
      checkOut: '18:02',
      workedHours: 7.95, // 09:05-18:02 less the 60 min unpaid break
      status: AttendanceStatus.PRESENT,
      notes: 'On time, regular shift',
    },
  });

  // Rahul: 09:42 -> 18:00, 8h 18m, Late
  await prisma.attendance.create({
    data: {
      employeeId: rahul.id,
      date: new Date('2026-09-01T00:00:00.000Z'),
      checkIn: '09:42',
      checkOut: '18:00',
      workedHours: 7.30, // 09:42-18:00 less the 60 min unpaid break
      status: AttendanceStatus.LATE,
      notes: 'Traffic delay on highway',
    },
  });

  // Generate standard attendance for 22 working days in September 2026 for Aarav, Priya, Rahul, Ananya
  const employees = [aarav, priya, rahul, ananya];
  for (const emp of employees) {
    for (let day = 2; day <= 22; day++) {
      const dateStr = `2026-09-${day.toString().padStart(2, '0')}T00:00:00.000Z`;
      // Skip weekends (roughly)
      const d = new Date(dateStr);
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            date: d,
            checkIn: '09:00',
            checkOut: '18:00',
            workedHours: 8.0,
            status: AttendanceStatus.PRESENT,
          },
        }).catch(() => {});
      }
    }
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
