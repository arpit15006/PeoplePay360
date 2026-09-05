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
import { Separator } from '@/components/ui/separator'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb'

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
  { icon: <IconUsers />, label: 'Employees', href: '/employees' },
  { icon: <IconFileDescription />, label: 'Contracts', href: '/contracts' },
  { icon: <IconBuilding />, label: 'Departments', href: '/departments', allow: HR_STAFF },
  { icon: <IconClock />, label: 'Attendance', href: '/attendance' },
  // Not in the PRD's six-item nav tree, but Screen 5 has its own URL and would
  // otherwise be unreachable. Move it if you want the tree kept literal.
  { icon: <IconCalendarClock />, label: 'Working Schedules', href: '/schedules', allow: HR_STAFF },
  {
    icon: <IconCalendarTime />,
    label: 'Time Off',
    items: [
      { label: 'Requests', href: '/timeoff/requests' },
      { label: 'Allocations', href: '/timeoff/allocations' },
      // Leave policy is configuration, not something an employee sets.
      { label: 'Time Off Types', href: '/timeoff/types', allow: HR_STAFF }
    ]
  },
  {
    icon: <IconCash />,
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
    // The spec's navigation calls this group Reports; the screen inside it is
    // the Payroll Dashboard the same spec describes under B9.
    icon: <IconLayoutDashboard />,
    label: 'Reports',
    allow: NOT_EMPLOYEE,
    items: [{ label: 'Payroll Dashboard', href: '/dashboard', allow: NOT_EMPLOYEE }]
  },
  {
    icon: <IconShieldLock />,
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
    <SidebarGroup className='pr-4 pl-0'>
      {groupLabel && <SidebarGroupLabel className='px-4'>{groupLabel}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {data
            .filter(item => permitted(role, item.allow))
            .map(item => {
              if (item.items) {
                const subItems = item.items.filter(sub => permitted(role, sub.allow))
                if (subItems.length === 0) return null
                const groupOpen = subItems.some(sub => pathname.startsWith(sub.href))

                return (
                  <Collapsible className='group/collapsible' key={item.label} defaultOpen={groupOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.label}
                          className='rounded-l-0 rounded-r-full pr-2 pl-4 group-data-[collapsible=icon]:w-10! group-data-[collapsible=icon]:pl-4!'
                        >
                          {item.icon}
                          <span>{item.label}</span>
                          <IconChevronRight className='ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90' />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className='ml-5.5'>
                          {subItems.map(subItem => (
                            <SidebarMenuSubItem key={subItem.label}>
                              <SidebarMenuSubButton
                                className='justify-between'
                                isActive={pathname.startsWith(subItem.href)}
                                asChild
                              >
                                <NavLink to={subItem.href}>{subItem.label}</NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              }

              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    className='rounded-l-0 rounded-r-full pr-2 pl-4 group-data-[collapsible=icon]:w-10! group-data-[collapsible=icon]:pl-4!'
                    asChild
                  >
                    <NavLink to={item.href}>
                      {item.icon}
                      <span>{item.label}</span>
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
      <Sidebar collapsible='icon'>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size='lg' className='gap-2.5 bg-transparent! [&>svg]:size-8' asChild>
                  <NavLink to='/employees'>
                    <LogoSvg className='[&_rect]:fill-sidebar [&_rect:first-child]:fill-primary' />
                    <span className='text-xl font-semibold'>PeoplePay360</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroupedMenuItems data={menuItems} groupLabel='Core Modules' role={user?.role} />
          </SidebarContent>

          <SidebarFooter className='[[data-state=collapsed]_&]:hidden'>
            <div className='flex items-center gap-3 rounded-md border p-3'>
              <Avatar>
                <AvatarFallback>{initialsOf(user?.name ?? 'PP')}</AvatarFallback>
              </Avatar>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{user?.name ?? 'Signed out'}</p>
                <p className='text-muted-foreground truncate text-xs'>
                  {user ? ROLE_LABELS[user.role] : '—'}
                </p>
              </div>
              <Button
                variant='ghost'
                size='icon-sm'
                onClick={handleLogout}
                aria-label='Sign out'
                title='Sign out'
              >
                <IconLogout />
              </Button>
            </div>
        </SidebarFooter>

        {/* Draggable edge so the sidebar can be collapsed from the rail too. */}
        <SidebarRail />
      </Sidebar>

      {/* SidebarInset is the peer of <Sidebar>; it owns the remaining width and
          reflows automatically when the sidebar collapses to icons. Do not wrap
          it in an extra flex div or constrain it with mx-auto/max-w — that is
          what produced the dead space around the content when collapsed. */}
      <SidebarInset className='min-w-0'>
        <header className='bg-background sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b px-4'>
          <SidebarTrigger className='-ml-1 [&_svg]:size-5!' />
          <Separator orientation='vertical' className='mr-1 data-[orientation=vertical]:h-4' />
          <AppBreadcrumb />
        </header>

        <div className='min-w-0 flex-1 p-4 sm:p-6'>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AppLayout
