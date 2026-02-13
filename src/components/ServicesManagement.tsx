'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/contexts/StoreContext'
import { useDialog } from '@/contexts/DialogContext'
import { 
  Button, 
  TextField, 
  Dialog, 
  Flex, 
  Text, 
  Card, 
  Badge,
  Select,
  Switch,
  TextArea,
  IconButton,
  Box
} from '@radix-ui/themes'
import { PlusIcon, Pencil2Icon, TrashIcon } from '@radix-ui/react-icons'

interface Service {
  id: string
  store_id: string | null
  name: string
  description: string | null
  price: number
  icon: string
  category: string | null
  is_active: boolean
  is_global: boolean
  sort_order: number
}

export default function ServicesManagement() {
  const { selectedStore } = useStore()
  const { showAlert, showConfirm } = useDialog()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [serviceName, setServiceName] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [serviceIcon, setServiceIcon] = useState('shirt-outline')
  const [serviceCategory, setServiceCategory] = useState('wash')
  const [isActive, setIsActive] = useState(true)

  // Comprehensive list of Ionicons matching mobile app (LaundroPOS Mobile)
  // These icons sync with the mobile app - any icon selected here will appear in the app
  const availableIcons = [
    // Clothing & Items
    { value: 'shirt-outline', label: '👕 Shirt' },
    { value: 'shirt', label: '👕 Shirt (Filled)' },
    { value: 'bag-outline', label: '👜 Bag' },
    { value: 'bag', label: '👜 Bag (Filled)' },
    { value: 'cube-outline', label: '📦 Cube' },
    { value: 'cube', label: '📦 Cube (Filled)' },
    { value: 'bed-outline', label: '🛏️ Bedding' },
    { value: 'bed', label: '🛏️ Bedding (Filled)' },
    
    // Washing & Cleaning
    { value: 'water-outline', label: '💧 Water' },
    { value: 'water', label: '💧 Water (Filled)' },
    { value: 'sparkles-outline', label: '✨ Sparkles' },
    { value: 'sparkles', label: '✨ Sparkles (Filled)' },
    { value: 'bubbles-outline', label: '🫧 Bubbles' },
    { value: 'bubbles', label: '🫧 Bubbles (Filled)' },
    { value: 'brush-outline', label: '🖌️ Brush' },
    { value: 'brush', label: '🖌️ Brush (Filled)' },
    
    // Temperature & Heat
    { value: 'flame-outline', label: '🔥 Flame' },
    { value: 'flame', label: '🔥 Flame (Filled)' },
    { value: 'snow-outline', label: '❄️ Snow' },
    { value: 'snow', label: '❄️ Snow (Filled)' },
    { value: 'thermometer-outline', label: '🌡️ Thermometer' },
    { value: 'thermometer', label: '🌡️ Thermometer (Filled)' },
    
    // Services & Actions
    { value: 'cut-outline', label: '✂️ Cut' },
    { value: 'cut', label: '✂️ Cut (Filled)' },
    { value: 'hammer-outline', label: '🔨 Hammer' },
    { value: 'hammer', label: '🔨 Hammer (Filled)' },
    { value: 'construct-outline', label: '🔧 Construct' },
    { value: 'construct', label: '🔧 Construct (Filled)' },
    
    // Speed & Express
    { value: 'flash-outline', label: '⚡ Flash' },
    { value: 'flash', label: '⚡ Flash (Filled)' },
    { value: 'rocket-outline', label: '🚀 Rocket' },
    { value: 'rocket', label: '🚀 Rocket (Filled)' },
    { value: 'time-outline', label: '⏰ Time' },
    { value: 'time', label: '⏰ Time (Filled)' },
    { value: 'hourglass-outline', label: '⏳ Hourglass' },
    { value: 'hourglass', label: '⏳ Hourglass (Filled)' },
    
    // Quality & Premium
    { value: 'star-outline', label: '⭐ Star' },
    { value: 'star', label: '⭐ Star (Filled)' },
    { value: 'diamond-outline', label: '💎 Diamond' },
    { value: 'diamond', label: '💎 Diamond (Filled)' },
    { value: 'trophy-outline', label: '🏆 Trophy' },
    { value: 'trophy', label: '🏆 Trophy (Filled)' },
    
    // Other Services
    { value: 'car-outline', label: '🚗 Car' },
    { value: 'car', label: '🚗 Car (Filled)' },
    { value: 'home-outline', label: '🏠 Home' },
    { value: 'home', label: '🏠 Home (Filled)' },
    { value: 'business-outline', label: '🏢 Business' },
    { value: 'business', label: '🏢 Business (Filled)' },
    
    // General Icons
    { value: 'checkmark-circle-outline', label: '✅ Checkmark' },
    { value: 'checkmark-circle', label: '✅ Checkmark (Filled)' },
    { value: 'heart-outline', label: '❤️ Heart' },
    { value: 'heart', label: '❤️ Heart (Filled)' },
    { value: 'shield-outline', label: '🛡️ Shield' },
    { value: 'shield', label: '🛡️ Shield (Filled)' },
    { value: 'leaf-outline', label: '🍃 Leaf' },
    { value: 'leaf', label: '🍃 Leaf (Filled)' },
    { value: 'ribbon-outline', label: '🎀 Ribbon' },
    { value: 'ribbon', label: '🎀 Ribbon (Filled)' },
  ]

  const categories = [
    { value: 'wash', label: 'Wash' },
    { value: 'dry-clean', label: 'Dry Clean' },
    { value: 'press', label: 'Press' },
    { value: 'alterations', label: 'Alterations' },
    { value: 'express', label: 'Express' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => {
    if (selectedStore) {
      loadServices()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore])

  const loadServices = async () => {
    if (!selectedStore) return
    
    setLoading(true)
    try {
      // Show global + selected store's custom services
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .or(`is_global.eq.true,store_id.eq.${selectedStore.id}`)
        .order('is_global', { ascending: false })
        .order('sort_order')

      if (error) {
        console.error('Error loading services:', error)
        setError(`Failed to load services: ${error.message}`)
        return
      }
      
      setServices(data || [])
      setError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error loading services:', error)
      setError(`Failed to load services: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setServiceName(service.name)
      setServiceDescription(service.description || '')
      setServicePrice(service.price.toString())
      setServiceIcon(service.icon)
      setServiceCategory(service.category || 'wash')
      setIsActive(service.is_active)
    } else {
      resetForm()
    }
    setShowDialog(true)
  }

  const resetForm = () => {
    setEditingService(null)
    setServiceName('')
    setServiceDescription('')
    setServicePrice('')
    setServiceIcon('shirt-outline')
    setServiceCategory('wash')
    setIsActive(true)
  }

  const handleSave = async () => {
    if (!selectedStore) {
      await showAlert('Please select a store first')
      return
    }

    if (!serviceName || !servicePrice) {
      await showAlert('Please fill in service name and price')
      return
    }

    const price = parseFloat(servicePrice)
    if (isNaN(price) || price < 0) {
      await showAlert('Please enter a valid price')
      return
    }

    // Store owners can only edit/delete their own custom services, not global ones
    if (editingService && editingService.is_global) {
      await showAlert('You cannot edit global services. Only super admins can modify global services.')
      return
    }

    try {
      const serviceData = {
        name: serviceName,
        description: serviceDescription || null,
        price: price,
        icon: serviceIcon,
        category: serviceCategory,
        is_active: isActive,
        is_global: false, // Store owners can only create custom services
        store_id: selectedStore.id,
        sort_order: editingService ? editingService.sort_order : services.length,
      }

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id)

        if (error) throw error
        setShowDialog(false)
        resetForm()
        loadServices()
        await showAlert({ message: 'Service updated successfully', variant: 'success' })
      } else {
        const { error } = await supabase
          .from('services')
          .insert(serviceData)

        if (error) throw error
        setShowDialog(false)
        resetForm()
        loadServices()
        await showAlert({ message: 'Service created successfully', variant: 'success' })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error saving service:', error)
      await showAlert({ message: `Failed to save service: ${errorMessage}`, variant: 'error' })
    }
  }

  const handleDelete = async (service: Service) => {
    if (service.is_global) {
      await showAlert('You cannot delete global services. Only super admins can delete global services.')
      return
    }

    const confirmed = await showConfirm({
      title: 'Delete Service',
      message: `Are you sure you want to delete "${service.name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id)

      if (error) throw error
      await showAlert({ message: 'Service deleted successfully', variant: 'success' })
      loadServices()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error deleting service:', error)
      await showAlert({ message: `Failed to delete service: ${errorMessage}`, variant: 'error' })
    }
  }

  const toggleServiceStatus = async (service: Service) => {
    if (service.is_global) {
      await showAlert('You cannot modify global services. Only super admins can modify global services.')
      return
    }

    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)

      if (error) throw error
      loadServices()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error updating service status:', error)
      await showAlert({ message: `Failed to update service status: ${errorMessage}`, variant: 'error' })
    }
  }

  if (!selectedStore) {
    return (
      <Box>
        <Text>Please select a store to manage services</Text>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box>
        <Text>Loading services...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Card>
          <Flex direction="column" gap="3">
            <Text size="4" weight="bold" color="red">Error Loading Services</Text>
            <Text>{error}</Text>
            <Button onClick={loadServices}>Retry</Button>
          </Flex>
        </Card>
      </Box>
    )
  }

  const customServices = services.filter(s => !s.is_global)

  return (
    <Box>
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="start" className="flex-col sm:flex-row" gap="4">
          <Box className="flex-1 min-w-0">
            <Text size="6" weight="bold" className="block">Services & Pricing</Text>
            <Text size="2" color="gray" mt="1" className="block whitespace-normal break-words">
              Manage services for {selectedStore.name}
            </Text>
          </Box>
          <Button onClick={() => openDialog()} className="w-full sm:w-auto flex-shrink-0">
            <PlusIcon /> Add Service
          </Button>
        </Flex>

        {/* Services List */}
        <Flex direction="column" gap="3">
          {customServices.length === 0 ? (
            <Card>
              <Text color="gray">No services yet. Create one to get started.</Text>
            </Card>
          ) : (
            customServices.map(service => (
              <Card key={service.id}>
                <Flex justify="between" align="center">
                  <Flex gap="3" align="center">
                    <Badge color="green" variant="soft">
                      {selectedStore.name}
                    </Badge>
                    <Box>
                      <Flex gap="2" align="center">
                        <Text weight="bold" size="4">{service.name}</Text>
                        {!service.is_active && <Badge color="gray">Inactive</Badge>}
                      </Flex>
                      {service.description && (
                        <Text size="2" color="gray">{service.description}</Text>
                      )}
                    </Box>
                  </Flex>
                  <Flex gap="3" align="center">
                    <Text size="5" weight="bold" color="green">₱{service.price.toFixed(2)}</Text>
                    <Flex gap="2">
                      <Switch
                        checked={service.is_active}
                        onCheckedChange={() => toggleServiceStatus(service)}
                      />
                      <IconButton
                        variant="soft"
                        onClick={() => openDialog(service)}
                      >
                        <Pencil2Icon />
                      </IconButton>
                      <IconButton
                        variant="soft"
                        color="red"
                        onClick={() => handleDelete(service)}
                      >
                        <TrashIcon />
                      </IconButton>
                    </Flex>
                  </Flex>
                </Flex>
              </Card>
            ))
          )}
        </Flex>
      </Flex>

      {/* Add/Edit Dialog */}
      <Dialog.Root open={showDialog} onOpenChange={setShowDialog}>
        <Dialog.Content style={{ maxWidth: 600 }}>
          <Dialog.Title>{editingService ? 'Edit Service' : 'Add New Service'}</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            {editingService ? 'Update service details' : 'Create a service for your store'}
          </Dialog.Description>

          <Flex direction="column" gap="3">
            {/* Service Name */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">Service Name *</Text>
              <TextField.Root
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g., Wash & Fold"
              />
            </Flex>

            {/* Description */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">Description</Text>
              <TextArea
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                placeholder="Brief description of the service"
                rows={3}
              />
            </Flex>

            {/* Price */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">Price (₱) *</Text>
              <TextField.Root
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
              />
            </Flex>

            {/* Icon */}
            <Flex direction="column" gap="2">
              <Flex direction="column" gap="1">
                <Text size="2" weight="bold">Icon</Text>
                <Text size="1" color="gray">
                  Selected icon will sync with LaundroPOS Mobile app
                </Text>
              </Flex>
              <Select.Root value={serviceIcon} onValueChange={setServiceIcon}>
                <Select.Trigger>
                  <Flex align="center" gap="2">
                    <Text>{availableIcons.find(i => i.value === serviceIcon)?.label || 'Select icon'}</Text>
                  </Flex>
                </Select.Trigger>
                <Select.Content style={{ maxHeight: '300px' }}>
                  {availableIcons.map(icon => (
                    <Select.Item key={icon.value} value={icon.value}>
                      {icon.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              {serviceIcon && (
                <Text size="1" color="gray" mt="1">
                  Icon name: <Text weight="bold">{serviceIcon}</Text> (will be used in mobile app)
                </Text>
              )}
            </Flex>

            {/* Category */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">Category</Text>
              <Select.Root value={serviceCategory} onValueChange={setServiceCategory}>
                <Select.Trigger />
                <Select.Content>
                  {categories.map(cat => (
                    <Select.Item key={cat.value} value={cat.value}>
                      {cat.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            {/* Active Status */}
            <Flex align="center" gap="2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Text size="2">Service Active</Text>
            </Flex>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleSave}>
              {editingService ? 'Update Service' : 'Create Service'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  )
}

