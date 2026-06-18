import { isFeatureEnabled, type FeatureFlagId } from '@/config/featureFlags'
import { useFeatureFlagStore } from '@/store/featureFlagStore'

export function useFeatureFlag(id: FeatureFlagId): boolean {
  return useFeatureFlagStore((state) => isFeatureEnabled(state.flags, id))
}
