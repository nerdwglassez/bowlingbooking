'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Pencil, Plus } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Toast from '@/components/ui/Toast'

type StaffUser = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email: string
  phone?: string | null
  role: 'STAFF' | 'MANAGER' | 'ADMIN'
  createdAt: string
}

type ApiPayload = {
  users: StaffUser[]
  canEdit: boolean
  canDelete: boolean
  currentUserId: string
}

const ROLE_OPTIONS: StaffUser['role'][] = ['STAFF', 'MANAGER', 'ADMIN']

export default function StaffUserManagementPage() {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [search, setSearch] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'STAFF' as StaffUser['role'],
  })

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/staff/settings/users', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load users')
      const payload = (await response.json()) as ApiPayload
      setUsers(payload.users)
      setCanEdit(payload.canEdit)
      setCanDelete(payload.canDelete)
      setCurrentUserId(payload.currentUserId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) => {
      const haystack =
        `${user.firstName ?? ''} ${user.lastName ?? ''} ${user.email ?? ''} ${user.phone ?? ''} ${user.role}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [users, search])

  const openEditModal = (user: StaffUser) => {
    setEditingUser(user)
    setEditForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
    })
    setError(null)
    setSuccess(null)
  }

  const closeEditModal = () => {
    setEditingUser(null)
    setEditForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'STAFF',
    })
  }

  const saveUser = async () => {
    if (!editingUser) return

    setSavingUserId(editingUser.id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/staff/settings/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone,
          role: editForm.role,
        }),
      })
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || 'Failed to update user')
      }
      const payload = (await response.json()) as { user?: StaffUser }
      const updatedUser = payload.user

      if (updatedUser) {
        setUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)))
      }
      setSuccess('User updated successfully.')
      closeEditModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setSavingUserId(null)
    }
  }

  const removeUser = async (userId: string) => {
    const target = users.find((user) => user.id === userId)
    if (!target) return
    if (!confirm(`Remove ${target.email}? This action cannot be undone.`)) return

    setDeletingUserId(userId)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/staff/settings/users/${userId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || 'Failed to remove user')
      }

      setUsers((prev) => prev.filter((user) => user.id !== userId))
      setSuccess('User removed successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user')
    } finally {
      setDeletingUserId(null)
    }
  }

  return (
    <section>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">User Management</h2>
            <p className="mt-1 text-sm text-slate-500">Manage user access and permissions</p>
          </div>
          <button
            type="button"
            disabled={!canEdit}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>

        <div className="mt-6">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, phone, or role"
            className="w-full rounded-[14px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:max-w-sm"
          />
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <Toast
          message={success ?? ''}
          visible={!!success}
          onDismiss={() => setSuccess(null)}
          variant="success"
          autoDismissMs={3000}
        />

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading users...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3">User</th>
                  <th className="px-3">Email</th>
                  <th className="px-3">Phone</th>
                  <th className="px-3">Role</th>
                  <th className="px-3">Created</th>
                  <th className="px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="rounded-[14px] bg-slate-50">
                    <td className="rounded-l-[14px] px-3 py-3 font-medium text-slate-900">
                      {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{user.email}</td>
                    <td className="px-3 py-3 text-slate-600">{user.phone || 'Not provided'}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </td>
                    <td className="rounded-r-[14px] px-3 py-3">
                      {canEdit ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => openEditModal(user)}
                            className="inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-sm"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Read-only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingUser ? (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            aria-label="Close edit user modal"
            className="absolute inset-0 cursor-default"
            onClick={closeEditModal}
          />
          <div className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Edit User</h3>
            <p className="mt-1 text-sm text-slate-500">Update user information and permissions.</p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="First Name"
                value={editForm.firstName}
                onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))}
                className="rounded-[14px] border-slate-300 bg-white px-3 py-2.5"
              />
              <Input
                label="Last Name"
                value={editForm.lastName}
                onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))}
                className="rounded-[14px] border-slate-300 bg-white px-3 py-2.5"
              />
              <Input
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                className="rounded-[14px] border-slate-300 bg-white px-3 py-2.5 sm:col-span-2"
              />
              <Input
                label="Phone"
                value={editForm.phone}
                onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="rounded-[14px] border-slate-300 bg-white px-3 py-2.5"
              />
              <Select
                label="Role"
                value={editForm.role}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, role: event.target.value as StaffUser['role'] }))
                }
                className="min-h-[42px] py-2 pl-4 pr-9"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-6 flex w-full">
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void removeUser(editingUser.id)}
                  disabled={
                    !canDelete ||
                    deletingUserId === editingUser.id ||
                    (currentUserId != null && editingUser.id === currentUserId)
                  }
                  className="px-2 py-2 text-sm font-semibold text-rose-600 transition-colors hover:text-rose-700 disabled:cursor-not-allowed disabled:text-rose-300"
                >
                  Delete
                </button>
                <Button type="button" variant="secondary" onClick={closeEditModal} className="rounded-[14px] px-4 py-2.5">
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveUser()}
                  isLoading={savingUserId === editingUser.id}
                  className="rounded-[14px] px-4 py-2.5"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
