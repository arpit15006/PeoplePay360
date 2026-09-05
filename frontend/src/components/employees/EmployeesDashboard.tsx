import { useState } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  Mail,
  Building2,
  Info,
  Users,
  CheckCircle2,
} from 'lucide-react';
import '../../styles/saas-dashboard.css';

interface Employee {
  id: string;
  initials: string;
  name: string;
  role: string;
  department: string;
  status: 'Active' | 'On Leave';
  email: string;
  code: string;
  avatarClass: string;
  type: string;
}

const EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    initials: 'AM',
    name: 'Aarav Mehta',
    role: 'Payroll Specialist',
    department: 'Finance',
    status: 'Active',
    email: 'aarav.mehta@peoplepay.com',
    code: 'EMP-1042',
    avatarClass: 'saas-avatar-blue',
    type: 'Full-time • Remote',
  },
  {
    id: 'emp-2',
    initials: 'SK',
    name: 'Sara Khan',
    role: 'HR Officer',
    department: 'HR',
    status: 'Active',
    email: 'sara.khan@peoplepay.com',
    code: 'EMP-1043',
    avatarClass: 'saas-avatar-purple',
    type: 'Full-time • On-site',
  },
  {
    id: 'emp-3',
    initials: 'JD',
    name: 'John Dsouza',
    role: 'Developer',
    department: 'Engineering',
    status: 'Active',
    email: 'john.dsouza@peoplepay.com',
    code: 'EMP-1044',
    avatarClass: 'saas-avatar-emerald',
    type: 'Full-time • Hybrid',
  },
  {
    id: 'emp-4',
    initials: 'NP',
    name: 'Neha Patel',
    role: 'Recruiter',
    department: 'HR',
    status: 'Active',
    email: 'neha.patel@peoplepay.com',
    code: 'EMP-1045',
    avatarClass: 'saas-avatar-amber',
    type: 'Full-time • On-site',
  },
];

export function EmployeesDashboard() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  return (
    <div className="saas-employees-page">
      {/* Page Header */}
      <div className="saas-page-header">
        <div className="saas-page-title-group">
          <h1 className="saas-page-title">Employees</h1>
          <p className="saas-page-subtitle">
            Manage your organization's employees and their employment information.
          </p>
        </div>

        <button type="button" className="saas-btn saas-btn-primary saas-btn-md">
          <Plus size={16} />
          <span>New Employee</span>
        </button>
      </div>

      {/* Stats Overview Strip */}
      <div className="saas-stats-strip">
        <div className="saas-stat-chip">
          <Users size={14} color="#64748b" />
          <span className="saas-stat-chip-label">Total Staff:</span>
          <span className="saas-stat-chip-value">4 Employees</span>
        </div>
        <div className="saas-stat-chip">
          <CheckCircle2 size={14} color="#10b981" />
          <span className="saas-stat-chip-label">Status:</span>
          <span className="saas-stat-chip-value">4 Active</span>
        </div>
        <div className="saas-stat-chip">
          <Building2 size={14} color="#64748b" />
          <span className="saas-stat-chip-label">Departments:</span>
          <span className="saas-stat-chip-value">3 Active</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="saas-toolbar">
        <div className="saas-toolbar-left">
          {/* Search Bar */}
          <div className="saas-search-box">
            <Search className="saas-search-icon" />
            <input
              type="text"
              className="saas-search-input"
              placeholder="Search employees..."
              readOnly
            />
          </div>

          {/* Department Filter */}
          <select className="saas-select-dropdown" defaultValue="all" aria-label="Filter by department">
            <option value="all">All Departments</option>
            <option value="finance">Finance</option>
            <option value="hr">HR</option>
            <option value="engineering">Engineering</option>
          </select>

          {/* Status Filter */}
          <select className="saas-select-dropdown" defaultValue="all" aria-label="Filter by status">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on-leave">On Leave</option>
          </select>

          {/* Sort Option */}
          <select className="saas-select-dropdown" defaultValue="name" aria-label="Sort employees">
            <option value="name">Sort by: Name (A–Z)</option>
            <option value="department">Sort by: Department</option>
            <option value="recent">Sort by: Recently Added</option>
          </select>
        </div>

        {/* View Switcher (Kanban / List) */}
        <div className="saas-toolbar-right">
          <div className="saas-view-switcher">
            <button
              type="button"
              className={`saas-view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid size={15} />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              className={`saas-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={15} />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Employee Cards Grid (Responsive: 2-3 Desktop, 2 Tablet, 1 Mobile) */}
      <div className="saas-employees-grid">
        {EMPLOYEES.map((employee) => (
          <div key={employee.id} className="saas-card">
            <div className="saas-card-body">
              {/* Card Header Row */}
              <div className="saas-card-header-row">
                <div className="saas-card-identity">
                  <div className={`saas-avatar ${employee.avatarClass}`}>
                    {employee.initials}
                  </div>
                  <div className="saas-card-names">
                    <h3 className="saas-card-name">{employee.name}</h3>
                    <span className="saas-card-role">{employee.role}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="saas-card-menu-btn"
                  title="Employee Actions"
                  aria-label={`Actions for ${employee.name}`}
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Department & Status Badges */}
              <div className="saas-card-tags-row">
                <span className="saas-badge saas-badge-secondary">
                  {employee.department}
                </span>

                <span className="saas-badge saas-badge-success">
                  <span className="saas-badge-dot"></span>
                  <span>{employee.status}</span>
                </span>
              </div>

              {/* Secondary Information */}
              <div className="saas-card-meta">
                <div className="saas-card-meta-item">
                  <Mail size={14} />
                  <span>{employee.email}</span>
                </div>
                <div className="saas-card-meta-item">
                  <Building2 size={14} />
                  <span>{employee.code} • {employee.type}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Information Callout */}
      <div className="saas-info-callout">
        <Info className="saas-info-icon" />
        <div>
          <strong>Kanban Directory View:</strong> Click on an employee card to open the complete employee profile and management record.
        </div>
      </div>
    </div>
  );
}

export default EmployeesDashboard;
