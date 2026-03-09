'use client'

import React, { useState, useEffect } from 'react'
import { Theme } from '@radix-ui/themes'
import { Button, Card, Text, Heading, Table, Badge, Flex, TextField, Dialog } from '@radix-ui/themes'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/contexts/StoreContext'
import {
  PlusIcon,
  Pencil1Icon,
  TrashIcon,
  ArrowLeftIcon,
  PersonIcon,
} from '@radix-ui/react-icons'

const CURRENT_ORDER_STATUSES = ['pending', 'in_progress', 'ready']

interface Customer {
  id: string
  tenant_id?: string | null
  store_id?: string | null
  name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  first_name: string
  last_name: string
  customer_number?: string | null
  loyalty_points?: number | null
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

interface OrderRow {
  id: string
  order_number?: string | null
  total_amount?: number
  order_status?: string | null
  payment_status?: string | null
  created_at?: string | null
  order_items?: Array<{ service_name?: string; quantity?: number; unit_price?: number; total_price?: number }>
}

const defaultForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  address: '',
  loyalty_points: 0,
  is_active: true,
}

export default function CustomerManagement() {
  const { selectedStore } = useStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState(defaultForm)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<OrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if (selectedStore) loadCustomers()
  }, [selectedStore])

  const loadCustomers = async (): Promise<Customer[]> => {
    if (!selectedStore) return []
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      const list = data ?? []
      setCustomers(list)
      return list
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load customers')
      setCustomers([])
      return []
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerOrders = async (customerId: string) => {
    setOrdersLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          order_status,
          payment_status,
          created_at,
          order_items ( service_name, quantity, unit_price, total_price )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (err) throw err
      setCustomerOrders((data as OrderRow[]) ?? [])
    } catch {
      setCustomerOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer)
    loadCustomerOrders(customer.id)
  }

  const displayName = (c: Customer) => {
    if (c.name) return c.name
    return [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStore) return
    try {
      const payload = {
        store_id: selectedStore.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        name: [formData.first_name, formData.last_name].filter(Boolean).join(' ') || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        loyalty_points: formData.loyalty_points ?? 0,
        is_active: formData.is_active,
      }
      if (editingCustomer) {
        const { error: err } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editingCustomer.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('customers').insert([payload])
        if (err) throw err
      }
      setFormOpen(false)
      setShowForm(false)
      const wasEditingSelected = editingCustomer?.id === selectedCustomer?.id
      const editingId = editingCustomer?.id
      setEditingCustomer(null)
      setFormData(defaultForm)
      const list = await loadCustomers()
      if (wasEditingSelected && editingId) {
        const updated = list.find((c) => c.id === editingId)
        if (updated) setSelectedCustomer(updated)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save customer')
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      first_name: customer.first_name ?? '',
      last_name: customer.last_name ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      loyalty_points: customer.loyalty_points ?? 0,
      is_active: customer.is_active ?? true,
    })
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return
    try {
      const { error: err } = await supabase.from('customers').delete().eq('id', id)
      if (err) throw err
      if (selectedCustomer?.id === id) setSelectedCustomer(null)
      loadCustomers()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete customer')
    }
  }

  const currentOrders = customerOrders.filter((o) =>
    CURRENT_ORDER_STATUSES.includes((o.order_status || '').toLowerCase())
  )
  const pastOrders = customerOrders.filter(
    (o) => !CURRENT_ORDER_STATUSES.includes((o.order_status || '').toLowerCase())
  )

  if (!selectedStore) {
    return (
      <Theme appearance="light">
        <Card className="p-6">
          <Text color="gray">Select a store to manage customers.</Text>
        </Card>
      </Theme>
    )
  }

  if (selectedCustomer) {
    return (
      <Theme appearance="light">
        <div className="space-y-6">
          <Flex gap="3" align="center">
            <Button variant="ghost" onClick={() => setSelectedCustomer(null)}>
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </Button>
          </Flex>
          <Card className="p-6">
            <Flex gap="4" align="start" className="mb-6">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                <PersonIcon className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <Heading size="6">{displayName(selectedCustomer)}</Heading>
                {selectedCustomer.customer_number && (
                  <Text size="2" color="gray">#{selectedCustomer.customer_number}</Text>
                )}
                {selectedCustomer.phone && (
                  <Text size="2" className="block">Phone: {selectedCustomer.phone}</Text>
                )}
                {selectedCustomer.email && (
                  <Text size="2" className="block">Email: {selectedCustomer.email}</Text>
                )}
                {selectedCustomer.address && (
                  <Text size="2" color="gray" className="block">Address: {selectedCustomer.address}</Text>
                )}
                {selectedCustomer.loyalty_points != null && (
                  <Text size="2">Loyalty points: {selectedCustomer.loyalty_points}</Text>
                )}
                <Flex gap="2" className="mt-2">
                  <Button size="1" onClick={() => { handleEdit(selectedCustomer); setSelectedCustomer(null); setFormOpen(true); }}>
                    <Pencil1Icon className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="1" color="red" variant="soft" onClick={() => handleDelete(selectedCustomer.id)}>
                    <TrashIcon className="w-3 h-3" /> Delete
                  </Button>
                </Flex>
              </div>
            </Flex>

            <Heading size="5" className="mb-3">Current orders</Heading>
            {ordersLoading ? (
              <Text color="gray">Loading orders…</Text>
            ) : currentOrders.length === 0 ? (
              <Text color="gray">No current orders.</Text>
            ) : (
              <Table.Root className="mb-6">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Order #</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Total</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {currentOrders.map((o) => (
                    <Table.Row key={o.id}>
                      <Table.Cell>{o.order_number ?? o.id.slice(0, 8)}</Table.Cell>
                      <Table.Cell>{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</Table.Cell>
                      <Table.Cell>
                        <Badge size="1">{o.order_status ?? 'pending'}</Badge>
                      </Table.Cell>
                      <Table.Cell>{(o.total_amount ?? 0).toFixed(2)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}

            <Heading size="5" className="mb-3">Order history</Heading>
            {ordersLoading ? (
              <Text color="gray">Loading orders…</Text>
            ) : pastOrders.length === 0 ? (
              <Text color="gray">No past orders.</Text>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Order #</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Payment</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Total</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {pastOrders.map((o) => (
                    <Table.Row key={o.id}>
                      <Table.Cell>{o.order_number ?? o.id.slice(0, 8)}</Table.Cell>
                      <Table.Cell>{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</Table.Cell>
                      <Table.Cell>
                        <Badge size="1" color="gray">{o.order_status ?? '—'}</Badge>
                      </Table.Cell>
                      <Table.Cell>{o.payment_status ?? '—'}</Table.Cell>
                      <Table.Cell>{(o.total_amount ?? 0).toFixed(2)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Card>
        </div>
      </Theme>
    )
  }

  return (
    <Theme appearance="light">
      <div className="space-y-6">
        <Flex justify="between" align="center">
          <Heading size="8">Customers</Heading>
          <Button onClick={() => { setEditingCustomer(null); setFormData(defaultForm); setFormOpen(true); }}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </Flex>

        <Dialog.Root open={formOpen} onOpenChange={setFormOpen}>
          <Dialog.Content>
            <Dialog.Title>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</Dialog.Title>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <Flex gap="2" direction="column">
                <Text size="2" weight="medium">First name *</Text>
                <TextField.Root
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="First name"
                  required
                />
              </Flex>
              <Flex gap="2" direction="column">
                <Text size="2" weight="medium">Last name *</Text>
                <TextField.Root
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Last name"
                />
              </Flex>
              <Flex gap="2" direction="column">
                <Text size="2" weight="medium">Phone</Text>
                <TextField.Root
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone"
                />
              </Flex>
              <Flex gap="2" direction="column">
                <Text size="2" weight="medium">Email</Text>
                <TextField.Root
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email"
                />
              </Flex>
              <Flex gap="2" direction="column">
                <Text size="2" weight="medium">Address</Text>
                <TextField.Root
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Address"
                />
              </Flex>
              <Flex gap="2" direction="column">
                <Text size="2" weight="medium">Loyalty points</Text>
                <TextField.Root
                  type="number"
                  value={formData.loyalty_points}
                  onChange={(e) => setFormData({ ...formData, loyalty_points: parseInt(e.target.value, 10) || 0 })}
                />
              </Flex>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <Text size="2">Active</Text>
              </label>
              <Flex gap="3" className="mt-4">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">Cancel</Button>
                </Dialog.Close>
                <Button type="submit">{editingCustomer ? 'Update' : 'Create'}</Button>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>

        {error && (
          <Card className="p-4 border-red-200 bg-red-50">
            <Text color="red">{error}</Text>
          </Card>
        )}

        <Card>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Customer #</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Phone</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {loading ? (
                <Table.Row>
                  <Table.Cell colSpan={6}>
                    <Text color="gray">Loading customers…</Text>
                  </Table.Cell>
                </Table.Row>
              ) : customers.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={6}>
                    <Text color="gray">No customers. Add one to get started.</Text>
                  </Table.Cell>
                </Table.Row>
              ) : (
                customers.map((c) => (
                  <Table.Row key={c.id}>
                    <Table.Cell>
                      <button
                        type="button"
                        className="font-medium text-blue-600 hover:underline text-left"
                        onClick={() => openCustomerDetail(c)}
                      >
                        {displayName(c)}
                      </button>
                    </Table.Cell>
                    <Table.Cell>{c.customer_number ?? '—'}</Table.Cell>
                    <Table.Cell>{c.phone ?? '—'}</Table.Cell>
                    <Table.Cell>{c.email ?? '—'}</Table.Cell>
                    <Table.Cell>
                      <Badge color={c.is_active !== false ? 'green' : 'gray'}>
                        {c.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2">
                        <Button size="1" variant="outline" onClick={() => openCustomerDetail(c)}>
                          View
                        </Button>
                        <Button size="1" variant="outline" onClick={() => handleEdit(c)}>
                          <Pencil1Icon className="w-3 h-3" />
                        </Button>
                        <Button size="1" variant="outline" color="red" onClick={() => handleDelete(c.id)}>
                          <TrashIcon className="w-3 h-3" />
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Card>
      </div>
    </Theme>
  )
}
