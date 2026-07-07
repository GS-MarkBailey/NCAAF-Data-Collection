import { useEffect } from 'react'
import { showErrorToast, useErrorToastStore } from '@/store/errorToastStore'

const ERROR_TOAST_INTERVAL_MS = 30_000

function isSnapshotCaptureWithoutDemoToast() {
  const params = new URLSearchParams(window.location.search)
  return params.get('snapshot') === '1' && params.get('demoErrorToast') !== '1'
}

export function useFixtureErrorToast(
  fixtureId: string | undefined,
  homeAttacksRight: boolean | null | undefined,
) {
  useEffect(() => {
    if (isSnapshotCaptureWithoutDemoToast()) {
      return
    }

    if (!fixtureId || homeAttacksRight === null || homeAttacksRight === undefined) {
      return
    }

    showErrorToast()

    const intervalId = window.setInterval(() => {
      showErrorToast()
    }, ERROR_TOAST_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
      const { visible, dismiss } = useErrorToastStore.getState()
      if (visible) dismiss()
    }
  }, [fixtureId, homeAttacksRight])
}
