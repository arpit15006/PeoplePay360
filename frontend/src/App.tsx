import { Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';
import EmployeesDashboard from './components/employees/EmployeesDashboard';
import EmployeeForm from './components/employees/EmployeeForm';
import ContractsList from './components/contracts/ContractsList';
import ContractForm from './components/contracts/ContractForm';
import SchedulesList from './components/schedules/SchedulesList';
import ScheduleForm from './components/schedules/ScheduleForm';
import AttendanceList from './components/attendance/AttendanceList';
import TimeOffRequests from './components/timeoff/TimeOffRequests';
import TimeOffAllocations from './components/timeoff/TimeOffAllocations';
import TimeOffTypes from './components/timeoff/TimeOffTypes';
import SalaryStructures from './components/payroll/SalaryStructures';
import SalaryRules from './components/payroll/SalaryRules';
import PayrunList from './components/payroll/PayrunList';
import PayrunWizard from './components/payroll/PayrunWizard';
import PayrunDetail from './components/payroll/PayrunDetail';
import PayslipList from './components/payroll/PayslipList';
import PayslipDetail from './components/payroll/PayslipDetail';
import PayrollDashboard from './components/dashboard/PayrollDashboard';
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
                <Route
                  path="/timeoff/requests"
                  element={
                    <ProtectedRoute>
                      <TimeOffRequests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/timeoff/allocations"
                  element={
                    <ProtectedRoute>
                      <TimeOffAllocations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/timeoff/types"
                  element={
                    <ProtectedRoute>
                      <TimeOffTypes />
                    </ProtectedRoute>
                  }
                />

                {/* Payroll */}
                <Route path="/payroll" element={<Navigate to="/payroll/payruns" replace />} />
                <Route
                  path="/payroll/payruns"
                  element={
                    <ProtectedRoute allow={PAYROLL_ROLES}>
                      <PayrunList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payroll/payruns/new"
                  element={
                    <ProtectedRoute allow={PAYROLL_ROLES}>
                      <PayrunWizard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payroll/payruns/:id"
                  element={
                    <ProtectedRoute allow={PAYROLL_ROLES}>
                      <PayrunDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payroll/payslips"
                  element={
                    <ProtectedRoute allow={PAYSLIP_ROLES}>
                      <PayslipList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payroll/payslips/:id"
                  element={
                    <ProtectedRoute allow={PAYSLIP_ROLES}>
                      <PayslipDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payroll/structures"
                  element={
                    <ProtectedRoute allow={PAYROLL_ROLES}>
                      <SalaryStructures />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payroll/rules"
                  element={
                    <ProtectedRoute allow={PAYROLL_ROLES}>
                      <SalaryRules />
                    </ProtectedRoute>
                  }
                />

                {/* Payroll Dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allow={DASHBOARD_ROLES}>
                      <PayrollDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/employees" replace />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
