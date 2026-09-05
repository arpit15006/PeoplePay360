import prisma from '../config/db';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export interface DepartmentInput {
  name: string;
  managerId?: string | null;
}

const WITH_COUNTS = {
  manager: { select: { id: true, name: true, employeeCode: true } },
  _count: { select: { employees: true, contracts: true } },
} as const;

export class DepartmentService {
  static async listDepartments() {
    return prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: WITH_COUNTS,
    });
  }

  static async getDepartmentById(id: string) {
    const department = await prisma.department.findUnique({
      where: { id },
      include: WITH_COUNTS,
    });
    if (!department) throw new NotFoundError('Department');
    return department;
  }

  static async createDepartment(input: DepartmentInput) {
    const name = input.name.trim();

    // The column is unique, so a clash would otherwise surface as an opaque
    // database error rather than something the form can show.
    if (await prisma.department.findUnique({ where: { name } })) {
      throw new ConflictError(`A department named "${name}" already exists`);
    }

    if (input.managerId) await assertEmployeeExists(input.managerId);

    return prisma.department.create({
      data: { name, managerId: input.managerId || null },
      include: WITH_COUNTS,
    });
  }

  static async updateDepartment(id: string, input: Partial<DepartmentInput>) {
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Department');

    if (input.name && input.name.trim() !== existing.name) {
      const clash = await prisma.department.findUnique({ where: { name: input.name.trim() } });
      if (clash) throw new ConflictError(`A department named "${input.name.trim()}" already exists`);
    }

    if (input.managerId) await assertEmployeeExists(input.managerId);

    return prisma.department.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.managerId !== undefined ? { managerId: input.managerId || null } : {}),
      },
      include: WITH_COUNTS,
    });
  }

  static async deleteDepartment(id: string) {
    const existing = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true, contracts: true } } },
    });
    if (!existing) throw new NotFoundError('Department');

    // Employee.departmentId is required and contracts reference the department
    // for payroll history, so removing one that is still in use would either
    // fail at the database or strand records. Say which, and how many.
    const { employees, contracts } = existing._count;
    if (employees > 0 || contracts > 0) {
      const parts = [
        employees > 0 ? `${employees} employee(s)` : null,
        contracts > 0 ? `${contracts} contract(s)` : null,
      ].filter(Boolean);
      throw new ConflictError(
        `${existing.name} still has ${parts.join(' and ')}. Move them to another department first.`
      );
    }

    await prisma.department.delete({ where: { id } });
    return { id };
  }
}

/** A manager must be a real employee; the relation would otherwise fail opaquely. */
async function assertEmployeeExists(employeeId: string): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!employee) throw new ValidationError('The selected manager is not an employee');
}
