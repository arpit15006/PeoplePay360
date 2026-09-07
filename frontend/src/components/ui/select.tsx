import * as React from "react"
import { cn } from "cn"
import { Select as SelectPrimitive } from "radix-ui"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon, SearchIcon, XIcon } from "lucide-react"

interface SelectSearchContextValue {
  search: string
  searchable: boolean
  registerItem: (id: string, matches: boolean) => void
  unregisterItem: (id: string) => void
}

const SelectSearchContext = React.createContext<SelectSearchContextValue>({
  search: '',
  searchable: true,
  registerItem: () => {},
  unregisterItem: () => {},
})

function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join(' ')
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode }
    return extractText(props.children)
  }
  return ''
}

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  align = "start",
  searchable = true,
  searchPlaceholder = "Search...",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
  searchable?: boolean
  searchPlaceholder?: string
}) {
  const [search, setSearch] = React.useState('')
  const [matchedIds, setMatchedIds] = React.useState<Record<string, boolean>>({})
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const registerItem = React.useCallback((id: string, matches: boolean) => {
    setMatchedIds(prev => {
      if (prev[id] === matches) return prev
      return { ...prev, [id]: matches }
    })
  }, [])

  const unregisterItem = React.useCallback((id: string) => {
    setMatchedIds(prev => {
      if (!(id in prev)) return prev
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }, [])

  const searchContextValue = React.useMemo(() => ({
    search,
    searchable,
    registerItem,
    unregisterItem,
  }), [search, searchable, registerItem, unregisterItem])

  const totalRegistered = Object.keys(matchedIds).length
  const totalMatched = Object.values(matchedIds).filter(Boolean).length
  const hasNoMatches = searchable && search.trim().length > 0 && totalRegistered > 0 && totalMatched === 0

  React.useEffect(() => {
    if (searchable) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [searchable])

  return (
    <SelectSearchContext.Provider value={searchContextValue}>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          data-slot="select-content"
          data-align-trigger={position === "item-aligned"}
          className={cn(
            "relative z-50 max-h-(--radix-select-content-available-height) min-w-44 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className
          )}
          position={position}
          align={align}
          {...props}
        >
          {searchable && (
            <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-popover px-2.5 py-1.5 shadow-xs">
              <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Escape') {
                    return
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    const container = e.currentTarget.closest('[data-slot="select-content"]')
                    const firstItem = container?.querySelector<HTMLElement>(
                      '[data-slot="select-item"]:not(.hidden):not([data-disabled])'
                    )
                    firstItem?.focus()
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => {
                    setSearch('')
                    searchInputRef.current?.focus()
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer p-0.5 rounded-sm"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>
          )}

          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            data-position={position}
            className={cn(
              "data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)",
              position === "popper" && ""
            )}
          >
            {children}
            {hasNoMatches && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No options found
              </div>
            )}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectSearchContext.Provider>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  value,
  disabled,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  const { search, searchable, registerItem, unregisterItem } = React.useContext(SelectSearchContext)

  const textContent = React.useMemo(() => {
    return extractText(children) || String(value ?? '')
  }, [children, value])

  const matches = React.useMemo(() => {
    if (!searchable || !search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      textContent.toLowerCase().includes(q) ||
      String(value ?? '').toLowerCase().includes(q)
    )
  }, [searchable, search, textContent, value])

  React.useEffect(() => {
    if (searchable && registerItem) {
      registerItem(value, matches)
      return () => unregisterItem(value)
    }
  }, [searchable, registerItem, unregisterItem, value, matches])

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      disabled={disabled || !matches}
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        !matches && "hidden",
        className
      )}
      value={value}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="pointer-events-none size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
