import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UiVariant = 'custom' | 'shadcn'

interface UiStore {
  variant: UiVariant
  setVariant: (variant: UiVariant) => void
  toggleVariant: () => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      variant: 'custom',
      setVariant: (variant) => set({ variant }),
      toggleVariant: () =>
        set({
          variant: get().variant === 'custom' ? 'shadcn' : 'custom',
        }),
    }),
    { name: 'ncaaf-ui-variant' },
  ),
)
