import type { EmployeeRow } from '@/types/employee';

/**
 * TEMPORARY data source for PRD Screen 2.
 *
 * These rows mirror backend/prisma/seed.ts exactly (same codes, departments,
 * positions, managers and schedule) so the screen matches the seeded Neon data.
 *
 * The employees API is not built yet — backend/src/routes/employees.routes.ts,
 * employees.controller.ts and employee.service.ts are still `export {}`.
 * Once GET /api/employees exists, delete this file and swap the body of
 * useEmployees() to a single api.get<EmployeeRow[]>('/employees') call.
 */
export const MOCK_EMPLOYEES: EmployeeRow[] = [
  {
    id: 'emp-001',
    employeeCode: 'EMP-001',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@peoplepay360.com',
    department: 'Engineering',
    jobPosition: 'Lead Software Architect',
    manager: null,
    workingSchedule: 'Standard 40h Working Schedule',
    employeeType: 'FULL_TIME',
    status: 'ACTIVE',
  },
  {
    id: 'emp-002',
    employeeCode: 'EMP-002',
    name: 'Priya Patel',
    email: 'priya.patel@peoplepay360.com',
    department: 'Engineering',
    jobPosition: 'Senior Product Designer',
    manager: 'Aarav Sharma',
    workingSchedule: 'Standard 40h Working Schedule',
    employeeType: 'FULL_TIME',
    status: 'ACTIVE',
  },
  {
    id: 'emp-003',
    employeeCode: 'EMP-003',
    name: 'Rahul Mehta',
    email: 'rahul.mehta@peoplepay360.com',
    department: 'Sales',
    jobPosition: 'Enterprise Account Executive',
    manager: null,
    workingSchedule: 'Standard 40h Working Schedule',
    employeeType: 'FULL_TIME',
    status: 'ACTIVE',
  },
  {
    id: 'emp-004',
    employeeCode: 'EMP-004',
    name: 'Ananya Singh',
    email: 'ananya.singh@peoplepay360.com',
    department: 'Engineering',
    jobPosition: 'Fullstack Engineer',
    manager: 'Aarav Sharma',
    workingSchedule: 'Standard 40h Working Schedule',
    employeeType: 'FULL_TIME',
    status: 'ACTIVE',
  },
  {
    id: 'emp-005',
    employeeCode: 'EMP-005',
    name: 'Sunita Rao',
    email: 'hr.manager@peoplepay360.com',
    department: 'Human Resources',
    jobPosition: 'Head of People & Culture',
    manager: null,
    workingSchedule: 'Standard 40h Working Schedule',
    employeeType: 'FULL_TIME',
    status: 'ACTIVE',
  },
];
