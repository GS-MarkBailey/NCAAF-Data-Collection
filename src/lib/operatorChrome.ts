import { cn } from '@/lib/utils'

/**
 * Shared operator-console tile surfaces so Risk, Play controls, and other
 * action buttons use the same grey (not card/background blue-grey).
 */
export const OPERATOR_SECONDARY_SURFACE = cn(
  'border-border bg-secondary text-secondary-foreground',
  'hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]',
)

export const OPERATOR_PRIMARY_SURFACE = cn(
  'border-transparent bg-[var(--color-brand)] text-white',
  'hover:bg-[var(--color-brand-hover)]',
)

/** Shared shell for Scoreboard / Play controls / Risk / Play-by-play cards. */
export const CONSOLE_PANEL_CARD_CLASS = cn(
  'flex min-h-0 flex-1 flex-col border border-border bg-card shadow-sm ring-0',
)

export const CONSOLE_PANEL_HEADER_CLASS = cn(
  'min-h-10 items-center border-b border-border py-0',
)

export const CONSOLE_PANEL_TITLE_CLASS = cn(
  'flex items-center gap-2 text-sm font-semibold leading-none',
)

/** Match Risk Management tile type: sm desktop, xs on landscape mobile / portrait stack. */
export function operatorButtonTextClass(stacked = false): string {
  return stacked
    ? 'text-xs font-medium leading-tight'
    : 'text-sm font-medium leading-tight landscape-mobile:text-xs'
}
