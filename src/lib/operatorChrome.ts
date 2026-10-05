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

/** Match Risk Management tile type: sm desktop, xs on landscape mobile / portrait stack. */
export function operatorButtonTextClass(stacked = false): string {
  return stacked
    ? 'text-xs font-medium leading-tight'
    : 'text-sm font-medium leading-tight landscape-mobile:text-xs'
}
