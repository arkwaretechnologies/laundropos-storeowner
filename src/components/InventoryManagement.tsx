'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/contexts/StoreContext'
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
  IconButton,
  Box,
  Table
} from '@radix-ui/themes'
import { PlusIcon, Pencil2Icon, TrashIcon } from '@radix-ui/react-icons'

interface InventoryItem {
  id: string
  store_id: string
  name: string
  sku?: string | null
  category?: string | null
  unit?: string | null
  current_stock: number
  minimum_stock: number
  reorder_level: number
  unit_cost: number
  is_active: boolean
  created_at: string
  updated_at: string
  low_stock_threshold?: number | null
  reorder_point?: number | null
  unit_of_measure?: string | null
  unit_price: number
}

const categories = [
  'Detergent',
  'Soap',
  'Bleach',
  'Fabric Softener',
  'Starch',
  'Supplies',
  'Other'
]

const units = [
  'pcs',
  'kg',
  'L',
  'box',
  'bottle',
  'pack'
]

export default function InventoryManagement() {
  const { selectedStore } = useStore()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [currentStock, setCurrentStock] = useState('0')
  const [minimumStock, setMinimumStock] = useState('0')
  const [reorderLevel, setReorderLevel] = useState('0')
  const [unitCost, setUnitCost] = useState('0')
  const [unitPrice, setUnitPrice] = useState('0')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (selectedStore) {
      loadItems()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore])

  const loadItems = async () => {
    if (!selectedStore) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading inventory items:', error)
        setError(`Failed to load inventory: ${error.message}`)
        return
      }
      
      setItems(data || [])
      setError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error loading inventory items:', error)
      setError(`Failed to load inventory: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item)
      setName(item.name)
      setSku(item.sku || '')
      setCategory(item.category || '')
      setUnit(item.unit_of_measure || item.unit || 'pcs')
      setCurrentStock(item.current_stock.toString())
      setMinimumStock(item.minimum_stock.toString())
      setReorderLevel(item.reorder_level.toString())
      setUnitCost(item.unit_cost.toString())
      setUnitPrice(item.unit_price.toString())
      setIsActive(item.is_active)
    } else {
      resetForm()
    }
    setShowDialog(true)
  }

  const resetForm = () => {
    setEditingItem(null)
    setName('')
    setSku('')
    setCategory('')
    setUnit('pcs')
    setCurrentStock('0')
    setMinimumStock('0')
    setReorderLevel('0')
    setUnitCost('0')
    setUnitPrice('0')
    setIsActive(true)
  }

  const handleSave = async () => {
    if (!selectedStore) {
      alert('Please select a store first')
      return
    }

    if (!name.trim()) {
      alert('Please enter a product name')
      return
    }

    try {
      const itemData = {
        store_id: selectedStore.id,
        name: name.trim(),
        sku: sku.trim() || null,
        category: category || null,
        unit: unit,
        unit_of_measure: unit,
        current_stock: parseFloat(currentStock) || 0,
        minimum_stock: parseFloat(minimumStock) || 0,
        reorder_level: parseFloat(reorderLevel) || 0,
        unit_cost: parseFloat(unitCost) || 0,
        unit_price: parseFloat(unitPrice) || 0,
        low_stock_threshold: null,
        reorder_point: null,
        is_active: isActive,
        updated_at: new Date().toISOString()
      }

      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(itemData)
          .eq('id', editingItem.id)

        if (error) throw error
        alert('Inventory item updated successfully')
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert(itemData)

        if (error) throw error
        alert('Inventory item created successfully')
      }

      setShowDialog(false)
      resetForm()
      loadItems()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error saving inventory item:', error)
      alert(`Failed to save inventory item: ${errorMessage}`)
    }
  }

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return

    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', item.id)

      if (error) throw error
      alert('Inventory item deleted successfully')
      loadItems()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error deleting inventory item:', error)
      alert(`Failed to delete inventory item: ${errorMessage}`)
    }
  }

  const toggleItemStatus = async (item: InventoryItem) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id)

      if (error) throw error
      loadItems()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error updating inventory item status:', error)
      alert(`Failed to update status: ${errorMessage}`)
    }
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock <= 0) {
      return { label: 'Out of Stock', color: 'red' }
    }
    if (item.minimum_stock > 0 && item.current_stock <= item.minimum_stock) {
      return { label: 'Low Stock', color: 'orange' }
    }
    if (item.reorder_level > 0 && item.current_stock <= item.reorder_level) {
      return { label: 'Reorder', color: 'yellow' }
    }
    return { label: 'In Stock', color: 'green' }
  }

  if (!selectedStore) {
    return (
      <Box>
        <Text>Please select a store to manage inventory</Text>
      </Box>
    )
  }

  // Check if inventory tracking is enabled for this store
  if (!selectedStore.features?.inventory_tracking) {
    return (
      <Box>
        <Card>
          <Flex direction="column" gap="3" align="center" py="6">
            <Text size="4" weight="bold">Inventory Tracking Not Enabled</Text>
            <Text size="2" color="gray" align="center">
              This feature is not enabled for {selectedStore.name}.<br />
              Please contact your administrator to enable Inventory Tracking.
            </Text>
          </Flex>
        </Card>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box>
        <Text>Loading inventory...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Card>
          <Flex direction="column" gap="3">
            <Text size="4" weight="bold" color="red">Error Loading Inventory</Text>
            <Text>{error}</Text>
            <Button onClick={loadItems}>Retry</Button>
          </Flex>
        </Card>
      </Box>
    )
  }

  return (
    <Box>
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Box>
            <Text size="6" weight="bold">Inventory Management</Text>
            <Text size="2" color="gray">Manage products and supplies for {selectedStore.name}</Text>
          </Box>
          <Button onClick={() => openDialog()}>
            <PlusIcon /> Add Product
          </Button>
        </Flex>

        {/* Inventory Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Product Name</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>SKU</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Stock</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Unit Cost</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Unit Price</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={8} className="text-center py-8">
                      <Text color="gray">No inventory items yet. Create one to get started.</Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  items.map((item) => {
                    const stockStatus = getStockStatus(item)
                    return (
                      <Table.Row key={item.id}>
                        <Table.Cell>
                          <Flex direction="column" gap="1">
                            <Text weight="bold">{item.name}</Text>
                            {!item.is_active && <Badge color="gray">Inactive</Badge>}
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2" color="gray">{item.sku || '-'}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2">{item.category || '-'}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex direction="column" gap="1">
                            <Text weight="bold">{item.current_stock} {item.unit_of_measure || item.unit || 'pcs'}</Text>
                            {item.minimum_stock > 0 && (
                              <Text size="1" color="gray">Min: {item.minimum_stock}</Text>
                            )}
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge color={stockStatus.color as 'red' | 'orange' | 'yellow' | 'green'}>{stockStatus.label}</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text>₱{item.unit_cost.toFixed(2)}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text weight="bold">₱{item.unit_price.toFixed(2)}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex gap="2">
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={() => toggleItemStatus(item)}
                            />
                            <IconButton
                              variant="soft"
                              onClick={() => openDialog(item)}
                            >
                              <Pencil2Icon />
                            </IconButton>
                            <IconButton
                              variant="soft"
                              color="red"
                              onClick={() => handleDelete(item)}
                            >
                              <TrashIcon />
                            </IconButton>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })
                )}
              </Table.Body>
            </Table.Root>
          </div>
        </Card>
      </Flex>

      {/* Add/Edit Dialog */}
      <Dialog.Root open={showDialog} onOpenChange={setShowDialog}>
        <Dialog.Content style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
          <Dialog.Title>{editingItem ? 'Edit Product' : 'Add New Product'}</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            {editingItem ? 'Update product details' : 'Add a new product to inventory'}
          </Dialog.Description>

          <Flex direction="column" gap="3">
            {/* Name */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">Product Name *</Text>
              <TextField.Root
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Liquid Detergent"
              />
            </Flex>

            {/* SKU and Category */}
            <Flex gap="3">
              <Flex direction="column" gap="2" style={{ flex: 1 }}>
                <Text size="2" weight="bold">SKU</Text>
                <TextField.Root
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g., DET-001"
                />
              </Flex>
              <Flex direction="column" gap="2" style={{ flex: 1 }}>
                <Text size="2" weight="bold">Category</Text>
                <Select.Root value={category || 'none'} onValueChange={(value) => setCategory(value === 'none' ? '' : value)}>
                  <Select.Trigger placeholder="Select category" />
                  <Select.Content>
                    <Select.Item value="none">None</Select.Item>
                    {categories.map(cat => (
                      <Select.Item key={cat} value={cat}>{cat}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Flex>

            {/* Unit */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">Unit of Measure</Text>
              <Select.Root value={unit} onValueChange={setUnit}>
                <Select.Trigger />
                <Select.Content>
                  {units.map(u => (
                    <Select.Item key={u} value={u}>{u}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            {/* Stock Levels */}
            <Flex gap="3">
              <Flex direction="column" gap="2" style={{ flex: 1 }}>
                <Text size="2" weight="bold">Current Stock</Text>
                <TextField.Root
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0"
                />
              </Flex>
              <Flex direction="column" gap="2" style={{ flex: 1 }}>
                <Text size="2" weight="bold">Minimum Stock</Text>
                <TextField.Root
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0"
                />
              </Flex>
              <Flex direction="column" gap="2" style={{ flex: 1 }}>
                <Text size="2" weight="bold">Reorder Level</Text>
                <TextField.Root
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0"
                />
              </Flex>
            </Flex>

            {/* Pricing */}
            <Flex gap="3">
              <Flex direction="column" gap="2" style={{ flex: 1 }}>
                <Text size="2" weight="bold">Unit Cost (₱)</Text>
                <TextField.Root
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </Flex>
              <Flex direction="column" gap="2" style={{ flex: 1 }}>
                <Text size="2" weight="bold">Unit Price (₱)</Text>
                <TextField.Root
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </Flex>
            </Flex>

            {/* Active Status */}
            <Flex align="center" gap="2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Text size="2">Product Active</Text>
            </Flex>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button onClick={handleSave}>
              {editingItem ? 'Update Product' : 'Create Product'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  )
}

