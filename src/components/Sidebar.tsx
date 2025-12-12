'use client'

import React from 'react'
import { useStore } from '@/contexts/StoreContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  PersonIcon, 
  CubeIcon, 
  FileTextIcon,
  ExitIcon,
  BoxIcon,
  BarChartIcon,
  GearIcon,
  Cross2Icon
} from '@radix-ui/react-icons'
import { Select, Text } from '@radix-ui/themes'
import PWAInstallButton from './PWAInstallButton'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isOpen: boolean
  onClose: () => void
}

const baseMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChartIcon },
  { id: 'store-profile', label: 'Store Profile', icon: GearIcon },
  { id: 'users', label: 'Users', icon: PersonIcon },
  { id: 'services', label: 'Services & Pricing', icon: CubeIcon },
  { id: 'inventory', label: 'Inventory', icon: BoxIcon },
  { id: 'orders', label: 'Orders & QR Codes', icon: FileTextIcon },
  { id: 'reports', label: 'Reports', icon: BarChartIcon },
]

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }: SidebarProps) {
  const { stores, selectedStore, setSelectedStore, loading: storesLoading } = useStore()
  const router = useRouter()

  // Check if inventory tracking is enabled for the selected store
  const hasInventoryTracking = selectedStore?.features?.inventory_tracking === true

  // Build menu items - inventory is now in baseMenuItems, but we filter it if feature is disabled
  const menuItems = hasInventoryTracking 
    ? baseMenuItems
    : baseMenuItems.filter(item => item.id !== 'inventory')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleMenuItemClick = (tab: string) => {
    onTabChange(tab)
    // Close sidebar on mobile after selecting a menu item
    if (window.innerWidth < 1024) {
      onClose()
    }
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        w-64 bg-slate-800 text-white flex flex-col h-screen fixed left-0 top-0 z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Close button for mobile */}
        <div className="lg:hidden flex justify-end p-4 border-b border-slate-700">
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors"
            aria-label="Close sidebar"
          >
            <Cross2Icon className="w-6 h-6" />
          </button>
        </div>
      {/* Logo and Header */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold mb-1">LaundroPOS</h1>
        <p className="text-sm text-slate-400">Store Owner Portal</p>
      </div>

      {/* Store Selector */}
      <div className="p-4 border-b border-slate-700">
        <Text size="2" className="text-slate-400 mb-2 block">Current Store</Text>
        {storesLoading ? (
          <Text size="2" className="text-slate-400">Loading stores...</Text>
        ) : stores.length === 0 ? (
          <Text size="2" className="text-red-400">No stores assigned</Text>
        ) : (
          <Select.Root
            value={selectedStore?.id || ''}
            onValueChange={(value) => {
              const store = stores.find(s => s.id === value)
              if (store) setSelectedStore(store)
            }}
          >
            <Select.Trigger 
              className="w-full bg-slate-700 border-slate-600 text-white"
              style={{ width: '100%' }}
            />
            <Select.Content>
              {stores.map((store) => (
                <Select.Item key={store.id} value={store.id}>
                  {store.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}
        {selectedStore && (
          <Text size="1" className="text-slate-400 mt-2 block">
            {stores.length} {stores.length === 1 ? 'store' : 'stores'} available
          </Text>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleMenuItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        <PWAInstallButton />
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          <ExitIcon className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
    </>
  )
}

