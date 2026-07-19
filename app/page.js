'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Factory } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.login(email, password)

      if (response.error) {
        toast.error(response.error)
        return
      }

      if (response.requires2FA) {
        toast.info('2FA required - Please enter your 2FA token')
        return
      }

      api.setToken(response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.user))

      toast.success(`Welcome back, ${response.user.firstName}!`)

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
    } catch (error) {
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">Manufacturing ERP</CardTitle>
          <CardDescription className="text-slate-300">
            Production Operating System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@fireplace.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-slate-300 font-semibold mb-2">Demo Credentials:</p>
            <div className="text-xs text-slate-400 space-y-1">
              <p><span className="text-blue-400">CEO:</span> ceo@fireplace.com</p>
              <p><span className="text-green-400">Sales:</span> sales@fireplace.com</p>
              <p><span className="text-purple-400">Production:</span> production@fireplace.com</p>
              <p className="text-slate-500">Password: admin123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
