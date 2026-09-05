import type { ReactElement } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'

import LogoSvg from '@/assets/svg/logo'
import { IconLayoutDashboard, IconPackage, IconSquarePercentage, IconLayout, IconUsers, IconListDetails, IconSettings, IconHelp, IconListCheck, IconReceipt, IconStar, IconChevronRight, IconPizza, IconDotsVertical } from '@tabler/icons-react'

type MenuSubItem = {
  label: string
  href: string
  badge?: string
}

type MenuItem = {
  icon: ReactElement
  label: string
} & (
  | {
      href: string
      badge?: string
      items?: never
    }
  | { href?: never; badge?: never; items: MenuSubItem[] }
)

const menuItems: MenuItem[] = [
  {
    icon: (
      <IconLayoutDashboard />
    ),
    label: 'Dashboard',
    href: '#'
  },
  {
    icon: (
      <IconPackage />
    ),
    label: 'New Order',
    href: '#'
  },
  {
    icon: (
      <IconPackage />
    ),
    label: 'Inventory',
    href: '#'
  },
  {
    icon: (
      <IconSquarePercentage />
    ),
    label: 'Discount',
    href: '#',
    badge: '2'
  },
  {
    icon: (
      <IconLayout />
    ),
    label: 'Ordering Table',
    href: '#'
  },
  {
    icon: (
      <IconUsers />
    ),
    label: 'Customers',
    items: [
      { label: 'Customer List', href: '#' },
      { label: 'Customer Groups', href: '#' }
    ]
  },
  {
    icon: (
      <IconListDetails />
    ),
    label: 'Order List',
    href: '#'
  },
  {
    icon: (
      <IconSettings />
    ),
    label: 'Staff Management',
    href: '#'
  }
]

const usefulPagesItems: MenuItem[] = [
  {
    icon: (
      <IconHelp />
    ),
    label: 'Help Center',
    href: '#'
  },
  {
    icon: (
      <IconListCheck />
    ),
    label: 'Products',
    items: [
      { label: 'All Products', href: '#' },
      { label: 'Categories', href: '#', badge: '6' },
      { label: 'Add Product', href: '#' }
    ]
  },
  {
    icon: (
      <IconUsers />
    ),
    label: 'Customer Management',
    href: '#'
  },
  {
    icon: (
      <IconReceipt />
    ),
    label: 'Billing & Payment',
    href: '#'
  },
  {
    icon: (
      <IconStar />
    ),
    label: 'Feedback & Reviews',
    href: '#'
  }
]

const SidebarGroupedMenuItems = ({ data, groupLabel }: { data: MenuItem[]; groupLabel?: string }) => {
  return (
    <SidebarGroup className='pr-4 pl-0'>
      {groupLabel && <SidebarGroupLabel className='px-4'>{groupLabel}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {data.map(item =>
            item.items ? (
              <Collapsible className='group/collapsible' key={item.label}>
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
                      {item.items.map(subItem => (
                        <SidebarMenuSubItem key={subItem.label}>
                          <SidebarMenuSubButton className='justify-between' asChild>
                            <a href={subItem.href}>
                              {subItem.label}
                              {subItem.badge && (
                                <span className='bg-primary/10 flex h-5 min-w-5 items-center justify-center rounded-full text-xs'>
                                  {subItem.badge}
                                </span>
                              )}
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  tooltip={item.label}
                  className='rounded-l-0 rounded-r-full pr-2 pl-4 group-data-[collapsible=icon]:w-10! group-data-[collapsible=icon]:pl-4!'
                  asChild
                >
                  <a href={item.href}>
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
                {item.badge && (
                  <SidebarMenuBadge className='bg-primary/10 top-1/2! right-2 -translate-y-1/2! rounded-full'>
                    {item.badge}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

const SidebarPage = () => {
  return (
    <div className='flex min-h-dvh w-full'>
      <SidebarProvider>
        <Sidebar collapsible='icon'>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size='lg' className='gap-2.5 bg-transparent! [&>svg]:size-8' asChild>
                  <a href='#'>
                    <LogoSvg className='size-8' />
                    <span className='text-xl font-semibold'>Food Point</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroupedMenuItems data={menuItems} />
            <SidebarGroupedMenuItems data={usefulPagesItems} groupLabel='Useful Pages' />
          </SidebarContent>
          <SidebarFooter className='[[data-state=collapsed]_&]:hidden'>
            <div className='relative flex flex-col gap-4 overflow-hidden rounded-md border p-4'>
              <svg
                width='157'
                height='136'
                viewBox='0 0 157 136'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                className='absolute top-0 left-0 blur-xl'
              >
                <g opacity='0.5' filter='url(#filter0_f_16461_129124)'>
                  <circle cx='56.5' cy='41' r='60' fill='var(--primary)' fillOpacity='0.4' />
                </g>
                <defs>
                  <filter
                    id='filter0_f_16461_129124'
                    x='-43.5'
                    y='-59'
                    width='200'
                    height='200'
                    filterUnits='userSpaceOnUse'
                    colorInterpolationFilters='sRGB'
                  >
                    <feFlood floodOpacity='0' result='BackgroundImageFix' />
                    <feBlend mode='normal' in='SourceGraphic' in2='BackgroundImageFix' result='shape' />
                    <feGaussianBlur stdDeviation='20' result='effect1_foregroundBlur_16461_129124' />
                  </filter>
                </defs>
              </svg>
              <div className='z-1 flex justify-between gap-4'>
                <Avatar className='rounded-sm shadow-lg after:border-0'>
                  <AvatarFallback className='bg-sidebar text-foreground rounded-sm'>
                    <IconPizza className='size-4' />
                  </AvatarFallback>
                </Avatar>
                <IconDotsVertical />
              </div>
              <div className='z-1 flex items-center justify-between gap-4'>
                <div className='whitespace-nowrap'>
                  <p className='mb-2 text-sm'>Today&apos;s order</p>
                  <p className='text-xl font-semibold'>234</p>
                </div>
                <div className='*:data-[slot=avatar]:ring-background flex -space-x-4 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale'>
                  <Avatar>
                    <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png' alt='John Doe' />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png' alt='Fanny Hansen' />
                    <AvatarFallback>FH</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png' alt='Todd Payne' />
                    <AvatarFallback>TP</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarImage
                      src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png'
                      alt='Cecilia Manning'
                    />
                    <AvatarFallback>CM</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className='flex flex-1 flex-col'>
          <header className='bg-card sticky top-0 z-50 h-13.75 border-b'>
            <div className='mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6'>
              <SidebarTrigger className='[&_svg]:size-5!' />
            </div>
          </header>
          <main className='mx-auto size-full max-w-7xl flex-1 px-4 py-6 sm:px-6'>
            <Card className='h-250 shadow-none'>
              <CardContent className='h-full'>
                <div className='border-card-foreground/10 h-full rounded-md border bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--card-foreground)10%,transparent),color-mix(in_oklab,var(--card-foreground)10%,transparent)_1px,var(--card)_2px,var(--card)_15px)]' />
              </CardContent>
            </Card>
          </main>
          <footer className='bg-card h-10 border-t'>
            <div className='mx-auto size-full max-w-7xl px-4 sm:px-6'>
              <div className='border-card-foreground/10 h-full bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--card-foreground)10%,transparent),color-mix(in_oklab,var(--card-foreground)10%,transparent)_1px,var(--card)_2px,var(--card)_15px)]' />
            </div>
          </footer>
        </div>
      </SidebarProvider>
    </div>
  )
}

export default SidebarPage
