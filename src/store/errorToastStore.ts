import { create } from 'zustand'

export const DEFAULT_ERROR_TOAST_MESSAGE =
  'Something went wrong. Please try again.'

const AUTO_DISMISS_MS = 3000

interface ErrorToastStore {
  visible: boolean
  exiting: boolean
  message: string
  show: (message?: string) => void
  dismiss: () => void
  finishExit: () => void
}

let dismissTimer: number | undefined

function clearDismissTimer() {
  if (dismissTimer !== undefined) {
    window.clearTimeout(dismissTimer)
    dismissTimer = undefined
  }
}

export const useErrorToastStore = create<ErrorToastStore>((set, get) => ({
  visible: false,
  exiting: false,
  message: DEFAULT_ERROR_TOAST_MESSAGE,

  show: (message = DEFAULT_ERROR_TOAST_MESSAGE) => {
    clearDismissTimer()
    set({ visible: true, exiting: false, message })

    dismissTimer = window.setTimeout(() => {
      get().dismiss()
    }, AUTO_DISMISS_MS)
  },

  dismiss: () => {
    const { visible, exiting } = get()
    if (!visible || exiting) return

    clearDismissTimer()
    set({ exiting: true })
  },

  finishExit: () => {
    set({ visible: false, exiting: false })
  },
}))

export function showErrorToast(message?: string) {
  useErrorToastStore.getState().show(message)
}
