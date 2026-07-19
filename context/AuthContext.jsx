'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (token) {
        api.setToken(token)
        const response = await api.verifyToken()
        setUser(response.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.clear()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password)
      
      if (response.requires2FA) {
        return { requires2FA: true }
      }

      if (response.error) {
        throw new Error(response.error)
      }

      api.setToken(response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
      
      // Redirect based on role
      const roleRoutes = {
        CEO: '/dashboard/ceo',
        SALES: '/dashboard/sales',
        DESIGN: '/dashboard/design',
        PRODUCTION: '/dashboard/production',
        INVENTORY: '/dashboard/inventory',
        PROCUREMENT: '/dashboard/procurement',
        QC: '/dashboard/qc',
        ELECTRONICS: '/dashboard/electronics',
        DISPATCH: '/dashboard/dispatch',
        SERVICE: '/dashboard/service',
        ADMIN: '/dashboard/admin'
      }

      router.push(roleRoutes[response.user.role] || '/dashboard')
      return { success: true }
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    await api.logout()
    setUser(null)
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
