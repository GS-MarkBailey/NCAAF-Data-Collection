import { create } from 'zustand'

export const DEFAULT_ERROR_TOAST_MESSAGE =
  'Something went wrong. Please try again.'

export const DEFAULT_SUCCESS_TOAST_MESSAGE = 'Fixtures refreshed'

export type ToastVariant = 'error' | 'success'

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  error: 10_000,
  success: 4_000,
}

interface ErrorToastStore {
  visible: boolean
  exiting: boolean
  message: string
  variant: ToastVariant
  show: (message?: string, variant?: ToastVariant) => void
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
  variant: 'error',

  show: (message, variant = 'error') => {
    clearDismissTimer()
    set({
      visible: true,
      exiting: false,
      variant,
      message:
        message ??
        (variant === 'success'
          ? DEFAULT_SUCCESS_TOAST_MESSAGE
          : DEFAULT_ERROR_TOAST_MESSAGE),
    })

    dismissTimer = window.setTimeout(() => {
      get().dismiss()
    }, AUTO_DISMISS_MS[variant])
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
  useErrorToastStore.getState().show(message, 'error')
}

export function showSuccessToast(message?: string) {
  useErrorToastStore.getState().show(message, 'success')
}
