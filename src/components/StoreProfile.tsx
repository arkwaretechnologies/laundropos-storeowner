'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/contexts/StoreContext'
import { 
  Button, 
  TextField, 
  Flex, 
  Text, 
  Card, 
  Box,
  Separator
} from '@radix-ui/themes'
import { Pencil2Icon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons'

export default function StoreProfile() {
  const { selectedStore, refreshStores } = useStore()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [storeName, setStoreName] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [storeEmail, setStoreEmail] = useState('')
  const [storeWebsite, setStoreWebsite] = useState('')

  useEffect(() => {
    if (selectedStore) {
      setStoreName(selectedStore.name || '')
      setStoreAddress(selectedStore.address || '')
      setStorePhone(selectedStore.phone || '')
      setStoreEmail(selectedStore.email || '')
      setStoreWebsite(selectedStore.website || '')
      
      setEditing(false)
      setError(null)
      setSuccess(null)
    }
  }, [selectedStore])

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!selectedStore) {
      setError('No store selected')
      return
    }

    if (!storeName.trim()) {
      setError('Store name is required')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate email format if provided
      if (storeEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeEmail.trim())) {
        setError('Please enter a valid email address')
        setLoading(false)
        return
      }

      // Prepare update data
      interface UpdateData {
        name: string
        address: string | null
        phone: string | null
        email: string | null
        website: string | null
      }
      const updateData: UpdateData = {
        name: storeName.trim(),
        address: storeAddress.trim() || null,
        phone: storePhone.trim() || null,
        email: storeEmail.trim() || null,
        website: storeWebsite.trim() || null,
      }

      console.log('Attempting to update store:', {
        storeId: selectedStore.id,
        updateData
      })

      // Update the store - use select to get confirmation
      const { error: updateError, data: updateDataResponse } = await supabase
        .from('stores')
        .update(updateData)
        .eq('id', selectedStore.id)
        .select('id, name, address, phone, email, website')

      console.log('Update response - error:', updateError)
      console.log('Update response - data:', updateDataResponse)
      console.log('Update response - data length:', updateDataResponse?.length)

      if (updateError) {
        console.error('Update error:', updateError)
        console.error('Error code:', updateError.code)
        console.error('Error message:', updateError.message)
        console.error('Error details:', updateError.details)
        console.error('Error hint:', updateError.hint)
        throw updateError
      }

      // Check if update actually affected any rows
      if (!updateDataResponse || updateDataResponse.length === 0) {
        console.error('Update returned no data - this indicates RLS is blocking the UPDATE operation')
        throw new Error('Update failed: No rows were updated. This is likely due to Row Level Security (RLS) policies. Please ensure your RLS policies allow store owners to update their stores.')
      }

      console.log('Update successful. Rows updated:', updateDataResponse.length)
      const updatedStore = updateDataResponse[0]
      console.log('Updated store data:', updatedStore)

      // Use the data returned from the update
      if (updatedStore) {
        setStoreName(updatedStore.name || '')
        setStoreAddress(updatedStore.address || '')
        setStorePhone(updatedStore.phone || '')
        setStoreEmail(updatedStore.email || '')
        setStoreWebsite(updatedStore.website || '')
      }

      setSuccess('Store profile updated successfully')
      setEditing(false)
      
      // Refresh stores to update the context with new data
      console.log('Refreshing stores context...')
      await refreshStores()
      console.log('Stores context refreshed')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: unknown) {
      interface ErrorWithMessage {
        message?: string
        error_description?: string
      }
      const errorObj = error as ErrorWithMessage
      const errorMessage = errorObj?.message || errorObj?.error_description || 'Unknown error occurred'
      console.error('Error updating store profile:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      setError(`Failed to update store profile: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (selectedStore) {
      setStoreName(selectedStore.name || '')
      setStoreAddress(selectedStore.address || '')
      setStorePhone(selectedStore.phone || '')
      setStoreEmail(selectedStore.email || '')
      setStoreWebsite(selectedStore.website || '')
    }
    setEditing(false)
    setError(null)
    setSuccess(null)
  }

  if (!selectedStore) {
    return (
      <Box>
        <Card>
          <Flex direction="column" gap="3">
            <Text size="4" weight="bold">Store Profile</Text>
            <Text color="gray">Please select a store to view and edit its profile</Text>
          </Flex>
        </Card>
      </Box>
    )
  }

  return (
    <Box>
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="start" className="flex-col sm:flex-row" gap="4">
          <Box className="flex-1 min-w-0 pr-4">
            <Text size="6" weight="bold" className="block">Store Profile</Text>
            <Text size="2" color="gray" mt="1" className="block whitespace-normal">
              Manage your store information
            </Text>
          </Box>
          {!editing && (
            <Button onClick={() => setEditing(true)} className="w-full sm:w-auto flex-shrink-0">
              <Pencil2Icon /> Edit Profile
            </Button>
          )}
        </Flex>

        {/* Success Message */}
        {success && (
          <Card style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac' }}>
            <Flex align="center" gap="2">
              <CheckIcon color="green" />
              <Text size="2" color="green">{success}</Text>
            </Flex>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}>
            <Flex align="center" gap="2">
              <Cross2Icon color="red" />
              <Text size="2" color="red">{error}</Text>
            </Flex>
          </Card>
        )}

        {/* Store Profile Card */}
        <Card>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleSave(e)
          }}>
            <Flex direction="column" gap="4">
                  {/* Store Name */}
                  <Flex direction="column" gap="2">
                    <Text size="2" weight="bold" color="gray">
                      Store Name *
                    </Text>
                    {editing ? (
                      <TextField.Root
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="Enter store name"
                        disabled={loading}
                      />
                    ) : (
                      <Text size="4" weight="medium">
                        {selectedStore.name || 'Not set'}
                      </Text>
                    )}
                  </Flex>

                  <Separator />

                  {/* Store Address */}
                  <Flex direction="column" gap="2">
                    <Text size="2" weight="bold" color="gray">
                      Address
                    </Text>
                    {editing ? (
                      <TextField.Root
                        value={storeAddress}
                        onChange={(e) => setStoreAddress(e.target.value)}
                        placeholder="Enter store address"
                        disabled={loading}
                      />
                    ) : (
                      <Text size="3">
                        {selectedStore.address || (
                          <Text color="gray" style={{ fontStyle: 'italic' }}>
                            No address set
                          </Text>
                        )}
                      </Text>
                    )}
                  </Flex>

                  <Separator />

                  {/* Store Phone */}
                  <Flex direction="column" gap="2">
                    <Text size="2" weight="bold" color="gray">
                      Phone Number
                    </Text>
                    {editing ? (
                      <TextField.Root
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                        placeholder="Enter phone number"
                        disabled={loading}
                        type="tel"
                      />
                    ) : (
                      <Text size="3">
                        {selectedStore.phone || (
                          <Text color="gray" style={{ fontStyle: 'italic' }}>
                            No phone number set
                          </Text>
                        )}
                      </Text>
                    )}
                  </Flex>

                  <Separator />

                  {/* Store Email */}
                  <Flex direction="column" gap="2">
                    <Text size="2" weight="bold" color="gray">
                      Email
                    </Text>
                    {editing ? (
                      <TextField.Root
                        value={storeEmail}
                        onChange={(e) => setStoreEmail(e.target.value)}
                        placeholder="Enter store email"
                        disabled={loading}
                        type="email"
                      />
                    ) : (
                      <Text size="3">
                        {selectedStore.email || (
                          <Text color="gray" style={{ fontStyle: 'italic' }}>
                            No email set
                          </Text>
                        )}
                      </Text>
                    )}
                  </Flex>

                  <Separator />

                  {/* Store Website */}
                  <Flex direction="column" gap="2">
                    <Text size="2" weight="bold" color="gray">
                      Website
                    </Text>
                    {editing ? (
                      <TextField.Root
                        value={storeWebsite}
                        onChange={(e) => setStoreWebsite(e.target.value)}
                        placeholder="example.com or https://example.com"
                        disabled={loading}
                        type="text"
                      />
                    ) : (
                      <Text size="3">
                        {selectedStore.website ? (
                          <a 
                            href={selectedStore.website.startsWith('http') ? selectedStore.website : `https://${selectedStore.website}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#3b82f6', textDecoration: 'underline' }}
                          >
                            {selectedStore.website}
                          </a>
                        ) : (
                          <Text color="gray" style={{ fontStyle: 'italic' }}>
                            No website set
                          </Text>
                        )}
                      </Text>
                    )}
                  </Flex>

                  {/* Action Buttons */}
                  {editing && (
                    <>
                      <Separator />
                      <Flex gap="3" justify="end" mt="2">
                        <Button
                          variant="soft"
                          color="gray"
                          onClick={handleCancel}
                          disabled={loading}
                        >
                          <Cross2Icon /> Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={loading || !storeName.trim()}
                        >
                          <CheckIcon /> {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </Flex>
                    </>
                  )}
                </Flex>
            </form>
              </Card>

      </Flex>
    </Box>
  )
}

