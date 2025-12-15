'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/contexts/StoreContext'

interface Store {
  id: string
  name: string
  address?: string
}

interface StoreAssignmentProps {
  selectedStoreIds: string[]
  onStoreSelectionChange: (storeIds: string[]) => void
  disabled?: boolean
}

const StoreAssignment: React.FC<StoreAssignmentProps> = ({
  selectedStoreIds,
  onStoreSelectionChange,
  disabled = false
}) => {
  const { stores: accessibleStores } = useStore()
  const [availableStores, setAvailableStores] = useState<Store[]>([])
  const [assignedStores, setAssignedStores] = useState<Store[]>([])
  const [availableFilter, setAvailableFilter] = useState('')
  const [assignedFilter, setAssignedFilter] = useState('')
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set())
  const [selectedAssigned, setSelectedAssigned] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    checkUserRole()
  }, [])

  useEffect(() => {
    if (accessibleStores.length > 0 || isSuperAdmin) {
      loadStores()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessibleStores, isSuperAdmin])

  // Fetch stores that are in selectedStoreIds but not yet in availableStores
  // This is needed when editing other users who have stores assigned that the current user doesn't have access to
  useEffect(() => {
    const fetchMissingStores = async () => {
      if (selectedStoreIds.length === 0) return
      
      // For super admin, all stores should already be loaded, so skip
      if (isSuperAdmin) return
      
      // Find store IDs that are in selectedStoreIds but not in availableStores
      const availableStoreIds = availableStores.map(s => s.id)
      const missingStoreIds = selectedStoreIds.filter(id => !availableStoreIds.includes(id))
      
      console.log('StoreAssignment: Checking for missing stores', {
        selectedStoreIds,
        availableStoreIds,
        missingStoreIds
      })
      
      if (missingStoreIds.length > 0) {
        try {
          const { data: missingStores, error } = await supabase
            .from('stores')
            .select('id, name, address')
            .in('id', missingStoreIds)
            .eq('status', 'active')

          if (error) {
            console.error('Error loading missing stores:', error)
            return
          }

          if (missingStores && missingStores.length > 0) {
            console.log('StoreAssignment: Fetched missing stores:', missingStores.map(s => s.id))
            // Add missing stores to availableStores so they can be shown in assigned
            setAvailableStores(prev => {
              const existingIds = prev.map(s => s.id)
              const newStores = missingStores.filter(s => !existingIds.includes(s.id))
              const updated = [...prev, ...newStores].sort((a, b) => a.name.localeCompare(b.name))
              console.log('StoreAssignment: Updated availableStores:', updated.map(s => s.id))
              return updated
            })
          }
        } catch (error) {
          console.error('Error fetching missing stores:', error)
        }
      }
    }

    // Fetch missing stores when selectedStoreIds changes or after initial stores load
    // Don't wait for availableStores to be populated - fetch immediately if we have selectedStoreIds
    fetchMissingStores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreIds, availableStores, isSuperAdmin])

  useEffect(() => {
    // Update assigned stores when selectedStoreIds prop changes or availableStores loads
    // This ensures stores are properly moved to assigned when availableStores loads
    console.log('StoreAssignment: Updating assigned stores', {
      selectedStoreIds,
      availableStoresCount: availableStores.length,
      availableStoreIds: availableStores.map(s => s.id)
    })
    
    if (selectedStoreIds.length === 0) {
      // If no stores selected, clear assigned stores
      setAssignedStores([])
      return
    }
    
    if (availableStores.length === 0) {
      // If availableStores is empty but selectedStoreIds has items, wait for stores to load
      console.log('StoreAssignment: Waiting for availableStores to load...')
      return
    }
    
    // Find stores that are in selectedStoreIds and availableStores
    const assigned = availableStores.filter(store => 
      selectedStoreIds.includes(store.id)
    )
    
    console.log('StoreAssignment: Found assigned stores', {
      assignedCount: assigned.length,
      assignedIds: assigned.map(s => s.id),
      selectedStoreIds,
      availableStoreIds: availableStores.map(s => s.id)
    })
    
    setAssignedStores(assigned)
    
    // Warn if we have selectedStoreIds but stores aren't in availableStores
    if (assigned.length === 0 && selectedStoreIds.length > 0) {
      console.warn('StoreAssignment: selectedStoreIds has stores but they are not in availableStores', {
        selectedStoreIds,
        availableStoreIds: availableStores.map(s => s.id)
      })
    }
  }, [selectedStoreIds, availableStores])

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      setIsSuperAdmin(userData?.role === 'super_admin')
    } catch (error) {
      console.error('Error checking user role:', error)
    }
  }

  const loadStores = async () => {
    try {
      setLoading(true)
      
      // If super admin, show all stores. Otherwise, only show stores the user has access to
      if (isSuperAdmin) {
        const { data: stores, error } = await supabase
          .from('stores')
          .select('id, name, address')
          .eq('status', 'active')
          .order('name')

        if (error) {
          console.error('Error loading stores:', error)
          return
        }

        setAvailableStores(stores || [])
      } else {
        // Only show stores that the current user has access to
        // Get store IDs from accessibleStores (which already filters by user access)
        const storeIds = accessibleStores.map(s => s.id)
        
        if (storeIds.length > 0) {
          const { data: stores, error } = await supabase
            .from('stores')
            .select('id, name, address')
            .in('id', storeIds)
            .eq('status', 'active')
            .order('name')

          if (error) {
            console.error('Error loading stores:', error)
            return
          }

          setAvailableStores(stores || [])
        } else {
          setAvailableStores([])
        }
      }
    } catch (error) {
      console.error('Error loading stores:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAvailableStores = availableStores.filter(store => {
    // Exclude stores that are already in selectedStoreIds (they should be in assigned)
    const isSelected = selectedStoreIds.includes(store.id)
    const matchesFilter = store.name.toLowerCase().includes(availableFilter.toLowerCase())
    return !isSelected && matchesFilter
  })

  const filteredAssignedStores = assignedStores.filter(store =>
    store.name.toLowerCase().includes(assignedFilter.toLowerCase())
  )

  const handleAvailableSelect = (storeId: string) => {
    if (disabled) return
    const newSelected = new Set(selectedAvailable)
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId)
    } else {
      newSelected.add(storeId)
    }
    setSelectedAvailable(newSelected)
  }

  const handleAssignedSelect = (storeId: string) => {
    if (disabled) return
    const newSelected = new Set(selectedAssigned)
    if (newSelected.has(storeId)) {
      newSelected.delete(storeId)
    } else {
      newSelected.add(storeId)
    }
    setSelectedAssigned(newSelected)
  }

  const moveToAssigned = () => {
    if (disabled) return
    const newSelectedStores = [...selectedStoreIds]
    selectedAvailable.forEach(storeId => {
      if (!newSelectedStores.includes(storeId)) {
        newSelectedStores.push(storeId)
      }
    })
    onStoreSelectionChange(newSelectedStores)
    setSelectedAvailable(new Set())
  }

  const moveToAvailable = () => {
    if (disabled) return
    const newSelectedStores = selectedStoreIds.filter(id => 
      !selectedAssigned.has(id)
    )
    onStoreSelectionChange(newSelectedStores)
    setSelectedAssigned(new Set())
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-gray-500">Loading stores...</div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex gap-4 h-80">
        {/* Available Stores Panel */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 flex items-center">
              🏪 Available Stores
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Showing all {filteredAvailableStores.length}
            </p>
          </div>
          
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Filter"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={availableFilter}
              onChange={(e) => setAvailableFilter(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="p-3 overflow-y-auto h-48">
            {filteredAvailableStores.map(store => (
              <div
                key={store.id}
                className={`p-2 mb-1 rounded cursor-pointer border transition-colors ${
                  selectedAvailable.has(store.id)
                    ? 'bg-blue-100 border-blue-300'
                    : 'hover:bg-gray-50 border-transparent'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleAvailableSelect(store.id)}
              >
                <div className="font-medium text-sm text-gray-900">{store.name}</div>
                {store.address && (
                  <div className="text-xs text-gray-500 mt-1">{store.address}</div>
                )}
              </div>
            ))}
            {filteredAvailableStores.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                No available stores
              </div>
            )}
          </div>
        </div>

        {/* Transfer Controls */}
        <div className="flex flex-col justify-center items-center gap-2">
          <button
            type="button"
            onClick={moveToAssigned}
            disabled={disabled || selectedAvailable.size === 0}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg transition-colors ${
              disabled || selectedAvailable.size === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            → →
          </button>
          
          <button
            type="button"
            onClick={moveToAvailable}
            disabled={disabled || selectedAssigned.size === 0}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg transition-colors ${
              disabled || selectedAssigned.size === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            ← ←
          </button>
        </div>

        {/* Assigned Stores Panel */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 flex items-center">
              ✅ Assigned Stores
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Showing all {filteredAssignedStores.length}
            </p>
          </div>
          
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Filter"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="p-3 overflow-y-auto h-48">
            {filteredAssignedStores.map(store => (
              <div
                key={store.id}
                className={`p-2 mb-1 rounded cursor-pointer border transition-colors ${
                  selectedAssigned.has(store.id)
                    ? 'bg-blue-100 border-blue-300'
                    : 'hover:bg-gray-50 border-transparent'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleAssignedSelect(store.id)}
              >
                <div className="font-medium text-sm text-gray-900">{store.name}</div>
                {store.address && (
                  <div className="text-xs text-gray-500 mt-1">{store.address}</div>
                )}
              </div>
            ))}
            {filteredAssignedStores.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                No assigned stores
              </div>
            )}
          </div>
        </div>
      </div>
      
      {selectedStoreIds.length > 0 && (
        <div className="mt-3 text-sm text-gray-600">
          {selectedStoreIds.length} store{selectedStoreIds.length !== 1 ? 's' : ''} selected
          {assignedStores.length < selectedStoreIds.length && availableStores.length > 0 && (
            <span className="text-orange-600 ml-2 text-xs">
              (Note: {selectedStoreIds.length - assignedStores.length} store(s) may not be visible yet)
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default StoreAssignment

