'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Theme } from '@radix-ui/themes'
import { StoreProvider, useStore } from '@/contexts/StoreContext'
import Sidebar from '@/components/Sidebar'
import UserManagement from '@/components/UserManagement'
import ServicesManagement from '@/components/ServicesManagement'
import OrderManagement from '@/components/OrderManagement'
import InventoryManagement from '@/components/InventoryManagement'
import Reports from '@/components/Reports'
import UserProfileMenu from '@/components/UserProfileMenu'

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const { selectedStore, loading: storeLoading } = useStore()

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
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
    } catch (error) {
      console.error('Auth check error:', error)
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
        return <UserManagement />
    }
  }

  return (
    <Theme appearance="light" accentColor="blue" grayColor="slate" radius="medium" scaling="100%">
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 ml-64">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Store Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  {selectedStore.name}
                </p>
              </div>
              <div className="flex items-center">
                {user && <UserProfileMenu user={user} />}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
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

