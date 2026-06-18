import { create } from 'zustand'
import {
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlagId,
  isFeatureEnabled,
} from '@/config/featureFlags'

const STORAGE_KEY = 'ncaaf-feature-flags'

type FeatureFlagState = Record<FeatureFlagId, boolean>

interface FeatureFlagStore {
  flags: FeatureFlagState
  setFlag: (id: FeatureFlagId, enabled: boolean) => void
  resetFlags: () => void
  isEnabled: (id: FeatureFlagId) => boolean
}

function loadFlags(): FeatureFlagState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_FEATURE_FLAGS }

    const parsed = JSON.parse(raw) as Partial<FeatureFlagState>
    return { ...DEFAULT_FEATURE_FLAGS, ...parsed }
  } catch {
    return { ...DEFAULT_FEATURE_FLAGS }
  }
}

function persistFlags(flags: FeatureFlagState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
}

export const useFeatureFlagStore = create<FeatureFlagStore>((set, get) => ({
  flags: loadFlags(),

  setFlag: (id, enabled) => {
    set((state) => {
      const flags = { ...state.flags, [id]: enabled }
      persistFlags(flags)
      return { flags }
    })
  },

  resetFlags: () => {
    const flags = { ...DEFAULT_FEATURE_FLAGS }
    persistFlags(flags)
    set({ flags })
  },

  isEnabled: (id) => isFeatureEnabled(get().flags, id),
}))
