import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Calendar,
  DollarSign,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import '../../styles/saas-dashboard.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Contracts', path: '/contracts', icon: FileText },
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'Time Off', path: '/time-off', icon: Calendar },
    { name: 'Payroll', path: '/payroll', icon: DollarSign },
  ];

  // Get current active route name for breadcrumb
  const currentNav = navItems.find((item) =>
    item.path === '/'
      ? location.pathname === '/' || location.pathname === '/employees'
      : location.pathname.startsWith(item.path)
  );
  const currentTitle = currentNav ? currentNav.name : 'HR Operations';

  return (
    <div className="saas-layout">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="saas-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Modern SaaS Sidebar */}
      <aside className={`saas-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="saas-sidebar-brand">
          <div className="saas-brand-logo">
            P
          </div>
          <div className="saas-brand-text">
            <span className="saas-brand-name">
              PEOPLEPAY<span>360</span>
            </span>
            <span className="saas-brand-tagline">HR & PAYROLL SUITE</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="saas-sidebar-nav">
          <div className="saas-nav-section-title">Core Modules</div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/employees' && location.pathname === '/');

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`saas-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="saas-nav-icon" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User / Profile Section at Bottom */}
        <div className="saas-sidebar-footer">
          <div className="saas-user-profile">
            <div className="saas-user-avatar">
              AM
            </div>
            <div className="saas-user-info">
              <span className="saas-user-name">Alex Morgan</span>
              <span className="saas-user-role">HR Administrator</span>
            </div>
          </div>
          <span title="Administrator Role Verified">
            <ShieldCheck size={16} color="#2563eb" />
          </span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="saas-main">
        {/* Top Header Bar */}
        <header className="saas-top-bar">
          <div className="saas-top-bar-left">
            <button
              type="button"
              className="saas-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="saas-breadcrumb">
              <Building2 size={15} color="#94a3b8" />
              <span>PeoplePay360</span>
              <ChevronRight size={13} className="saas-breadcrumb-separator" />
              <span>HR Management</span>
              <ChevronRight size={13} className="saas-breadcrumb-separator" />
              <span className="saas-breadcrumb-current">{currentTitle}</span>
            </div>
          </div>

          <div className="saas-top-bar-right">
            <div className="saas-status-pill">
              <span className="saas-status-dot-green"></span>
              <span>Enterprise Ready</span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="saas-page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
