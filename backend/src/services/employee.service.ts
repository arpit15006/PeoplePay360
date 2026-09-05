import prisma from '../config/db';
import { CreateEmployeeInput, UpdateEmployeeInput } from '../validators/employee.validator';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';
import { Prisma } from '@prisma/client';

export interface EmployeeFilters {
  q?: string;
  departmentId?: string;
  status?: string;
  employeeType?: string;
}

export class EmployeeService {
  /**
   * List employees with filtering and RBAC ownership checks.
   * If the authenticated user is EMPLOYEE, only returns their own employee record.
   */
  static async listEmployees(filters: EmployeeFilters, user: AuthUser) {
    // If EMPLOYEE role, restrict strictly to their own record
    if (user.role === 'EMPLOYEE') {
      if (!user.employeeId) {
        return [];
      }
      const self = await prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: {
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
          workingSchedule: { select: { id: true, name: true, weeklyHours: true } },
          contracts: {
            where: { status: 'ACTIVE' },
            select: { id: true, wage: true, status: true, startDate: true, endDate: true },
            take: 1,
          },
        },
      });
      return self ? [self] : [];
    }

    // HR+, ADMIN: List all with filters
    const where: Prisma.EmployeeWhereInput = {};

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.status) {
      where.status = filters.status as any;
    }

    if (filters.employeeType) {
      where.employeeType = filters.employeeType as any;
    }

    if (filters.q) {
      const query = filters.q.trim();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { employeeCode: { contains: query, mode: 'insensitive' } },
        { jobPosition: { contains: query, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { employeeCode: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        workingSchedule: { select: { id: true, name: true, weeklyHours: true } },
        contracts: {
          where: { status: 'ACTIVE' },
          select: { id: true, wage: true, status: true, startDate: true, endDate: true },
          take: 1,
        },
        _count: {
          select: {
            contracts: true,
            attendances: true,
            timeOffRequests: true,
            payslips: true,
          },
        },
      },
    });

    return employees;
  }

  /**
   * Get single employee by ID
   */
  static async getEmployeeById(id: string, user: AuthUser) {
    if (user.role === 'EMPLOYEE' && user.employeeId !== id) {
      throw new ForbiddenError('You can only access your own employee profile');
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        manager: {
          select: { id: true, name: true, employeeCode: true, jobPosition: true },
        },
        subordinates: {
          select: { id: true, name: true, employeeCode: true, jobPosition: true, status: true },
        },
        workingSchedule: {
          include: {
            dailyShifts: { orderBy: { dayOfWeek: 'asc' } },
          },
        },
        contracts: {
          orderBy: { startDate: 'desc' },
          include: {
            salaryStructure: { select: { id: true, name: true } },
          },
        },
        user: {
          select: { id: true, email: true, role: true, createdAt: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee');
    }

    return employee;
  }

  /**
   * Get smart-button related records count for employee form header
   */
  static async getEmployeeRelatedCounts(id: string, user: AuthUser) {
    if (user.role === 'EMPLOYEE' && user.employeeId !== id) {
      throw new ForbiddenError('You can only access your own employee statistics');
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            contracts: true,
            attendances: true,
            timeOffRequests: true,
            timeOffAllocations: true,
            payslips: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee');
    }

    return employee._count;
  }

  /**
   * Create a new employee
   */
  static async createEmployee(input: CreateEmployeeInput) {
    // Check if email already exists
    const existing = await prisma.employee.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError('An employee with this email already exists');
    }

    // Auto-generate employee code if missing
    let employeeCode = input.employeeCode;
    if (!employeeCode) {
      const count = await prisma.employee.count();
      employeeCode = `EMP-${String(count + 1).padStart(3, '0')}`;
    }

    const employee = await prisma.employee.create({
      data: {
        ...input,
        email: input.email.toLowerCase().trim(),
        employeeCode,
      },
      include: {
        department: true,
        workingSchedule: true,
      },
    });

    return employee;
  }

  /**
   * Update an existing employee
   */
  static async updateEmployee(id: string, input: UpdateEmployeeInput) {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Employee');
    }

    if (input.email && input.email.toLowerCase().trim() !== existing.email) {
      const duplicate = await prisma.employee.findUnique({
        where: { email: input.email.toLowerCase().trim() },
      });
      if (duplicate) {
        throw new ConflictError('An employee with this email already exists');
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...input,
        email: input.email ? input.email.toLowerCase().trim() : undefined,
      },
      include: {
        department: true,
        workingSchedule: true,
        manager: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  /**
   * Delete an employee (Admin only)
   */
  static async deleteEmployee(id: string) {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Employee');
    }

    // Payslips cascade from the employee, so deleting someone who has been paid
    // erases the payroll history the spec requires to be archived. Terminating
    // the record keeps that history while ending their employment, which is the
    // action an HR system should offer here.
    const payslips = await prisma.payslip.count({ where: { employeeId: id } });
    if (payslips > 0) {
      throw new ConflictError(
        `${existing.name} has ${payslips} payslip(s) and cannot be deleted without losing payroll history. Set their status to Terminated instead.`
      );
    }

    await prisma.employee.delete({ where: { id } });
    return { success: true, message: `Employee ${existing.name} deleted successfully` };
  }
}
