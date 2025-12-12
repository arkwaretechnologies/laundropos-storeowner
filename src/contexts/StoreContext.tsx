'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface Store {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  manager_id?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  features?: {
    email_receipts?: boolean
    loyalty_points?: boolean
    tax_calculation?: boolean
    delivery_tracking?: boolean
    sms_notifications?: boolean
    advanced_reporting?: boolean
    inventory_tracking?: boolean
    multiple_currencies?: boolean
  }
  settings?: {
    currency?: string
    tax_rate?: number
    currency_symbol?: string
    low_stock_threshold?: number
    loyalty_points_rate?: number
  }
}

interface StoreContextType {
  stores: Store[]
  selectedStore: Store | null
  setSelectedStore: (store: Store | null) => void
  loading: boolean
  refreshStores: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStores = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      // Handle refresh token errors
      if (authError) {
        if (authError.message?.includes('Refresh Token') || 
            authError.message?.includes('refresh_token_not_found')) {
          console.warn('Refresh token invalid in StoreContext, clearing stores...')
          setStores([])
          setSelectedStore(null)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('selectedStoreId')
          }
          return
        }
      }
      
      if (!user) {
        setStores([])
        setSelectedStore(null)
        return
      }

      // Get stores assigned to the user
      const { data: assignments, error: assignmentError } = await supabase
        .from('user_store_assignments')
        .select('store_id, stores(id, name, address, phone, email, website, manager_id, status, created_at, updated_at, features, settings)')
        .eq('user_id', user.id)

      if (assignmentError) {
        console.error('Error loading store assignments:', assignmentError)
        setStores([])
        return
      }

      // Also check if user is a store owner or super admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      // If super admin, get all stores
      if (userData?.role === 'super_admin') {
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('id, name, address, phone, email, website, manager_id, status, created_at, updated_at, features, settings')
          .eq('status', 'active')
          .order('name')

        if (storesError) {
          console.error('Error loading stores:', storesError)
          setStores([])
        } else {
          const loadedStores = storesData || []
          setStores(loadedStores)
          
          // Update selected store with fresh data if it exists
          if (selectedStore) {
            const updatedStore = loadedStores.find(s => s.id === selectedStore.id)
            if (updatedStore) {
              // Update selected store with fresh data
              setSelectedStore(updatedStore)
            } else if (loadedStores.length > 0) {
              // If selected store is no longer available, select first one
              setSelectedStore(loadedStores[0])
            } else {
              setSelectedStore(null)
            }
          } else if (loadedStores.length > 0) {
            // Set first store as selected if none selected
            const savedStoreId = localStorage.getItem('selectedStoreId')
            const savedStore = loadedStores.find(s => s.id === savedStoreId)
            setSelectedStore(savedStore || loadedStores[0])
          }
        }
        setLoading(false)
        return
      }

      const allStoreIds = new Set<string>()
      
      if (assignments) {
        assignments.forEach((assignment) => {
          // Supabase returns stores as an array when using select with relations
          const stores = assignment.stores as unknown as { id: string; name: string }[] | { id: string; name: string } | null
          if (stores) {
            if (Array.isArray(stores)) {
              stores.forEach(store => allStoreIds.add(store.id))
            } else {
              allStoreIds.add(stores.id)
            }
          } else if (assignment.store_id) {
            // Fallback to store_id if stores relation is not available
            allStoreIds.add(assignment.store_id)
          }
        })
      }

      // If user is store owner, also get stores where they are the owner
      if (userData?.role === 'store_owner') {
        const { data: ownerStores } = await supabase
          .from('stores')
          .select('id, name, address, phone, email, website, manager_id, status, created_at, updated_at, features, settings')
          .eq('owner_id', user.id)

        if (ownerStores) {
          ownerStores.forEach(store => allStoreIds.add(store.id))
        }
      }

        // Fetch all unique stores
        if (allStoreIds.size > 0) {
          const { data: storesData, error: storesError } = await supabase
            .from('stores')
            .select('id, name, address, phone, email, website, manager_id, status, created_at, updated_at, features, settings')
            .in('id', Array.from(allStoreIds))
            .eq('status', 'active')
            .order('name')

        if (storesError) {
          console.error('Error loading stores:', storesError)
          setStores([])
        } else {
          const loadedStores = storesData || []
          setStores(loadedStores)
          
          // Update selected store with fresh data if it exists
          if (selectedStore) {
            const updatedStore = loadedStores.find(s => s.id === selectedStore.id)
            if (updatedStore) {
              // Update selected store with fresh data
              setSelectedStore(updatedStore)
            } else if (loadedStores.length > 0) {
              // If selected store is no longer available, select first one
              setSelectedStore(loadedStores[0])
            } else {
              setSelectedStore(null)
            }
          } else if (loadedStores.length > 0) {
            // Set first store as selected if none selected
            const savedStoreId = localStorage.getItem('selectedStoreId')
            const savedStore = loadedStores.find(s => s.id === savedStoreId)
            setSelectedStore(savedStore || loadedStores[0])
          }
        }
      } else {
        setStores([])
        setSelectedStore(null)
      }
    } catch (error) {
      console.error('Error loading stores:', error)
      setStores([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedStore) {
      localStorage.setItem('selectedStoreId', selectedStore.id)
    }
  }, [selectedStore])

  const handleSetSelectedStore = (store: Store | null) => {
    setSelectedStore(store)
    if (store) {
      localStorage.setItem('selectedStoreId', store.id)
    } else {
      localStorage.removeItem('selectedStoreId')
    }
  }

  return (
    <StoreContext.Provider
      value={{
        stores,
        selectedStore,
        setSelectedStore: handleSetSelectedStore,
        loading,
        refreshStores: loadStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

