import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

type DismissFn = () => void | boolean
const modalStack: DismissFn[] = []

let navBackHandler: (() => boolean) | null = null

/**
 * Register a modal dismiss handler onto the stack.
 * Returns an unregister function.
 */
export function registerModalDismiss(fn: DismissFn): () => void {
  modalStack.push(fn)
  return () => {
    const idx = modalStack.lastIndexOf(fn)
    if (idx !== -1) {
      modalStack.splice(idx, 1)
    }
  }
}

/**
 * Attempt to dismiss the topmost open modal.
 * Returns true if a modal was closed, false otherwise.
 */
export function dismissTopModal(): boolean {
  if (modalStack.length > 0) {
    const dismiss = modalStack.pop()
    if (dismiss) {
      dismiss()
      return true
    }
  }
  return false
}

/**
 * Set a custom router / navigation back handler.
 * Should return true if back navigation was handled, false if app should exit.
 */
export function setNavBackHandler(handler: (() => boolean) | null) {
  navBackHandler = handler
}

/**
 * Hook to automatically register a modal to the back-button stack while open.
 */
export function useRegisterModal(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return
    const unregister = registerModalDismiss(onClose)
    return () => {
      unregister()
    }
  }, [isOpen, onClose])
}

let isListenerAttached = false

/**
 * Initialize Capacitor hardware back button listener on native platforms.
 */
export function initHardwareBackButton() {
  if (isListenerAttached) return
  if (!Capacitor.isNativePlatform()) return

  isListenerAttached = true

  CapApp.addListener('backButton', ({ canGoBack }) => {
    // Priority 1: Close topmost open modal
    if (dismissTopModal()) {
      return
    }

    // Priority 2 & 3: Custom navigation handling (e.g., active chat -> table list, network -> table)
    if (navBackHandler && navBackHandler()) {
      return
    }

    // Priority 4: Browser history or Exit
    if (canGoBack) {
      window.history.back()
    } else {
      CapApp.exitApp()
    }
  })
}

