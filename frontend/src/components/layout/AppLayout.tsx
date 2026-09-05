import type { ReactElement, ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb'
import { cn } from '@/lib/utils'

import LogoSvg from '@/assets/svg/logo'
import {
  IconLayoutDashboard,
  IconUsers,
  IconBuilding,
  IconShieldLock,
  IconFileDescription,
  IconClock,
  IconCalendarTime,
  IconCalendarClock,
  IconCash,
  IconChevronRight,
  IconLogout
} from '@tabler/icons-react'

import { useAuth } from '@/context/AuthContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { ROLE_LABELS, type Role } from '@/types/user'
import { initialsOf } from '@/types/employee'

const PAYROLL: Role[] = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']
const PAYSLIP: Role[] = ['EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']
/**
 * Everyone who administers HR. An employee has no HR administration access, so
 * the configuration screens — departments, working schedules and leave policy —
 * are not offered to them. Their own records still are.
 */
const HR_STAFF: Role[] = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']

const NOT_EMPLOYEE: Role[] = HR_STAFF

type MenuSubItem = { label: string; href: string; allow?: Role[] }

type MenuItem = {
  icon: ReactElement
  label: string
  allow?: Role[]
} & ({ href: string; items?: never } | { href?: never; items: MenuSubItem[] })

/** Only Admin manages users, roles and permissions. */
const ADMIN_ONLY: Role[] = ['ADMIN']

/** PRD section 2 navigation hierarchy. */
const menuItems: MenuItem[] = [
  { icon: <IconUsers className='size-4.5' />, label: 'Employees', href: '/employees' },
  { icon: <IconFileDescription className='size-4.5' />, label: 'Contracts', href: '/contracts' },
  { icon: <IconBuilding className='size-4.5' />, label: 'Departments', href: '/departments', allow: HR_STAFF },
  { icon: <IconClock className='size-4.5' />, label: 'Attendance', href: '/attendance' },
  // Not in the PRD's six-item nav tree, but Screen 5 has its own URL and would
  // otherwise be unreachable. Move it if you want the tree kept literal.
  { icon: <IconCalendarClock className='size-4.5' />, label: 'Working Schedules', href: '/schedules', allow: HR_STAFF },
  {
    icon: <IconCalendarTime className='size-4.5' />,
    label: 'Time Off',
    items: [
      { label: 'Requests', href: '/timeoff/requests' },
      { label: 'Allocations', href: '/timeoff/allocations' },
      // Leave policy is configuration, not something an employee sets.
      { label: 'Time Off Types', href: '/timeoff/types', allow: HR_STAFF }
    ]
  },
  {
    icon: <IconCash className='size-4.5' />,
    label: 'Payroll',
    allow: PAYSLIP,
    items: [
      { label: 'Payruns', href: '/payroll/payruns', allow: PAYROLL },
      { label: 'Payslips', href: '/payroll/payslips', allow: PAYSLIP },
      { label: 'Salary Structures', href: '/payroll/structures', allow: PAYROLL },
      { label: 'Salary Rules', href: '/payroll/rules', allow: PAYROLL }
    ]
  },
  {
    icon: <IconLayoutDashboard className='size-4.5' />,
    label: 'Reports',
    allow: NOT_EMPLOYEE,
    items: [{ label: 'Payroll Dashboard', href: '/dashboard', allow: NOT_EMPLOYEE }]
  },
  {
    icon: <IconShieldLock className='size-4.5' />,
    label: 'User Management',
    href: '/users',
    allow: ADMIN_ONLY
  }
]

const permitted = (role: Role | undefined, allow?: Role[]) => !allow || (!!role && allow.includes(role))

const SidebarGroupedMenuItems = ({
  data,
  groupLabel,
  role
}: {
  data: MenuItem[]
  groupLabel?: string
  role?: Role
}) => {
  const { pathname } = useLocation()

  return (
    <SidebarGroup className='px-2.5 py-1'>
      {groupLabel && (
        <SidebarGroupLabel className='px-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider select-none'>
          {groupLabel}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className='gap-0.5'>
          {data
            .filter(item => permitted(role, item.allow))
            .map(item => {
              if (item.items) {
                const subItems = item.items.filter(sub => permitted(role, sub.allow))
                if (subItems.length === 0) return null
                const isChildActive = subItems.some(
                  sub => pathname === sub.href || pathname.startsWith(`${sub.href}/`)
                )
                const groupOpen = isChildActive || subItems.some(sub => pathname.startsWith(sub.href))

                return (
                  <Collapsible className='group/collapsible' key={item.label} defaultOpen={groupOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.label}
                          className={cn(
                            'h-9 w-full justify-start gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                            isChildActive
                              ? 'text-primary font-semibold bg-primary/8 hover:bg-primary/12'
                              : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground'
                          )}
                        >
                          <span
                            className={cn(
                              'shrink-0 transition-colors',
                              isChildActive ? 'text-primary' : 'text-muted-foreground'
                            )}
                          >
                            {item.icon}
                          </span>
                          <span className='truncate'>{item.label}</span>
                          <IconChevronRight
                            className={cn(
                              'ml-auto size-4 shrink-0 transition-transform duration-200 group-data-open/collapsible:rotate-90',
                              isChildActive ? 'text-primary/70' : 'text-muted-foreground/60'
                            )}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className='ml-4.5 my-1 flex flex-col gap-0.5 border-l border-border/70 pl-3 py-0.5'>
                          {subItems.map(subItem => {
                            const isSubActive =
                              pathname === subItem.href || pathname.startsWith(`${subItem.href}/`)
                            return (
                              <SidebarMenuSubItem key={subItem.label}>
                                <SidebarMenuSubButton
                                  isActive={isSubActive}
                                  className={cn(
                                    'h-8 w-full justify-start rounded-md px-2.5 text-[13px] font-medium transition-colors',
                                    isSubActive
                                      ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/15'
                                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                  )}
                                  asChild
                                >
                                  <NavLink to={subItem.href}>
                                    <span className='truncate'>{subItem.label}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              }

              const isTopActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={isTopActive}
                    className={cn(
                      'h-9 w-full justify-start gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      isTopActive
                        ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/15'
                        : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground'
                    )}
                    asChild
                  >
                    <NavLink to={item.href}>
                      <span
                        className={cn(
                          'shrink-0 transition-colors',
                          isTopActive ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className='truncate'>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  // Live updates: another user's approval or payrun action refreshes this view.
  useRealtimeSync()

  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible='icon' className='border-r border-border bg-sidebar'>
        <SidebarHeader className='h-14 shrink-0 flex-row items-center justify-start p-0 px-4 border-b border-border'>
          <NavLink
            to='/employees'
            className='flex items-center gap-2.5 group focus:outline-hidden'
          >
            <LogoSvg className='size-8 shrink-0 transition-transform group-hover:scale-105' />
            <span className='text-lg font-bold tracking-tight text-foreground'>
              PeoplePay<span className='text-primary'>360</span>
            </span>
          </NavLink>
        </SidebarHeader>

        <SidebarContent className='py-2 overflow-y-auto'>
          <SidebarGroupedMenuItems data={menuItems} groupLabel='Core Modules' role={user?.role} />
        </SidebarContent>

        <SidebarFooter className='p-3 border-t border-border/70 [[data-state=collapsed]_&]:hidden'>
          <div className='flex items-center gap-3 rounded-xl border border-border/70 bg-sidebar-accent/30 p-2.5 transition-colors hover:bg-sidebar-accent/50'>
            <Avatar className='size-8 shrink-0'>
              <AvatarFallback className='bg-primary/10 font-bold text-xs text-primary'>
                {initialsOf(user?.name ?? 'PP')}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-xs font-semibold text-foreground'>{user?.name ?? 'Signed out'}</p>
              <p className='truncate text-[11px] font-medium text-muted-foreground'>
                {user ? ROLE_LABELS[user.role] : '—'}
              </p>
            </div>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={handleLogout}
              className='size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0'
              aria-label='Sign out'
              title='Sign out'
            >
              <IconLogout className='size-4' />
            </Button>
          </div>
        </SidebarFooter>

        {/* Draggable edge so the sidebar can be collapsed from the rail too. */}
        <SidebarRail />
      </Sidebar>

      {/* SidebarInset owns the remaining width and reflows automatically */}
      <SidebarInset className='min-w-0'>
        <header className='bg-background/95 backdrop-blur-xs sticky top-0 z-50 flex h-14 shrink-0 items-center gap-3 border-b border-border px-4'>
          <SidebarTrigger className='-ml-1 [&_svg]:size-5! hover:bg-accent rounded-lg transition-colors' />
          <AppBreadcrumb />
        </header>

        <div className='min-w-0 flex-1 p-4 sm:p-6'>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AppLayout
