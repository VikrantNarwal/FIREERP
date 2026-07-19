'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Trash2, Key, Mail, AlertTriangle, Users } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

const ROLES = ['CEO', 'SALES', 'DESIGN', 'PRODUCTION', 'QC', 'INVENTORY', 'PROCUREMENT', 'ELECTRONICS', 'DISPATCH', 'SERVICE', 'ADMIN']
const DEPARTMENTS = ['Management', 'Sales', 'Design', 'Production', 'Quality Control', 'Inventory', 'Procurement', 'Electronics', 'Dispatch', 'Service', 'Administration']

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'SALES',
    department: 'Sales',
    phone: ''
  })

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const [emailData, setEmailData] = useState({
    newEmail: ''
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.firstName || !newUser.email || !newUser.password || !newUser.role) {
      toast.error('Please fill all required fields')
      return
    }

    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      await api.post('/users', newUser)
      toast.success('User created successfully!')
      setShowCreateDialog(false)
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'SALES',
        department: 'Sales',
        phone: ''
      })
      loadUsers()
    } catch (error) {
      toast.error('Failed to create user')
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill all fields')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      await api.put(`/users/${selectedUser.id}/password`, {
        password: passwordData.newPassword
      })
      toast.success('Password changed successfully!')
      setShowPasswordDialog(false)
      setPasswordData({ newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error('Failed to change password')
    }
  }

  const handleChangeEmail = async () => {
    if (!emailData.newEmail) {
      toast.error('Please enter new email')
      return
    }

    if (!emailData.newEmail.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }

    try {
      await api.put(`/users/${selectedUser.id}`, {
        email: emailData.newEmail
      })
      toast.success('Email changed successfully!')
      setShowEmailDialog(false)
      setEmailData({ newEmail: '' })
      loadUsers()
    } catch (error) {
      toast.error('Failed to change email')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      await api.delete(`/users/${selectedUser.id}`)
      toast.success(`User ${selectedUser.firstName} deleted successfully`)
      setShowDeleteDialog(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const getRoleBadgeColor = (role) => {
    const colors = {
      'CEO': 'bg-purple-500 text-white',
      'SALES': 'bg-blue-500 text-white',
      'DESIGN': 'bg-cyan-500 text-white',
      'PRODUCTION': 'bg-orange-500 text-white',
      'QC': 'bg-yellow-500 text-black',
      'INVENTORY': 'bg-green-500 text-white',
      'ADMIN': 'bg-slate-500 text-white'
    }
    return colors[role] || 'bg-slate-500 text-white'
  }

  if (loading) return <div className="text-white">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 mt-1">Create, edit, and manage system users (CEO Only)</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4" />
          Create New User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Users</p>
                <p className="text-3xl font-bold text-white">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active</p>
                <p className="text-3xl font-bold text-white">
                  {users.filter(u => u.status === 'ACTIVE').length}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Departments</p>
                <p className="text-3xl font-bold text-white">
                  {new Set(users.map(u => u.role)).size}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Inactive</p>
                <p className="text-3xl font-bold text-white">
                  {users.filter(u => u.status !== 'ACTIVE').length}
                </p>
              </div>
              <Users className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All System Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold text-lg">
                        {user.firstName} {user.lastName}
                      </h3>
                      <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                      <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </span>
                      <span>{user.department || user.role}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setSelectedUser(user)
                        setEmailData({ newEmail: user.email })
                        setShowEmailDialog(true)
                      }}
                    >
                      <Mail className="w-4 h-4" />
                      Change Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setSelectedUser(user)
                        setShowPasswordDialog(true)
                      }}
                    >
                      <Key className="w-4 h-4" />
                      Change Password
                    </Button>
                    {user.role !== 'CEO' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => {
                          setSelectedUser(user)
                          setShowDeleteDialog(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="user@fireplace.com"
              />
            </div>

            <div>
              <Label>Password * (min 6 characters)</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role *</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={newUser.department} onValueChange={(v) => setNewUser({ ...newUser, department: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="+91 1234567890"
              />
            </div>

            <Button onClick={handleCreateUser} className="w-full bg-blue-600 hover:bg-blue-700">
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Change Password for {selectedUser?.firstName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Password (min 6 characters)</Label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Button onClick={handleChangePassword} className="w-full">
              Change Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Change Email for {selectedUser?.firstName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Email</Label>
              <Input
                value={selectedUser?.email || ''}
                disabled
                className="bg-slate-800 border-slate-700 text-slate-400"
              />
            </div>
            <div>
              <Label>New Email</Label>
              <Input
                type="email"
                value={emailData.newEmail}
                onChange={(e) => setEmailData({ newEmail: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Button onClick={handleChangeEmail} className="w-full">
              Change Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-slate-400">
                <p>Are you sure you want to delete user <span className="font-semibold text-white">{selectedUser?.firstName} {selectedUser?.lastName}</span>?</p>
                <p className="mt-3">This action will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Permanently remove the user from the system</li>
                  <li>Revoke all access privileges</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
