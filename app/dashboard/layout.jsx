'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Home, Users, Package, Boxes, ClipboardCheck, Truck, BarChart3, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/')
        return
      }
      api.setToken(token)
      const response = await api.verifyToken()
      setUser(response.user)
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.clear()
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await api.logout()
    router.push('/')
    toast.success('Logged out successfully')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const roleNav = {
    CEO: [
      { label: 'Dashboard', icon: BarChart3, href: '/dashboard/ceo' },
      { label: 'Orders', icon: Package, href: '/dashboard/ceo/orders' },
      { label: 'Team', icon: Users, href: '/dashboard/ceo/team' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ],
    SALES: [
      { label: 'Orders', icon: Package, href: '/dashboard/sales' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ],
    DESIGN: [
      { label: 'Design', icon: Boxes, href: '/dashboard/design' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ],
    PRODUCTION: [
      { label: 'Production', icon: Boxes, href: '/dashboard/production' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ],
    QC: [
      { label: 'Quality', icon: ClipboardCheck, href: '/dashboard/qc' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ],
    DISPATCH: [
      { label: 'Dispatch', icon: Truck, href: '/dashboard/dispatch' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ],
    INVENTORY: [
      { label: 'Inventory', icon: Package, href: '/dashboard/inventory' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ],
    PROCUREMENT: [
      { label: 'Procurement', icon: Package, href: '/dashboard/procurement' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ],
    ELECTRONICS: [
      { label: 'Electronics', icon: Settings, href: '/dashboard/electronics' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ],
    SERVICE: [
      { label: 'Service', icon: Settings, href: '/dashboard/service' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ],
    ADMIN: [
      { label: 'Admin', icon: Settings, href: '/dashboard/admin' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ]
  }

  const navItems = roleNav[user?.role] || []

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-white">Manufacturing ERP</h1>
            <div className="flex gap-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className="text-slate-300 hover:text-white"
                    onClick={() => router.push(item.href)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
