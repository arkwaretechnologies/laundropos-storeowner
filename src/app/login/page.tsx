'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Theme } from '@radix-ui/themes'
import { Button, TextField, Card, Text, Heading, Separator } from '@radix-ui/themes'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { EyeOpenIcon, EyeClosedIcon, EnvelopeClosedIcon, LockClosedIcon } from '@radix-ui/react-icons'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        // Check user role and store assignments
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('email', email.trim())
          .single()

        if (userError || !userData) {
          setError('User not found in system')
          return
        }

        // Store owners can always access
        const isStoreOwner = userData.role === 'store_owner'
        
        // Cashiers should not be able to access this portal
        if (userData.role === 'cashier') {
          setError('Access denied. Cashiers cannot access the store owner portal.')
          return
        }

        // If not a store owner, check if user has store assignments
        if (!isStoreOwner) {
          const { data: assignments } = await supabase
            .from('user_store_assignments')
            .select('store_id')
            .eq('user_id', data.user.id)

          const hasStoreAssignments = assignments && assignments.length > 0

          if (!hasStoreAssignments) {
            setError('Access denied. Store owner privileges or store assignments required.')
            return
          }
        }

        // Redirect to dashboard
        router.push('/')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Theme appearance="light" accentColor="blue" grayColor="slate" radius="medium" scaling="100%">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Logo and Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center mb-4"
            >
              <img
                src="https://huwqsicrwqhxfinhpxsg.supabase.co/storage/v1/object/sign/App%20Logo/LaundroPOS%20Icon.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mZjYwNDk0MC1mNDcyLTQxNjQtOGFiNS0zZTUyZTI4ZDY4ODEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJBcHAgTG9nby9MYXVuZHJvUE9TIEljb24ucG5nIiwiaWF0IjoxNzY1NTIwNzk5LCJleHAiOjE4NTE5MjA3OTl9.w_u8T3wqIBIAjGFwZ5hWWA1rTemScSJGCMbbKYBeKnc"
                alt="LaundroPOS Logo"
                className="w-20 h-20 object-contain"
              />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-3xl font-bold text-gray-900 mb-2"
            >
              LaundroPOS
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-gray-600"
            >
              Store Owner Portal
            </motion.p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card size="4" className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <form onSubmit={handleLogin} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Heading size="6" className="text-center mb-6 text-gray-900">
                    Welcome Back
                  </Heading>
                  <Text size="2" className="text-center text-gray-600 mb-8">
                    Sign in to access your store dashboard
                  </Text>
                </motion.div>

                {/* Email Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <Text size="2" weight="medium" className="text-gray-700 mb-2">
                    Email Address
                  </Text>
                  <TextField.Root
                    size="3"
                    placeholder="owner@store.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full"
                  >
                    <TextField.Slot>
                      <EnvelopeClosedIcon className="w-4 h-4 text-gray-400" />
                    </TextField.Slot>
                  </TextField.Root>
                </motion.div>

                {/* Password Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <Text size="2" weight="medium" className="text-gray-700 mb-2">
                    Password
                  </Text>
                  <TextField.Root
                    size="3"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full"
                  >
                    <TextField.Slot>
                      <LockClosedIcon className="w-4 h-4 text-gray-400" />
                    </TextField.Slot>
                    <TextField.Slot>
                      <Button
                        type="button"
                        variant="ghost"
                        size="1"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 hover:bg-transparent"
                      >
                        {showPassword ? (
                          <EyeClosedIcon className="w-4 h-4 text-gray-400" />
                        ) : (
                          <EyeOpenIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                    </TextField.Slot>
                  </TextField.Root>
                </motion.div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-3"
                  >
                    <Text size="2" className="text-red-700">
                      {error}
                    </Text>
                  </motion.div>
                )}

                {/* Login Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                >
                  <Button
                    type="submit"
                    size="3"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    disabled={loading}
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </motion.div>

                {/* Footer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                  className="text-center"
                >
                  <Separator className="my-4" />
                  <Text size="1" className="text-gray-500">
                    Powered by ArkWare Technologies
                  </Text>
                </motion.div>
              </form>
            </Card>
          </motion.div>

          {/* Background Animation Elements */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ duration: 2, delay: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            <motion.div
              animate={{
                x: [0, 100, 0],
                y: [0, -50, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute top-20 left-20 w-32 h-32 bg-blue-200 rounded-full blur-xl"
            />
            <motion.div
              animate={{
                x: [0, -80, 0],
                y: [0, 60, 0],
                rotate: [360, 180, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute bottom-20 right-20 w-24 h-24 bg-indigo-200 rounded-full blur-xl"
            />
          </motion.div>
        </motion.div>
      </div>
    </Theme>
  )
}

export default LoginPage

