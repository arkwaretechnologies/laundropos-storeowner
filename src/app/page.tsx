'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Theme } from '@radix-ui/themes'
// Hamburger menu icon component
const HamburgerMenuIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
)
import { StoreProvider, useStore } from '@/contexts/StoreContext'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/components/Dashboard'
import UserManagement from '@/components/UserManagement'
import ServicesManagement from '@/components/ServicesManagement'
import OrderManagement from '@/components/OrderManagement'
import InventoryManagement from '@/components/InventoryManagement'
import Reports from '@/components/Reports'
import StoreProfile from '@/components/StoreProfile'
import UserProfileMenu from '@/components/UserProfileMenu'

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const { selectedStore, loading: storeLoading } = useStore()

  useEffect(() => {
    checkAuth()

    // Set up auth state listener to handle token refresh errors
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
      } else if (event === 'SIGNED_OUT') {
        // Clear local storage and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedStoreId')
        }
        router.push('/login')
      } else if (event === 'USER_UPDATED') {
        // User data updated, refresh auth check
        await checkAuth()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      // Handle refresh token errors specifically
      if (authError) {
        // Check if it's a refresh token error
        if (authError.message?.includes('Refresh Token') || 
            authError.message?.includes('refresh_token_not_found') ||
            authError.name === 'AuthApiError') {
          console.log('Refresh token invalid, signing out...')
          // Clear session and redirect to login
          await supabase.auth.signOut()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('selectedStoreId')
          }
          router.push('/login')
          return
        }
        
        // Other auth errors
        console.error('Auth error:', authError)
        router.push('/login')
        return
      }
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user is store owner or has store assignments
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', user.email)
        .single()

      if (error || !userData) {
        router.push('/login')
        return
      }

      const { data: assignments } = await supabase
        .from('user_store_assignments')
        .select('store_id')
        .eq('user_id', user.id)

      const isStoreOwner = userData.role === 'store_owner'
      const hasStoreAssignments = assignments && assignments.length > 0

      if (!isStoreOwner && !hasStoreAssignments) {
        router.push('/login')
        return
      }

      setUser(user)
    } catch (error: unknown) {
      console.error('Auth check error:', error)
      
      // Handle refresh token errors in catch block too
      const errorMessage = error instanceof Error ? error.message : 
                          (typeof error === 'object' && error !== null && 'message' in error) 
                            ? String((error as { message: unknown }).message) 
                            : ''
      
      if (errorMessage.includes('Refresh Token') || 
          errorMessage.includes('refresh_token_not_found')) {
        console.log('Refresh token invalid in catch, signing out...')
        await supabase.auth.signOut()
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedStoreId')
        }
      }
      
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading || storeLoading) {
    return (
      <Theme appearance="light">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </Theme>
    )
  }

  if (!user) {
    return null
  }

  if (!selectedStore) {
    return (
      <Theme appearance="light">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No store selected</p>
            <p className="text-sm text-gray-500">Please select a store from the sidebar</p>
          </div>
        </div>
      </Theme>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'store-profile':
        return <StoreProfile />
      case 'users':
        return <UserManagement />
      case 'services':
        return <ServicesManagement />
      case 'orders':
        return <OrderManagement />
      case 'inventory':
        return <InventoryManagement />
      case 'reports':
        return <Reports />
      default:
        return <Dashboard />
    }
  }

  return (
    <Theme appearance="light" accentColor="blue" grayColor="slate" radius="medium" scaling="100%">
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <div className="flex-1 lg:ml-64 w-full">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {/* Hamburger Menu Button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Open sidebar"
                >
                  <HamburgerMenuIcon className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Store Dashboard</h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">
                    {selectedStore.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                {user && <UserProfileMenu user={user} />}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-4 sm:p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </Theme>
  )
}

export default function Home() {
  return (
    <StoreProvider>
      <DashboardContent />
    </StoreProvider>
  )
}

