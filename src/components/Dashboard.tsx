'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/contexts/StoreContext'
import { 
  Card, 
  Flex, 
  Text, 
  Box,
  Table
} from '@radix-ui/themes'
import { 
  BarChartIcon,
  FileTextIcon,
  CheckIcon
} from '@radix-ui/react-icons'

interface DashboardData {
  todaySales: number
  todayOrders: number
  weekSales: number
  weekOrders: number
  monthSales: number
  monthOrders: number
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  inProgressOrders: number
  averageOrderValue: number
  recentOrders: Array<{
    id: string
    order_number?: string
    customer_name: string
    total_amount: number
    order_status: string
    created_at: string
  }>
}

export default function Dashboard() {
  const { selectedStore } = useStore()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedStore) {
      loadDashboardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'picked_up':
        return 'green'
      case 'pending':
        return 'orange'
      case 'in_progress':
        return 'blue'
      case 'cancelled':
        return 'red'
      default:
        return 'gray'
    }
  }

  const loadDashboardData = async () => {
    if (!selectedStore) return

    setLoading(true)
    setError(null)

    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // Load all orders for the store
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          created_at,
          order_status,
          customers (
            name,
            first_name,
            last_name
          )
        `)
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (ordersError) {
        throw ordersError
      }

      // Calculate today's metrics
      const todayOrders = orders?.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= todayStart
      }) || []

      const todaySales = todayOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)

      // Calculate week's metrics
      const weekOrders = orders?.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= weekStart
      }) || []

      const weekSales = weekOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)

      // Calculate month's metrics
      const monthOrders = orders?.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= monthStart
      }) || []

      const monthSales = monthOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)

      // Calculate order status counts
      const completedOrders = orders?.filter(o => 
        o.order_status === 'completed' || o.order_status === 'picked_up'
      ).length || 0

      const pendingOrders = orders?.filter(o => o.order_status === 'pending').length || 0
      const inProgressOrders = orders?.filter(o => o.order_status === 'in_progress').length || 0

      // Calculate average order value
      const totalSales = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const averageOrderValue = orders?.length ? totalSales / orders.length : 0

      // Format recent orders
      const recentOrders = (orders?.slice(0, 10) || []).map(order => {
        interface CustomerData {
          name?: string
          first_name?: string
          last_name?: string
        }
        const customer = order.customers as CustomerData | null
        let customerName = 'Walk-in Customer'
        if (customer) {
          if (customer.name) {
            customerName = customer.name
          } else if (customer.first_name || customer.last_name) {
            customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
          }
        }

        return {
          id: order.id,
          order_number: order.order_number || order.id.substring(0, 8),
          customer_name: customerName,
          total_amount: order.total_amount || 0,
          order_status: order.order_status || 'pending',
          created_at: order.created_at
        }
      })

      setDashboardData({
        todaySales,
        todayOrders: todayOrders.length,
        weekSales,
        weekOrders: weekOrders.length,
        monthSales,
        monthOrders: monthOrders.length,
        totalOrders: orders?.length || 0,
        completedOrders,
        pendingOrders,
        inProgressOrders,
        averageOrderValue,
        recentOrders
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error loading dashboard data:', error)
      setError(`Failed to load dashboard data: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedStore) {
    return (
      <Box>
        <Card>
          <Flex direction="column" gap="3">
            <Text size="4" weight="bold">Dashboard</Text>
            <Text color="gray">Please select a store to view dashboard</Text>
          </Flex>
        </Card>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box>
        <Flex direction="column" gap="4" align="center" py="8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <Text color="gray">Loading dashboard...</Text>
        </Flex>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Card>
          <Flex direction="column" gap="3">
            <Text size="4" weight="bold" color="red">Error</Text>
            <Text color="red">{error}</Text>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </Flex>
        </Card>
      </Box>
    )
  }

  if (!dashboardData) {
    return null
  }

  return (
    <Box>
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="start" className="flex-col sm:flex-row" gap="4">
          <Box className="flex-1 min-w-0">
            <Text size="6" weight="bold" className="block">Dashboard</Text>
            <Text size="2" color="gray" mt="1" className="block whitespace-normal">
              Sales overview for {selectedStore.name}
            </Text>
          </Box>
        </Flex>

        {/* Sales Overview Cards */}
        <Flex direction="column" gap="4">
          <Flex direction={{ initial: 'column', sm: 'row' }} gap="4" wrap="wrap">
            {/* Today's Sales */}
            <Card className="flex-1 min-w-[200px]">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <BarChartIcon className="w-5 h-5 text-blue-600" />
                  <Text size="2" color="gray">Today&apos;s Sales</Text>
                </Flex>
                <Text size="6" weight="bold" color="blue">
                  {formatCurrency(dashboardData.todaySales)}
                </Text>
                <Text size="1" color="gray">
                  {dashboardData.todayOrders} {dashboardData.todayOrders === 1 ? 'order' : 'orders'} today
                </Text>
              </Flex>
            </Card>

            {/* This Week's Sales */}
            <Card className="flex-1 min-w-[200px]">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <BarChartIcon className="w-5 h-5 text-green-600" />
                  <Text size="2" color="gray">This Week</Text>
                </Flex>
                <Text size="6" weight="bold" color="green">
                  {formatCurrency(dashboardData.weekSales)}
                </Text>
                <Text size="1" color="gray">
                  {dashboardData.weekOrders} {dashboardData.weekOrders === 1 ? 'order' : 'orders'}
                </Text>
              </Flex>
            </Card>

            {/* This Month's Sales */}
            <Card className="flex-1 min-w-[200px]">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <BarChartIcon className="w-5 h-5 text-purple-600" />
                  <Text size="2" color="gray">This Month</Text>
                </Flex>
                <Text size="6" weight="bold" color="purple">
                  {formatCurrency(dashboardData.monthSales)}
                </Text>
                <Text size="1" color="gray">
                  {dashboardData.monthOrders} {dashboardData.monthOrders === 1 ? 'order' : 'orders'}
                </Text>
              </Flex>
            </Card>

            {/* Average Order Value */}
            <Card className="flex-1 min-w-[200px]">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <BarChartIcon className="w-5 h-5 text-orange-600" />
                  <Text size="2" color="gray">Avg Order Value</Text>
                </Flex>
                <Text size="6" weight="bold" color="orange">
                  {formatCurrency(dashboardData.averageOrderValue)}
                </Text>
                <Text size="1" color="gray">
                  Across all orders
                </Text>
              </Flex>
            </Card>
          </Flex>

          {/* Order Status Cards */}
          <Flex direction={{ initial: 'column', sm: 'row' }} gap="4" wrap="wrap">
            <Card className="flex-1 min-w-[150px]">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CheckIcon className="w-5 h-5 text-green-600" />
                  <Text size="2" color="gray">Completed</Text>
                </Flex>
                <Text size="5" weight="bold" color="green">
                  {dashboardData.completedOrders}
                </Text>
              </Flex>
            </Card>

            <Card className="flex-1 min-w-[150px]">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <FileTextIcon className="w-5 h-5 text-orange-600" />
                  <Text size="2" color="gray">Pending</Text>
                </Flex>
                <Text size="5" weight="bold" color="orange">
                  {dashboardData.pendingOrders}
                </Text>
              </Flex>
            </Card>

            <Card className="flex-1 min-w-[150px]">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <FileTextIcon className="w-5 h-5 text-blue-600" />
                  <Text size="2" color="gray">In Progress</Text>
                </Flex>
                <Text size="5" weight="bold" color="blue">
                  {dashboardData.inProgressOrders}
                </Text>
              </Flex>
            </Card>

            <Card className="flex-1 min-w-[150px]">
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <FileTextIcon className="w-5 h-5 text-gray-600" />
                  <Text size="2" color="gray">Total Orders</Text>
                </Flex>
                <Text size="5" weight="bold">
                  {dashboardData.totalOrders}
                </Text>
              </Flex>
            </Card>
          </Flex>
        </Flex>

        {/* Recent Orders */}
        <Card>
          <Flex direction="column" gap="4">
            <Text size="5" weight="bold">Recent Orders</Text>
            {dashboardData.recentOrders.length === 0 ? (
              <Box py="4">
                <Text color="gray" align="center">
                  No recent orders
                </Text>
              </Box>
            ) : (
              <div className="overflow-x-auto">
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Order #</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Customer</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {dashboardData.recentOrders.map((order) => (
                      <Table.Row key={order.id}>
                        <Table.Cell>
                          <Text weight="medium">{order.order_number}</Text>
                        </Table.Cell>
                        <Table.Cell>{order.customer_name}</Table.Cell>
                        <Table.Cell>
                          <Text weight="medium">{formatCurrency(order.total_amount)}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text 
                            size="2" 
                            weight="medium"
                            style={{ 
                              textTransform: 'capitalize',
                              color: getStatusColor(order.order_status) === 'green' ? '#22c55e' :
                                     getStatusColor(order.order_status) === 'orange' ? '#f97316' :
                                     getStatusColor(order.order_status) === 'blue' ? '#3b82f6' :
                                     getStatusColor(order.order_status) === 'red' ? '#ef4444' : '#6b7280'
                            }}
                          >
                            {order.order_status.replace('_', ' ')}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2" color="gray">
                            {formatDate(order.created_at)}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </div>
            )}
          </Flex>
        </Card>
      </Flex>
    </Box>
  )
}

