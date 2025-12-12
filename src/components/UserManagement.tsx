'use client'

import React, { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { useStore } from '@/contexts/StoreContext'
import StoreAssignment from './StoreAssignment'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  is_active: boolean
  created_at: string
}

const UserManagement = () => {
  const { selectedStore } = useStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogVisible, setDialogVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('cashier')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])

  useEffect(() => {
    if (selectedStore) {
      fetchUsers()
      // Only update selectedStoreIds if dialog is not open (to avoid conflicts)
      // When dialog is open, let the form manage selectedStoreIds
      if (!dialogVisible) {
        if (selectedStoreIds.length === 0 || !selectedStoreIds.includes(selectedStore.id)) {
          setSelectedStoreIds([selectedStore.id])
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore])

  const fetchUsers = async () => {
    if (!selectedStore) return
    
    try {
      setLoading(true)
      console.log('Fetching users for store:', selectedStore.id, selectedStore.name)

      // Use admin client for better access (bypasses RLS)
      const clientToUse = supabaseAdmin || supabase
      const allUserIds = new Set<string>()

      // Step 1: Get all user IDs from user_store_assignments
      const { data: assignments, error: assignmentError } = await clientToUse
        .from('user_store_assignments')
        .select('user_id')
        .eq('store_id', selectedStore.id)

      if (assignmentError) {
        console.error('Error fetching assignment IDs:', assignmentError)
      } else {
        assignments?.forEach((a: { user_id: string }) => {
          if (a.user_id) {
            allUserIds.add(a.user_id)
          }
        })
        console.log('Found user IDs from assignments:', Array.from(allUserIds))
      }

      // Step 2: Get store owner and manager if they exist
      // Try to get owner_id and manager_id, but don't fail if columns don't exist
      try {
        const { data: storeData, error: storeError } = await clientToUse
          .from('stores')
          .select('owner_id, manager_id')
          .eq('id', selectedStore.id)
          .single()

        if (storeError) {
          // If error is about missing columns, that's okay - just log and continue
          if (storeError.code === 'PGRST116' || storeError.message?.includes('column')) {
            console.log('Store table does not have owner_id/manager_id columns, skipping')
          } else {
            console.error('Error fetching store data:', storeError)
          }
        } else if (storeData) {
          if (storeData.owner_id) {
            allUserIds.add(storeData.owner_id)
            console.log('Added owner_id:', storeData.owner_id)
          }
          if (storeData.manager_id) {
            allUserIds.add(storeData.manager_id)
            console.log('Added manager_id:', storeData.manager_id)
          }
        }
      } catch {
        // Silently continue if store query fails - we can still get users from assignments
        console.log('Could not fetch store owner/manager data, continuing with assignments only')
      }

      // Also check if selectedStore already has manager_id (from context)
      if (selectedStore.manager_id) {
        allUserIds.add(selectedStore.manager_id)
        console.log('Added manager_id from selectedStore:', selectedStore.manager_id)
      }

      const userIdsArray = Array.from(allUserIds)
      console.log('All user IDs to fetch:', userIdsArray.length, userIdsArray)

      if (userIdsArray.length === 0) {
        console.log('No users found for this store')
        setUsers([])
        setLoading(false)
        return
      }

      // Step 3: Fetch all users, excluding super_admin
      const { data: usersData, error: usersError } = await clientToUse
        .from('users')
        .select('*')
        .in('id', userIdsArray)
        .neq('role', 'super_admin') // Exclude super_admin
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Error fetching users:', usersError)
        setUsers([])
        setLoading(false)
        return
      }

      // Map to User interface
      interface UserData {
        id: string
        email: string
        first_name?: string | null
        last_name?: string | null
        phone?: string | null
        role: string
        is_active?: boolean | null
        created_at: string
      }
      const allUsers: User[] = (usersData || []).map((user: UserData) => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        role: user.role,
        is_active: user.is_active !== false,
        created_at: user.created_at
      }))

      console.log('Total users found for store:', selectedStore.id, 'Count:', allUsers.length)
      console.log('User details:', allUsers.map(u => ({ 
        id: u.id, 
        email: u.email, 
        role: u.role, 
        name: `${u.first_name} ${u.last_name}`,
        is_active: u.is_active
      })))
      
      setUsers(allUsers)
    } catch (error) {
      console.error('Error in fetchUsers:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const getCurrentAuthUserId = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.warn('Unable to get current auth user:', error.message)
        return null
      }
      return data.user?.id ?? null
    } catch (error) {
      console.warn('Failed to get current auth user:', error)
      return null
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFirstName('')
    setLastName('')
    setPhone('')
    setRole('cashier')
    setIsActive(true)
    // Always default to the currently selected store (only once)
    if (selectedStore) {
      setSelectedStoreIds([selectedStore.id])
    } else {
      setSelectedStoreIds([])
    }
    setEditingUser(null)
  }

  const openAddDialog = () => {
    resetForm()
    // resetForm already sets the store to [selectedStore.id]
    // Give a small delay to ensure StoreAssignment component is ready
    setTimeout(() => {
      setDialogVisible(true)
    }, 0)
  }

  const openEditDialog = async (user: User) => {
    setEditingUser(user)
    setEmail(user.email)
    setFirstName(user.first_name || '')
    setLastName(user.last_name || '')
    setPhone(user.phone || '')
    setRole(user.role)
    setIsActive(user.is_active)
    setPassword('')
    setDialogVisible(true)

    // Load user's current store assignments
    try {
      const { data: assignments, error } = await supabase
        .from('user_store_assignments')
        .select('store_id')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading store assignments:', error)
      } else {
        const storeIds = assignments?.map(a => a.store_id) || []
        setSelectedStoreIds(storeIds)
      }
    } catch (error) {
      console.error('Error loading store assignments:', error)
    }
  }

  const handleCreateUser = async () => {
    if (!selectedStore) {
      alert('Please select a store first')
      return
    }

    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      alert('Please fill in all required fields')
      return
    }

    // Ensure at least the current store is selected, but avoid duplicates
    let finalStoreIds = [...selectedStoreIds] // Create a copy to avoid mutations
    if (finalStoreIds.length === 0 || !finalStoreIds.includes(selectedStore.id)) {
      // If no stores selected or current store not in selection, use current store
      finalStoreIds = [selectedStore.id]
    } else {
      // Remove duplicates just in case
      finalStoreIds = Array.from(new Set(finalStoreIds))
    }

    if (finalStoreIds.length === 0) {
      alert('Please assign at least one store to the user')
      return
    }

    console.log('Creating user with store assignments:', {
      selectedStoreIds: selectedStoreIds,
      finalStoreIds: finalStoreIds,
      currentStore: selectedStore.id
    })

    setSaving(true)
    try {
      const actingUserId = await getCurrentAuthUserId()

      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role: role,
            phone: phone.trim(),
          }
        }
      })

      if (authError) {
        alert(`Failed to create user: ${authError.message}`)
        return
      }

      if (!authData.user) {
        alert('Failed to create user: No user data returned')
        return
      }

      // Step 2: Auto-confirm email
      if (supabaseAdmin) {
        await supabaseAdmin.auth.admin.updateUserById(
          authData.user.id,
          { email_confirm: true }
        )
      }
      
      // Step 3: Insert user in custom users table
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          role: role,
          is_active: isActive,
        })

      if (userError) {
        alert(`User created in auth but failed to save details: ${userError.message}`)
        return
      }

      // Step 4: Create store assignments
      // Use finalStoreIds to ensure we're assigning the correct stores
      const assignments = finalStoreIds.map((storeId, index) => ({
        user_id: authData.user!.id,
        store_id: storeId,
        role: 'employee',
        is_primary: index === 0,
        assigned_by: actingUserId || authData.user!.id
      }))
      
      console.log('Creating user with store assignments:', {
        userId: authData.user!.id,
        storeIds: finalStoreIds,
        currentStore: selectedStore.id
      })

      const { error: assignmentError } = await supabaseAdmin
        .from('user_store_assignments')
        .insert(assignments)

      if (assignmentError) {
        console.error('Assignment error:', assignmentError)
        alert(`User created but failed to assign stores: ${assignmentError.message}`)
        // Still refresh to show the user if they were created
        await fetchUsers()
      } else {
        alert('User created successfully!')
        setDialogVisible(false)
        resetForm()
        // Add a small delay to ensure database consistency
        setTimeout(() => {
          fetchUsers()
        }, 500)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (editingUser) {
      await handleUpdateUser()
    } else {
      await handleCreateUser()
    }
  }

  const handleUpdateUser = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Please fill in all required fields')
      return
    }

    if (selectedStoreIds.length === 0) {
      alert('Please assign at least one store to the user')
      return
    }

    setSaving(true)
    try {
      const actingUserId = await getCurrentAuthUserId()
      
      // Update password if provided
      if (password.trim()) {
        if (!supabaseAdmin) {
          alert('Admin client not configured.')
          return
        }

        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          editingUser!.id,
          { password: password.trim() }
        )

        if (passwordError) {
          alert(`Failed to update password: ${passwordError.message}`)
          return
        }
      }
      
      // Update user in custom users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          role: role,
          is_active: isActive,
        })
        .eq('id', editingUser!.id)

      if (userError) {
        alert(`Failed to update user: ${userError.message}`)
        return
      }

      // Update store assignments
      // Delete existing
      await supabaseAdmin
        .from('user_store_assignments')
        .delete()
        .eq('user_id', editingUser!.id)

      // Insert new
      const assignments = selectedStoreIds.map((storeId, index) => ({
        user_id: editingUser!.id,
        store_id: storeId,
        role: 'employee',
        is_primary: index === 0,
        assigned_by: actingUserId || editingUser!.id
      }))

      const { error: assignmentError } = await supabaseAdmin
        .from('user_store_assignments')
        .insert(assignments)

      if (assignmentError) {
        alert(`User updated but failed to update store assignments: ${assignmentError.message}`)
        return
      }

      alert('User updated successfully!')
      setDialogVisible(false)
      resetForm()
      fetchUsers()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) {
        alert('Failed to delete user')
        return
      }

      alert('User deleted successfully!')
      fetchUsers()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to delete user')
    }
  }

  if (!selectedStore) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please select a store to manage users</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage users for {selectedStore.name}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex-1 sm:flex-none"
            title="Refresh user list"
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
          <button
            onClick={openAddDialog}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex-1 sm:flex-none"
          >
            Create New User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEditDialog(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No users found for this store
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit User Dialog */}
      {dialogVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingUser ? 'Edit User' : 'Create New User'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingUser}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingUser ? 'Enter new password or leave blank' : 'Enter password'}
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cashier">Cashier</option>
                  <option value="store_owner">Store Owner</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Active User Checkbox */}
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Active User</span>
              </label>
            </div>

            {/* Store Assignment Section */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store/Tenant *
              </label>
              {selectedStore && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <span className="text-sm text-blue-800">
                    💡 Current store: <strong>{selectedStore.name}</strong> {selectedStoreIds.includes(selectedStore.id) ? '(Selected)' : '(Not selected - will be auto-assigned)'}
                  </span>
                </div>
              )}
              <StoreAssignment
                selectedStoreIds={selectedStoreIds}
                onStoreSelectionChange={setSelectedStoreIds}
              />
              {selectedStoreIds.length === 0 && (
                <div className="text-red-600 text-sm mt-1">
                  Please assign at least one store to the user
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setDialogVisible(false)
                  resetForm()
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingUser ? 'Update' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement

