import { useState, useEffect } from 'react';
import { socket } from './socket';
import {
  Users,
  FileText,
  Clock,
  Calendar,
  DollarSign,
  PieChart,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';

export type Role = 'EMPLOYEE' | 'HR_MANAGER' | 'HR_PAYROLL_USER' | 'HR_PAYROLL_MANAGER' | 'ADMIN';

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role>('ADMIN');
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [wsConnected, setWsConnected] = useState<boolean>(socket.connected);

  useEffect(() => {
    function onConnect() {
      setWsConnected(true);
    }
    function onDisconnect() {
      setWsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const roles: { label: string; role: Role }[] = [
    { label: 'Employee', role: 'EMPLOYEE' },
    { label: 'HR Manager', role: 'HR_MANAGER' },
    { label: 'HR Payroll User', role: 'HR_PAYROLL_USER' },
    { label: 'HR Payroll Manager', role: 'HR_PAYROLL_MANAGER' },
    { label: 'Admin', role: 'ADMIN' },
  ];

  return (
    <div className="app-container">
      {/* Sidebar Navigation - Strictly Following PRD Section 2 */}
      <aside style={{
        width: '280px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}>
        {/* Brand */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'var(--primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
          }}>
            P
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              PEOPLEPAY<span style={{ color: 'var(--primary)' }}>360</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              HR & PAYROLL PLATFORM
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ padding: '1rem 0.75rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button
            onClick={() => setActiveModule('dashboard')}
            className={`smart-btn ${activeModule === 'dashboard' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: activeModule === 'dashboard' ? 'var(--primary-light)' : 'transparent', color: activeModule === 'dashboard' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <PieChart size={18} />
            <span>Payroll Dashboard</span>
          </button>

          <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0.75rem 0.75rem 0.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            HR Modules
          </div>

          <button
            onClick={() => setActiveModule('employees')}
            className={`smart-btn ${activeModule === 'employees' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: activeModule === 'employees' ? 'var(--primary-light)' : 'transparent', color: activeModule === 'employees' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <Users size={18} />
            <span>Employees</span>
          </button>

          <button
            onClick={() => setActiveModule('contracts')}
            className={`smart-btn ${activeModule === 'contracts' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: activeModule === 'contracts' ? 'var(--primary-light)' : 'transparent', color: activeModule === 'contracts' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <FileText size={18} />
            <span>Contracts</span>
          </button>

          <button
            onClick={() => setActiveModule('schedules')}
            className={`smart-btn ${activeModule === 'schedules' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: activeModule === 'schedules' ? 'var(--primary-light)' : 'transparent', color: activeModule === 'schedules' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <Clock size={18} />
            <span>Working Schedules</span>
          </button>

          <button
            onClick={() => setActiveModule('attendance')}
            className={`smart-btn ${activeModule === 'attendance' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: activeModule === 'attendance' ? 'var(--primary-light)' : 'transparent', color: activeModule === 'attendance' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <Clock size={18} />
            <span>Attendance</span>
          </button>

          <button
            onClick={() => setActiveModule('timeoff')}
            className={`smart-btn ${activeModule === 'timeoff' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: activeModule === 'timeoff' ? 'var(--primary-light)' : 'transparent', color: activeModule === 'timeoff' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <Calendar size={18} />
            <span>Time Off</span>
          </button>

          <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0.75rem 0.75rem 0.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            Payroll Operations
          </div>

          <button
            onClick={() => setActiveModule('payruns')}
            className={`smart-btn ${activeModule === 'payruns' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: activeModule === 'payruns' ? 'var(--primary-light)' : 'transparent', color: activeModule === 'payruns' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <DollarSign size={18} />
            <span>Payruns</span>
          </button>

          <button
            onClick={() => setActiveModule('payslips')}
            className={`smart-btn ${activeModule === 'payslips' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: activeModule === 'payslips' ? 'var(--primary-light)' : 'transparent', color: activeModule === 'payslips' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <FileText size={18} />
            <span>Payslips</span>
          </button>

          <button
            onClick={() => setActiveModule('structures')}
            className={`smart-btn ${activeModule === 'structures' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: activeModule === 'structures' ? 'var(--primary-light)' : 'transparent', color: activeModule === 'structures' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <Building size={18} />
            <span>Salary Structures</span>
          </button>

          <button
            onClick={() => setActiveModule('rules')}
            className={`smart-btn ${activeModule === 'rules' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: activeModule === 'rules' ? 'var(--primary-light)' : 'transparent', color: activeModule === 'rules' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            <ShieldCheck size={18} />
            <span>Salary Rules</span>
          </button>
        </nav>

        {/* Live Status indicator */}
        <div style={{
          padding: '0.875rem 1.25rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Realtime Socket:</span>
          <span className={`badge ${wsConnected ? 'badge-success' : 'badge-warning'}`}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: wsConnected ? 'var(--success)' : 'var(--warning)',
              display: 'inline-block'
            }}></span>
            {wsConnected ? 'Connected' : 'Connecting'}
          </span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header with Role Switcher */}
        <header style={{
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <span>PEOPLEPAY360</span>
            <ChevronRight size={14} />
            <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)', fontWeight: 600 }}>{activeModule}</span>
          </div>

          {/* Persona Switcher for Hackathon Judges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Judge Demo Persona:
            </span>
            <div className="role-switcher-bar">
              {roles.map((r) => (
                <button
                  key={r.role}
                  className={`role-pill ${currentRole === r.role ? 'active' : ''}`}
                  onClick={() => setCurrentRole(r.role)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Page Body View Placeholder */}
        <main className="page-body">
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title" style={{ textTransform: 'capitalize' }}>{activeModule}</h1>
              <p>PeoplePay360 Integrated HR & Payroll Engine</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: '1rem' }}>Project Initialized</h3>
              <span className="badge badge-info">Step 0: Setup Complete</span>
            </div>
            <div className="card-body">
              <p style={{ marginBottom: '1rem' }}>
                The workspace is configured with clean separation between <strong>frontend/</strong> (Vite + React + TS) and <strong>backend/</strong> (Express + Prisma + Neon PostgreSQL + WebSockets).
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', flex: 1 }}>
                  <strong>Current Active Role:</strong> {currentRole}
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', flex: 1 }}>
                  <strong>WebSocket Status:</strong> {wsConnected ? 'Active' : 'Standby'}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
