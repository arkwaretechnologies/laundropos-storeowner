'use client'

import { useState, useEffect } from 'react'
// Download icon component
const DownloadIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
)

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if running on iOS
    interface WindowWithMSStream extends Window {
      MSStream?: unknown
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as WindowWithMSStream).MSStream
    if (isIOS) {
      // iOS doesn't support beforeinstallprompt, show manual install instructions
      setShowButton(true)
      return
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowButton(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if already installed
    const checkInstalled = () => {
      interface NavigatorWithStandalone extends Navigator {
        standalone?: boolean
      }
      const nav = window.navigator as NavigatorWithStandalone
      if (nav.standalone || window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        setShowButton(false)
      }
    }

    checkInstalled()

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // iOS or manual install
      alert('To install this app:\n\nOn iOS: Tap the Share button and select "Add to Home Screen"\n\nOn Android: Use the browser menu and select "Install app" or "Add to Home Screen"')
      return
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt()
      
      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
        setIsInstalled(true)
        setShowButton(false)
      } else {
        console.log('User dismissed the install prompt')
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Error showing install prompt:', error)
    }
  }

  if (isInstalled || !showButton) {
    return null
  }

  return (
    <button
      onClick={handleInstallClick}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mb-2"
      aria-label="Install app"
    >
      <DownloadIcon />
      Install App
    </button>
  )
}

