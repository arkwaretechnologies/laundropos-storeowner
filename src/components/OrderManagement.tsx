'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/contexts/StoreContext'
import { useDialog } from '@/contexts/DialogContext'
import { Button, TextField, Card, Heading, Text } from '@radix-ui/themes'
import OrderClaimStub from './OrderClaimStub'

interface OrderItem {
  service_name: string
  quantity: number
  price: number
}

interface Order {
  id: string
  order_number?: string
  customer_name: string
  created_at: string
  total_amount: number
  status: string
  payment_status?: string
  store_id?: string | null
  items: OrderItem[]
}

export default function OrderManagement() {
  const { selectedStore } = useStore()
  const { showAlert } = useDialog()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showClaimStub, setShowClaimStub] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (selectedStore) {
      loadOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore])

  const loadOrders = async () => {
    if (!selectedStore) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            service_name,
            quantity,
            unit_price,
            total_price
          ),
          customers (
            first_name,
            last_name,
            name,
            phone
          )
        `)
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Database error loading orders:', error)
        showAlert({ message: `Error loading orders: ${error.message}`, variant: 'error' })
        setOrders([])
        return
      }

      interface OrderData {
        id: string
        order_number?: string
        created_at?: string
        order_date?: string
        total_amount?: number
        order_status?: string
        payment_status?: string
        store_id?: string | null
        order_items?: Array<{
          service_name?: string
          quantity?: number
          unit_price?: number
          total_price?: number
        }>
        customers?: {
          name?: string
          first_name?: string
          last_name?: string
          phone?: string
        }
      }

      const formattedOrders: Order[] =
        data?.map((order: OrderData) => {
          const rawItems = order.order_items || []
          const normalizedItems: OrderItem[] = rawItems.map((item) => {
            const unitPrice = Number(item.unit_price || 0)
            const qty = Number(item.quantity || 1)
            return {
              service_name: item.service_name || 'Service',
              quantity: qty,
              price: unitPrice
            }
          })

          // Get customer name from joined customers table
          let customerName = 'Walk-in Customer'
          if (order.customers) {
            const customer = order.customers
            if (customer.name) {
              customerName = customer.name
            } else if (customer.first_name || customer.last_name) {
              customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
            }
          }

          return {
            id: order.id,
            order_number: order.order_number || order.id,
            customer_name: customerName,
            created_at: order.created_at || order.order_date || new Date().toISOString(),
            total_amount: Number(order.total_amount || 0),
            status: order.order_status || 'pending',
            payment_status: order.payment_status,
            store_id: order.store_id || null,
            items: normalizedItems
          }
        }) || []

      setOrders(formattedOrders)
    } catch (error) {
      console.error('Error loading orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return orders.filter(order => {
      const matchesSearch = query
        ? (order.customer_name || '').toLowerCase().includes(query) ||
          (order.order_number || '').toLowerCase().includes(query) ||
          (order.id || '').toLowerCase().includes(query)
        : true
      const matchesStatus = statusFilter === 'all' ? true : order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrder(null)
      return
    }

    setSelectedOrder((prev) => {
      if (!prev) return filteredOrders[0]
      const stillVisible = filteredOrders.find(order => order.id === prev.id)
      return stillVisible || filteredOrders[0]
    })
  }, [filteredOrders])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>()
    orders.forEach(order => {
      if (order.status) {
        statuses.add(order.status)
      }
    })
    return Array.from(statuses).sort()
  }, [orders])

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0)

  const formatStatusLabel = (status: string) => {
    if (!status) return 'Unknown'
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getStatusStyles = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      ready: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      picked_up: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }

    return map[status] || 'bg-gray-100 text-gray-800'
  }

  const handleSelectOrder = (order: Order) => {
    setShowClaimStub(false)
    setSelectedOrder(order)
  }

  const handlePrintStub = (order: Order) => {
    setSelectedOrder(order)
    setShowClaimStub(true)
  }

  if (!selectedStore) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please select a store to view orders</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-4">
        <Heading size="6" className="mb-2">Orders & QR Codes</Heading>
        <Text color="gray" size="2">
          View transactions for {selectedStore.name}, inspect line items, and print claim stubs with QR codes.
        </Text>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <TextField.Root
            placeholder="Search by customer name or order ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-3 w-full lg:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
            <Button variant="soft" onClick={() => loadOrders()}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-0 lg:col-span-2">
          <div className="border-b px-6 py-4">
            <Heading size="4">Recent Orders</Heading>
            <Text size="2" color="gray">
              Showing {filteredOrders.length} of {orders.length} orders for {selectedStore.name}
            </Text>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              {orders.length === 0
                ? 'There are no orders yet for this store.'
                : 'No orders match your current filters.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredOrders.map(order => (
                <div
                  key={order.id}
                  className={`px-6 py-4 flex flex-col gap-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    selectedOrder?.id === order.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectOrder(order)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      handleSelectOrder(order)
                    }
                  }}
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <Text className="font-medium text-gray-900">
                        {order.order_number || `#${order.id.split('-')[0]}`}
                      </Text>
                      <Text className="text-gray-600">{order.customer_name || 'Walk-in Customer'}</Text>
                      <Text className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </Text>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(order.total_amount || 0)}
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusStyles(order.status)}`}>
                        {formatStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="1"
                      variant="soft"
                      onClick={(event) => {
                        event.stopPropagation()
                        handlePrintStub(order)
                      }}
                    >
                      Print Claim Stub
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <Heading size="4" className="mb-4">Order Details</Heading>
          {!selectedOrder ? (
            <Text size="2" color="gray">
              Select an order from the list to view its details.
            </Text>
          ) : (
            <div className="space-y-4 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-mono text-gray-900">{selectedOrder.order_number || `#${selectedOrder.id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="text-gray-900">{selectedOrder.customer_name || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusStyles(selectedOrder.status)}`}>
                    {formatStatusLabel(selectedOrder.status)}
                  </span>
                </div>
              </div>

              <div>
                <Heading size="3" className="mb-3">Items</Heading>
                {selectedOrder.items.length === 0 ? (
                  <Text size="2" color="gray">No items recorded for this order.</Text>
                ) : (
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={`${item.service_name}-${index}`} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.service_name} × {item.quantity}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between text-base font-semibold text-gray-900 border-t pt-3">
                <span>Total</span>
                <span>{formatCurrency(selectedOrder.total_amount || 0)}</span>
              </div>

              <Button onClick={() => handlePrintStub(selectedOrder)}>
                Print Claim Stub
              </Button>
            </div>
          )}
        </Card>
      </div>

      {showClaimStub && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <Heading size="4">Order Claim Stub</Heading>
              <Button
                variant="soft"
                onClick={() => setShowClaimStub(false)}
              >
                Close
              </Button>
            </div>
            <div className="p-4">
              <OrderClaimStub
                orderId={selectedOrder.id}
                customerName={selectedOrder.customer_name}
                orderDate={selectedOrder.created_at}
                totalAmount={selectedOrder.total_amount}
                items={selectedOrder.items.map(item => ({
                  name: item.service_name,
                  quantity: item.quantity,
                  price: item.price
                }))}
                onPrint={() => setShowClaimStub(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

