import { Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';
import EmployeesDashboard from './components/employees/EmployeesDashboard';
import EmployeeForm from './components/employees/EmployeeForm';
import ContractsList from './components/contracts/ContractsList';
import ContractForm from './components/contracts/ContractForm';
import SchedulesList from './components/schedules/SchedulesList';
import ScheduleForm from './components/schedules/ScheduleForm';
import AttendanceList from './components/attendance/AttendanceList';
import ComingSoonPlaceholder from './components/common/ComingSoonPlaceholder';
import LoginView from './components/auth/LoginView';
import ProtectedRoute from './components/auth/ProtectedRoute';
import type { Role } from './types/user';

const PAYROLL_ROLES: Role[] = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
const PAYSLIP_ROLES: Role[] = ['EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
const DASHBOARD_ROLES: Role[] = [
  'HR_MANAGER',
  'HR_PAYROLL_USER',
  'HR_PAYROLL_MANAGER',
  'ADMIN',
];

/** Placeholder for a screen that is not built yet, wrapped in its role guard. */
const soon = (pageName: string, routePath: string, allow?: Role[]) => (
  <ProtectedRoute allow={allow}>
    <ComingSoonPlaceholder pageName={pageName} routePath={routePath} />
  </ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      {/* Screen 1 — full-screen standalone login, outside the app shell */}
      <Route path="/login" element={<LoginView />} />

      {/* Authenticated application */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/employees" replace />} />

                {/* Employees */}
                <Route path="/employees" element={<EmployeesDashboard />} />
                <Route path="/employees/new" element={soon('New Employee', '/employees/new')} />
                <Route
                  path="/employees/:id"
                  element={
                    <ProtectedRoute>
                      <EmployeeForm />
                    </ProtectedRoute>
                  }
                />

                {/* Contracts */}
                <Route
                  path="/contracts"
                  element={
                    <ProtectedRoute>
                      <ContractsList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contracts/:id"
                  element={
                    <ProtectedRoute>
                      <ContractForm />
                    </ProtectedRoute>
                  }
                />

                {/* Working Schedules */}
                <Route
                  path="/schedules"
                  element={
                    <ProtectedRoute>
                      <SchedulesList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/schedules/:id"
                  element={
                    <ProtectedRoute>
                      <ScheduleForm />
                    </ProtectedRoute>
                  }
                />

                {/* Attendance */}
                <Route
                  path="/attendance"
                  element={
                    <ProtectedRoute>
                      <AttendanceList />
                    </ProtectedRoute>
                  }
                />
                <Route path="/attendance/:id" element={soon('Attendance Form', '/attendance/:id')} />

                {/* Time Off */}
                <Route path="/timeoff" element={<Navigate to="/timeoff/requests" replace />} />
                <Route path="/timeoff/requests" element={soon('Time Off Requests', '/timeoff/requests')} />
                <Route path="/timeoff/allocations" element={soon('Time Off Allocations', '/timeoff/allocations')} />
                <Route path="/timeoff/types" element={soon('Time Off Types', '/timeoff/types')} />

                {/* Payroll */}
                <Route path="/payroll" element={<Navigate to="/payroll/payruns" replace />} />
                <Route path="/payroll/payruns" element={soon('Payruns', '/payroll/payruns', PAYROLL_ROLES)} />
                <Route path="/payroll/payruns/new" element={soon('Payrun Wizard', '/payroll/payruns/new', PAYROLL_ROLES)} />
                <Route path="/payroll/payruns/:id" element={soon('Payrun Processing', '/payroll/payruns/:id', PAYROLL_ROLES)} />
                <Route path="/payroll/payslips" element={soon('Payslips', '/payroll/payslips', PAYSLIP_ROLES)} />
                <Route path="/payroll/payslips/:id" element={soon('Payslip Detail', '/payroll/payslips/:id', PAYSLIP_ROLES)} />
                <Route path="/payroll/structures" element={soon('Salary Structures', '/payroll/structures', PAYROLL_ROLES)} />
                <Route path="/payroll/rules" element={soon('Salary Rules', '/payroll/rules', PAYROLL_ROLES)} />

                {/* Payroll Dashboard */}
                <Route path="/dashboard" element={soon('Payroll Dashboard', '/dashboard', DASHBOARD_ROLES)} />

                <Route path="*" element={<Navigate to="/employees" replace />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
