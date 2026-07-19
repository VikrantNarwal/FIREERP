'use client'

import { useState, useEffect } from 'react'
import { User, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      setUser(userData)
      setProfile({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.phone || ''
      })
    } catch (error) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      // Update user via API
      const response = await api.put(`/users/${user.id}`, profile)
      
      // Update local storage
      const updatedUser = { ...user, ...profile }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      toast.success('Profile updated successfully!')
      toast.info('Please refresh page to see changes in header')
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Update your personal information</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Email</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="bg-slate-800 border-slate-700 text-slate-400"
            />
            <p className="text-xs text-slate-500">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Role</Label>
            <Input
              value={user?.role || ''}
              disabled
              className="bg-slate-800 border-slate-700 text-slate-400"
            />
            <p className="text-xs text-slate-500">Role is assigned by admin</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">First Name</Label>
              <Input
                value={profile.firstName}
                onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                placeholder="Enter first name"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Last Name</Label>
              <Input
                value={profile.lastName}
                onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                placeholder="Enter last name"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Phone Number</Label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile({...profile, phone: e.target.value})}
              placeholder="Enter phone number"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
