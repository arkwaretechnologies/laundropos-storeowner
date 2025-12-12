'use client'

import React from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@radix-ui/themes'

interface OrderClaimStubProps {
  orderId: string
  customerName: string
  orderDate: string
  totalAmount: number
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  onPrint?: () => void
}

export default function OrderClaimStub({
  orderId,
  customerName,
  orderDate,
  totalAmount,
  items,
  onPrint
}: OrderClaimStubProps) {
  const handlePrint = () => {
    window.print()
    onPrint?.()
  }

  const qrData = JSON.stringify({
    orderId,
    type: 'order_claim',
    timestamp: new Date().toISOString()
  })

  return (
    <div className="max-w-md mx-auto bg-white p-6 border border-gray-200 rounded-lg shadow-sm print:shadow-none print:border-none">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">LaundroPOS</h2>
        <h3 className="text-lg font-semibold text-gray-600">Order Claim Stub</h3>
      </div>

      {/* Order Details */}
      <div className="mb-6 space-y-3">
        <div className="flex justify-between">
          <span className="font-medium text-gray-600">Order ID:</span>
          <span className="font-mono text-gray-800">#{orderId}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-gray-600">Customer:</span>
          <span className="text-gray-800">{customerName}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-gray-600">Date:</span>
          <span className="text-gray-800">{new Date(orderDate).toLocaleDateString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-gray-600">Time:</span>
          <span className="text-gray-800">{new Date(orderDate).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Items */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Items:</h4>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600">{item.name} x{item.quantity}</span>
              <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="border-t pt-4 mb-6">
        <div className="flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span>₱{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* QR Code */}
      <div className="text-center mb-6">
        <div className="inline-block p-4 bg-gray-50 rounded-lg">
          <QRCode
            value={qrData}
            size={150}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 150 150`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Scan to verify order details
        </p>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-600 mb-6">
        <p className="font-medium">Please keep this receipt</p>
        <p>Present this QR code when picking up your order</p>
      </div>

      {/* Print Button */}
      <div className="text-center">
        <Button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          Print Claim Stub
        </Button>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:border-none,
          .print\\:shadow-none *,
          .print\\:border-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}


