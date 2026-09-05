import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import EmployeesDashboard from './components/employees/EmployeesDashboard';
import ComingSoonPlaceholder from './components/common/ComingSoonPlaceholder';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        {/* Root & Employees Dashboard */}
        <Route path="/" element={<Navigate to="/employees" replace />} />
        <Route path="/employees" element={<EmployeesDashboard />} />

        {/* Other Planned Routes - Minimal Coming Soon Placeholders */}
        <Route
          path="/employees/new"
          element={<ComingSoonPlaceholder pageName="New Employee" routePath="/employees/new" />}
        />
        <Route
          path="/employees/:id"
          element={<ComingSoonPlaceholder pageName="Employee Details" routePath="/employees/[id]" />}
        />
        <Route
          path="/contracts"
          element={<ComingSoonPlaceholder pageName="Contracts" routePath="/contracts" />}
        />
        <Route
          path="/attendance"
          element={<ComingSoonPlaceholder pageName="Attendance" routePath="/attendance" />}
        />
        <Route
          path="/time-off"
          element={<ComingSoonPlaceholder pageName="Time Off" routePath="/time-off" />}
        />
        <Route
          path="/time-off/requests"
          element={<ComingSoonPlaceholder pageName="Time Off Requests" routePath="/time-off/requests" />}
        />
        <Route
          path="/time-off/allocations"
          element={<ComingSoonPlaceholder pageName="Time Off Allocations" routePath="/time-off/allocations" />}
        />
        <Route
          path="/time-off/types"
          element={<ComingSoonPlaceholder pageName="Time Off Types" routePath="/time-off/types" />}
        />
        <Route
          path="/payroll"
          element={<ComingSoonPlaceholder pageName="Payroll" routePath="/payroll" />}
        />
        <Route
          path="/payroll/payruns"
          element={<ComingSoonPlaceholder pageName="Payruns" routePath="/payroll/payruns" />}
        />
        <Route
          path="/payroll/payslips"
          element={<ComingSoonPlaceholder pageName="Payslips" routePath="/payroll/payslips" />}
        />
        <Route
          path="/payroll/salary-structures"
          element={<ComingSoonPlaceholder pageName="Salary Structures" routePath="/payroll/salary-structures" />}
        />
        <Route
          path="/payroll/salary-rules"
          element={<ComingSoonPlaceholder pageName="Salary Rules" routePath="/payroll/salary-rules" />}
        />
        <Route
          path="/dashboard"
          element={<ComingSoonPlaceholder pageName="Dashboard" routePath="/dashboard" />}
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Routes>
    </AppLayout>
  );
}
