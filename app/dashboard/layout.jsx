'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, Home, Users, Package, Boxes, ClipboardCheck, Truck, BarChart3, Settings, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
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
      { label: 'Users', icon: Users, href: '/dashboard/ceo/users' },
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
      { label: 'Orders', icon: Package, href: '/dashboard/admin/orders' },
      { label: 'Products', icon: Package, href: '/dashboard/admin/products' },
      { label: 'Profile', icon: Users, href: '/dashboard/profile' }
    ]
  }

  const navItems = roleNav[user?.role] || []

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-4 lg:gap-6 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Flame className="w-6 h-6 text-orange-500" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 leading-tight">
                  FIRE ERP
                </h1>
                <a
                  href="https://cbfproduction.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:block text-xs text-orange-400 hover:text-orange-300 transition-colors cursor-pointer hover:underline"
                >
                  cbfproduction.com
                </a>
              </div>
            </div>
            {/* Desktop / tablet nav */}
            <div className="hidden md:flex gap-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={`hover:text-white ${active ? 'text-white bg-slate-800' : 'text-slate-300'}`}
                    onClick={() => router.push(item.href)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="text-right min-w-0">
              <p className="text-xs sm:text-sm font-medium text-white truncate max-w-[110px] sm:max-w-none">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] sm:text-xs text-slate-400">{user?.role}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              aria-label="Logout"
              className="border-slate-700 text-slate-300 hover:text-white px-2 sm:px-3"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Phone nav: scrollable tab strip under the top bar */}
        <div className="md:hidden flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium shrink-0 ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
      <main className="p-3 sm:p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
