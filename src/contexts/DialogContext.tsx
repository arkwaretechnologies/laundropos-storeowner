'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type DialogVariant = 'success' | 'error' | 'warning' | 'info'

interface AlertOptions {
  title?: string
  message: string
  variant?: DialogVariant
  buttonText?: string
}

interface ConfirmOptions {
  title?: string
  message: string
  variant?: DialogVariant
  confirmText?: string
  cancelText?: string
}

interface DialogState {
  type: 'alert' | 'confirm'
  title: string
  message: string
  variant: DialogVariant
  confirmText: string
  cancelText: string
}

interface DialogContextValue {
  showAlert: (messageOrOptions: string | AlertOptions) => Promise<void>
  showConfirm: (messageOrOptions: string | ConfirmOptions) => Promise<boolean>
}

// ─── Context ─────────────────────────────────────────────────────────────────

const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return ctx
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const variantConfig: Record<
  DialogVariant,
  { icon: React.ReactNode; color: string; bgColor: string; borderColor: string; buttonColor: string }
> = {
  success: {
    icon: <CheckCircle className="w-7 h-7" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    buttonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
  },
  error: {
    icon: <XCircle className="w-7 h-7" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-7 h-7" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    buttonColor: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  },
  info: {
    icon: <Info className="w-7 h-7" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
}

function inferVariant(message: string): DialogVariant {
  const lower = message.toLowerCase()
  if (lower.includes('success') || lower.includes('created') || lower.includes('updated') || lower.includes('deleted')) return 'success'
  if (lower.includes('fail') || lower.includes('error')) return 'error'
  if (lower.includes('cannot') || lower.includes('warning') || lower.includes('please')) return 'warning'
  return 'info'
}

// ─── Provider ────────────────────────────────────────────────────────────────

// ─── Portal wrapper (renders to document.body to sit above Radix portals) ────

function DialogPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const open = useCallback((state: DialogState): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setDialog(state)
    })
  }, [])

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setDialog(null)
  }, [])

  const showAlert = useCallback(
    async (messageOrOptions: string | AlertOptions): Promise<void> => {
      const opts: AlertOptions =
        typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions

      await open({
        type: 'alert',
        title: opts.title ?? '',
        message: opts.message,
        variant: opts.variant ?? inferVariant(opts.message),
        confirmText: opts.buttonText ?? 'OK',
        cancelText: '',
      })
    },
    [open],
  )

  const showConfirm = useCallback(
    async (messageOrOptions: string | ConfirmOptions): Promise<boolean> => {
      const opts: ConfirmOptions =
        typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions

      return open({
        type: 'confirm',
        title: opts.title ?? 'Confirm',
        message: opts.message,
        variant: opts.variant ?? 'warning',
        confirmText: opts.confirmText ?? 'Confirm',
        cancelText: opts.cancelText ?? 'Cancel',
      })
    },
    [open],
  )

  const cfg = dialog ? variantConfig[dialog.variant] : null

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      <DialogPortal>
        <AnimatePresence>
          {dialog && cfg && (
            /* Backdrop */
            <motion.div
              key="dialog-backdrop"
              className="fixed inset-0 flex items-center justify-center p-4"
              style={{ zIndex: 99999 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Overlay */}
              <motion.div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => {
                  if (dialog.type === 'alert') close(true)
                  else close(false)
                }}
              />

              {/* Card */}
              <motion.div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              >
                {/* Close button (top right) */}
                <button
                  onClick={() => close(dialog.type === 'alert' ? true : false)}
                  className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="px-6 pt-6 pb-2">
                  {/* Icon + Title */}
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 p-2.5 rounded-full ${cfg.bgColor} ${cfg.color} border ${cfg.borderColor}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      {dialog.title && (
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                          {dialog.title}
                        </h3>
                      )}
                      <p className={`text-sm text-gray-600 ${dialog.title ? 'mt-1.5' : 'mt-0.5'} whitespace-pre-line leading-relaxed`}>
                        {dialog.message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 mt-2 flex justify-end gap-3">
                  {dialog.type === 'confirm' && (
                    <button
                      onClick={() => close(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                    >
                      {dialog.cancelText}
                    </button>
                  )}
                  <button
                    onClick={() => close(true)}
                    className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${cfg.buttonColor}`}
                    autoFocus
                  >
                    {dialog.confirmText}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogPortal>
    </DialogContext.Provider>
  )
}
