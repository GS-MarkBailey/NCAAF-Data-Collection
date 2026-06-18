import type { ReactNode } from 'react'
import type { FeatureFlagId } from '@/config/featureFlags'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'

interface FeatureGateProps {
  flag: FeatureFlagId
  children: ReactNode
  fallback?: ReactNode
}

export function FeatureGate({
  flag,
  children,
  fallback = null,
}: FeatureGateProps) {
  const enabled = useFeatureFlag(flag)
  return enabled ? children : fallback
}
