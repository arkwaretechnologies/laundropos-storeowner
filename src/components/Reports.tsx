'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/contexts/StoreContext'
import { 
  Card, 
  Flex, 
  Text, 
  Box,
  Tabs,
  Table,
  Select,
  Heading
} from '@radix-ui/themes'
import { 
  BarChartIcon,
  PieChartIcon,
  FileTextIcon,
  CubeIcon,
  PersonIcon,
  CalendarIcon
} from '@radix-ui/react-icons'

interface Order {
  id: string
  total_amount: number
  created_at: string
  order_status: string
  payment_status?: string
  customer_id?: string
}

interface Customer {
  id?: string
  name?: string
  first_name?: string
  last_name?: string
}


interface InventoryItem {
  id: string
  name: string
  current_stock: number
  minimum_stock: number
  unit_of_measure?: string | null
  unit?: string | null
  unit_cost: number
}

interface OrderItem {
  service_name: string
  quantity: number
  unit_price: number
}

interface ReportData {
  totalSales?: number
  totalOrders?: number
  completedOrders?: number
  pendingOrders?: number
  averageOrderValue?: number
  orders?: Order[]
  statusCounts?: { [key: string]: number }
  message?: string
  totalItems?: number
  lowStockItems?: InventoryItem[]
  outOfStockItems?: InventoryItem[]
  totalValue?: number
  items?: InventoryItem[]
  totalCustomers?: number
  topCustomers?: Array<{ name: string; orderCount: number; totalSpent: number }>
  totalRevenue?: number
  services?: Array<{ name: string; quantity: number; revenue: number }>
  totalServices?: number
  paidAmount?: number
  unpaidAmount?: number
  paidOrders?: number
  unpaidOrders?: number
}

const reportSubMenus = [
  { id: 'sales', label: 'Sales Reports', icon: BarChartIcon, description: 'Daily, weekly, and monthly sales analysis' },
  { id: 'orders', label: 'Order Reports', icon: FileTextIcon, description: 'Order status, completion rates, and trends' },
  { id: 'inventory', label: 'Inventory Reports', icon: CubeIcon, description: 'Stock levels, low stock alerts, and usage' },
  { id: 'customers', label: 'Customer Reports', icon: PersonIcon, description: 'Customer activity and loyalty metrics' },
  { id: 'services', label: 'Service Reports', icon: PieChartIcon, description: 'Most popular services and performance' },
  { id: 'financial', label: 'Financial Reports', icon: CalendarIcon, description: 'Revenue, expenses, and profit analysis' },
]

export default function Reports() {
  const { selectedStore } = useStore()
  const [activeReport, setActiveReport] = useState('sales')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [dateRange, setDateRange] = useState('7d') // 7 days, 30 days, 90 days, custom

  useEffect(() => {
    if (selectedStore) {
      loadReportData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, activeReport, dateRange])

  const loadReportData = async () => {
    if (!selectedStore) return
    
    setLoading(true)
    try {
      switch (activeReport) {
        case 'sales':
          await loadSalesReport()
          break
        case 'orders':
          await loadOrderReport()
          break
        case 'inventory':
          await loadInventoryReport()
          break
        case 'customers':
          await loadCustomerReport()
          break
        case 'services':
          await loadServiceReport()
          break
        case 'financial':
          await loadFinancialReport()
          break
        default:
          setReportData(null)
      }
    } catch (error) {
      console.error('Error loading report:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    const today = new Date()
    const ranges: { [key: string]: { start: Date; end: Date } } = {
      '7d': {
        start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: today
      },
      '30d': {
        start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: today
      },
      '90d': {
        start: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        end: today
      },
      'all': {
        start: new Date(0),
        end: today
      }
    }
    return ranges[dateRange] || ranges['7d']
  }

  const loadSalesReport = async () => {
    const { start, end } = getDateRange()
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_amount, created_at, order_status')
      .eq('store_id', selectedStore!.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading sales report:', error)
      return
    }

    const totalSales = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
    const completedOrders = orders?.filter(o => o.order_status === 'completed' || o.order_status === 'picked_up').length || 0
    const pendingOrders = orders?.filter(o => o.order_status === 'pending' || o.order_status === 'in_progress').length || 0

    setReportData({
      totalSales,
      totalOrders: orders?.length || 0,
      completedOrders,
      pendingOrders,
      averageOrderValue: orders?.length ? totalSales / orders.length : 0,
      orders: orders || []
    })
  }

  const loadOrderReport = async () => {
    const { start, end } = getDateRange()
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_status, created_at, total_amount')
      .eq('store_id', selectedStore!.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (error) {
      console.error('Error loading order report:', error)
      return
    }

    const statusCounts: { [key: string]: number } = {}
    orders?.forEach(order => {
      statusCounts[order.order_status || 'unknown'] = (statusCounts[order.order_status || 'unknown'] || 0) + 1
    })

    setReportData({
      totalOrders: orders?.length || 0,
      statusCounts,
      orders: orders || []
    })
  }

  const loadInventoryReport = async () => {
    if (!selectedStore?.features?.inventory_tracking) {
      setReportData({ message: 'Inventory tracking not enabled for this store' })
      return
    }

    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('store_id', selectedStore.id)
      .eq('is_active', true)

    if (error) {
      console.error('Error loading inventory report:', error)
      return
    }

    const lowStockItems = items?.filter(item => 
      item.minimum_stock > 0 && item.current_stock <= item.minimum_stock
    ) || []

    const outOfStockItems = items?.filter(item => item.current_stock <= 0) || []

    const totalValue = items?.reduce((sum, item) => 
      sum + (item.current_stock * item.unit_cost), 0
    ) || 0

    setReportData({
      totalItems: items?.length || 0,
      lowStockItems,
      outOfStockItems,
      totalValue,
      items: items || []
    })
  }

  const loadCustomerReport = async () => {
    const { start, end } = getDateRange()
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('customer_id, customers(id, name, first_name, last_name), total_amount, created_at')
      .eq('store_id', selectedStore!.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (error) {
      console.error('Error loading customer report:', error)
      return
    }

    const customerMap = new Map<string, { name: string; orderCount: number; totalSpent: number }>()
    
    orders?.forEach((order) => {
      const customerId = order.customer_id || 'walk-in'
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers
      const customerName = customer?.name || 
        (customer?.first_name && customer?.last_name ? `${customer.first_name} ${customer.last_name}` : 'Walk-in Customer')
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, { name: customerName, orderCount: 0, totalSpent: 0 })
      }
      
      const customerData = customerMap.get(customerId)!
      customerData.orderCount++
      customerData.totalSpent += (order.total_amount || 0)
    })

    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    setReportData({
      totalCustomers: customerMap.size,
      topCustomers,
      totalRevenue: orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
    })
  }

  const loadServiceReport = async () => {
    const { start, end } = getDateRange()
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('store_id', selectedStore!.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (ordersError) {
      console.error('Error loading service report:', ordersError)
      return
    }

    const orderIds = orders?.map(o => o.id) || []
    
    if (orderIds.length === 0) {
      setReportData({ services: [], totalOrders: 0 })
      return
    }

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('service_name, quantity, unit_price')
      .in('order_id', orderIds)

    if (itemsError) {
      console.error('Error loading order items:', itemsError)
      return
    }

    const serviceMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    
    orderItems?.forEach((item: OrderItem) => {
      const serviceName = item.service_name || 'Unknown Service'
      if (!serviceMap.has(serviceName)) {
        serviceMap.set(serviceName, { name: serviceName, quantity: 0, revenue: 0 })
      }
      
      const serviceData = serviceMap.get(serviceName)!
      serviceData.quantity += item.quantity || 0
      serviceData.revenue += (item.unit_price || 0) * (item.quantity || 0)
    })

    const services = Array.from(serviceMap.values())
      .sort((a, b) => b.revenue - a.revenue)

    setReportData({
      services,
      totalOrders: orders?.length || 0,
      totalServices: services.length
    })
  }

  const loadFinancialReport = async () => {
    const { start, end } = getDateRange()
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, created_at, order_status, payment_status')
      .eq('store_id', selectedStore!.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (error) {
      console.error('Error loading financial report:', error)
      return
    }

    const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
    const paidOrders = orders?.filter(o => o.payment_status === 'paid').length || 0
    const unpaidOrders = orders?.filter(o => o.payment_status === 'pending' || !o.payment_status).length || 0
    const paidAmount = orders?.filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
    const unpaidAmount = totalRevenue - paidAmount

    setReportData({
      totalRevenue,
      paidAmount,
      unpaidAmount,
      paidOrders,
      unpaidOrders,
      totalOrders: orders?.length || 0
    })
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0)

  const renderReportContent = () => {
    if (loading) {
      return (
        <Box py="6">
          <Text>Loading report data...</Text>
        </Box>
      )
    }

    if (!reportData) {
      return (
        <Box py="6">
          <Text color="gray">No data available</Text>
        </Box>
      )
    }

    switch (activeReport) {
      case 'sales':
        return (
          <Flex direction="column" gap="4">
            <Flex gap="4" wrap="wrap">
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Total Sales</Text>
                  <Text size="6" weight="bold">{formatCurrency(reportData.totalSales || 0)}</Text>
                </Flex>
              </Card>
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Total Orders</Text>
                  <Text size="6" weight="bold">{reportData.totalOrders || 0}</Text>
                </Flex>
              </Card>
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Average Order Value</Text>
                  <Text size="6" weight="bold">{formatCurrency(reportData.averageOrderValue || 0)}</Text>
                </Flex>
              </Card>
            </Flex>
            <Card>
              <Heading size="4" mb="4">Order Status Breakdown</Heading>
              <Flex gap="4">
                <Box>
                  <Text size="2" color="gray">Completed</Text>
                  <Text size="4" weight="bold" color="green">{reportData.completedOrders || 0}</Text>
                </Box>
                <Box>
                  <Text size="2" color="gray">Pending</Text>
                  <Text size="4" weight="bold" color="orange">{reportData.pendingOrders || 0}</Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        )

      case 'orders':
        return (
          <Flex direction="column" gap="4">
            <Card>
              <Flex direction="column" gap="2">
                <Text size="2" color="gray">Total Orders</Text>
                <Text size="6" weight="bold">{reportData.totalOrders || 0}</Text>
              </Flex>
            </Card>
            <Card>
              <Heading size="4" mb="4">Orders by Status</Heading>
              <Flex direction="column" gap="2">
                {Object.entries(reportData.statusCounts || {}).map(([status, count]) => (
                  <Flex key={status} justify="between" align="center">
                    <Text>{status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                    <Text weight="bold">{count}</Text>
                  </Flex>
                ))}
              </Flex>
            </Card>
          </Flex>
        )

      case 'inventory':
        if (reportData.message) {
          return (
            <Card>
              <Text>{reportData.message}</Text>
            </Card>
          )
        }
        return (
          <Flex direction="column" gap="4">
            <Flex gap="4" wrap="wrap">
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Total Items</Text>
                  <Text size="6" weight="bold">{reportData.totalItems || 0}</Text>
                </Flex>
              </Card>
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Low Stock Items</Text>
                  <Text size="6" weight="bold" color="orange">{reportData.lowStockItems?.length || 0}</Text>
                </Flex>
              </Card>
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Out of Stock</Text>
                  <Text size="6" weight="bold" color="red">{reportData.outOfStockItems?.length || 0}</Text>
                </Flex>
              </Card>
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Total Inventory Value</Text>
                  <Text size="6" weight="bold">{formatCurrency(reportData.totalValue || 0)}</Text>
                </Flex>
              </Card>
            </Flex>
            {reportData.lowStockItems && reportData.lowStockItems.length > 0 && (
              <Card>
                <Heading size="4" mb="4">Low Stock Items</Heading>
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Product</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Current Stock</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Minimum Stock</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {reportData.lowStockItems.map((item: InventoryItem) => (
                      <Table.Row key={item.id}>
                        <Table.Cell>{item.name}</Table.Cell>
                        <Table.Cell>{item.current_stock} {item.unit_of_measure || item.unit || 'pcs'}</Table.Cell>
                        <Table.Cell>{item.minimum_stock} {item.unit_of_measure || item.unit || 'pcs'}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Card>
            )}
          </Flex>
        )

      case 'customers':
        return (
          <Flex direction="column" gap="4">
            <Flex gap="4" wrap="wrap">
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Total Customers</Text>
                  <Text size="6" weight="bold">{reportData.totalCustomers || 0}</Text>
                </Flex>
              </Card>
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Total Revenue</Text>
                  <Text size="6" weight="bold">{formatCurrency(reportData.totalRevenue || 0)}</Text>
                </Flex>
              </Card>
            </Flex>
            {reportData.topCustomers && reportData.topCustomers.length > 0 && (
              <Card>
                <Heading size="4" mb="4">Top Customers</Heading>
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Customer</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Orders</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Total Spent</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {reportData.topCustomers.map((customer, index: number) => (
                      <Table.Row key={index}>
                        <Table.Cell>{customer.name}</Table.Cell>
                        <Table.Cell>{customer.orderCount}</Table.Cell>
                        <Table.Cell>{formatCurrency(customer.totalSpent)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Card>
            )}
          </Flex>
        )

      case 'services':
        return (
          <Flex direction="column" gap="4">
            <Flex gap="4" wrap="wrap">
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Total Services Used</Text>
                  <Text size="6" weight="bold">{reportData.totalServices || 0}</Text>
                </Flex>
              </Card>
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Total Orders</Text>
                  <Text size="6" weight="bold">{reportData.totalOrders || 0}</Text>
                </Flex>
              </Card>
            </Flex>
            {reportData.services && reportData.services.length > 0 && (
              <Card>
                <Heading size="4" mb="4">Service Performance</Heading>
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Service Name</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Quantity</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Revenue</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {reportData.services.map((service, index: number) => (
                      <Table.Row key={index}>
                        <Table.Cell>{service.name}</Table.Cell>
                        <Table.Cell>{service.quantity}</Table.Cell>
                        <Table.Cell>{formatCurrency(service.revenue)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Card>
            )}
          </Flex>
        )

      case 'financial':
        return (
          <Flex direction="column" gap="4">
            <Flex gap="4" wrap="wrap">
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Total Revenue</Text>
                  <Text size="6" weight="bold">{formatCurrency(reportData.totalRevenue || 0)}</Text>
                </Flex>
              </Card>
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Paid Amount</Text>
                  <Text size="6" weight="bold" color="green">{formatCurrency(reportData.paidAmount || 0)}</Text>
                </Flex>
              </Card>
              <Card style={{ flex: 1, minWidth: 200 }}>
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">Unpaid Amount</Text>
                  <Text size="6" weight="bold" color="orange">{formatCurrency(reportData.unpaidAmount || 0)}</Text>
                </Flex>
              </Card>
            </Flex>
            <Card>
              <Heading size="4" mb="4">Payment Status</Heading>
              <Flex gap="4">
                <Box>
                  <Text size="2" color="gray">Paid Orders</Text>
                  <Text size="4" weight="bold" color="green">{reportData.paidOrders || 0}</Text>
                </Box>
                <Box>
                  <Text size="2" color="gray">Unpaid Orders</Text>
                  <Text size="4" weight="bold" color="orange">{reportData.unpaidOrders || 0}</Text>
                </Box>
                <Box>
                  <Text size="2" color="gray">Total Orders</Text>
                  <Text size="4" weight="bold">{reportData.totalOrders || 0}</Text>
                </Box>
              </Flex>
            </Card>
          </Flex>
        )

      default:
        return <Text>Select a report type</Text>
    }
  }

  if (!selectedStore) {
    return (
      <Box>
        <Text>Please select a store to view reports</Text>
      </Box>
    )
  }

  return (
    <Box>
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Box>
            <Text size="6" weight="bold">Reports</Text>
            <Text size="2" color="gray">Analytics and insights for {selectedStore.name}</Text>
          </Box>
          <Select.Root value={dateRange} onValueChange={setDateRange}>
            <Select.Trigger style={{ minWidth: 150 }} />
            <Select.Content>
              <Select.Item value="7d">Last 7 Days</Select.Item>
              <Select.Item value="30d">Last 30 Days</Select.Item>
              <Select.Item value="90d">Last 90 Days</Select.Item>
              <Select.Item value="all">All Time</Select.Item>
            </Select.Content>
          </Select.Root>
        </Flex>

        {/* Report Sub-Menus */}
        <Tabs.Root value={activeReport} onValueChange={setActiveReport}>
          <Tabs.List>
            {reportSubMenus.map((menu) => {
              const Icon = menu.icon
              return (
                <Tabs.Trigger key={menu.id} value={menu.id}>
                  <Flex align="center" gap="2">
                    <Icon />
                    <Text>{menu.label}</Text>
                  </Flex>
                </Tabs.Trigger>
              )
            })}
          </Tabs.List>

          {/* Report Content */}
          <Box pt="4">
            {reportSubMenus.map((menu) => (
              <Tabs.Content key={menu.id} value={menu.id}>
                <Card>
                  <Flex direction="column" gap="3">
                    <Box>
                      <Heading size="5">{menu.label}</Heading>
                      <Text size="2" color="gray">{menu.description}</Text>
                    </Box>
                    {renderReportContent()}
                  </Flex>
                </Card>
              </Tabs.Content>
            ))}
          </Box>
        </Tabs.Root>
      </Flex>
    </Box>
  )
}

