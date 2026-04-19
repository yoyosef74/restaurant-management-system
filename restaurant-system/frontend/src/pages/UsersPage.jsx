import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../services/api';
import { Plus, Edit2, Trash2, KeyRound } from 'lucide-react';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

const UserForm = ({ user, roles, onSave, loading }) => {
  const { register, handleSubmit } = useForm({ defaultValues: user || { is_active: true } });
  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">First Name *</label><input {...register('first_name', { required: true })} className="input" /></div>
        <div><label className="label">Last Name *</label><input {...register('last_name', { required: true })} className="input" /></div>
        <div className="col-span-2"><label className="label">Email *</label><input type="email" {...register('email', { required: !user })} className="input" readOnly={!!user} /></div>
        {!user && <div className="col-span-2"><label className="label">Password *</label><input type="password" {...register('password', { required: !user, minLength: 6 })} className="input" placeholder="Min 6 characters" /></div>}
        <div><label className="label">Role *</label>
          <select {...register('role_id', { required: true })} className="input">
            <option value="">Select role</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div><label className="label">Phone</label><input {...register('phone')} className="input" /></div>
        {user && <div className="col-span-2 flex items-center gap-2"><input type="checkbox" {...register('is_active')} id="is_active" className="w-4 h-4 accent-brand-600" /><label htmlFor="is_active" className="text-sm text-gray-400 cursor-pointer">Active</label></div>}
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : user ? 'Update User' : 'Create User'}</button>
    </form>
  );
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => usersAPI.getAll() });
  const { data: rolesData } = useQuery({ queryKey: ['roles'], queryFn: () => usersAPI.getRoles() });

  const users = data?.data?.users || [];
  const roles = rolesData?.data?.roles || [];

  const createMutation = useMutation({
    mutationFn: (d) => usersAPI.create(d),
    onSuccess: () => { qc.invalidateQueries(['users']); setShowModal(false); toast.success('User created'); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['users']); setShowModal(false); setEditUser(null); toast.success('User updated'); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['users']); setDeleteUser(null); toast.success('User deactivated'); },
    onError: (err) => toast.error(err.message),
  });
  const resetMutation = useMutation({
    mutationFn: ({ id, password }) => usersAPI.resetPassword(id, { new_password: password }),
    onSuccess: () => { setResetUser(null); setNewPassword(''); toast.success('Password reset'); },
    onError: (err) => toast.error(err.message),
  });

  const ROLE_COLORS = { admin: 'bg-red-500/20 text-red-400', manager: 'bg-purple-500/20 text-purple-400', waiter: 'bg-blue-500/20 text-blue-400', kitchen: 'bg-orange-500/20 text-orange-400', cashier: 'bg-green-500/20 text-green-400' };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-100">Users & Roles</h1><p className="text-gray-400 text-sm mt-1">{users.length} staff members</p></div>
        <button onClick={() => { setEditUser(null); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={18}/>Add User</button>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="table-header">User</th>
                <th className="table-header">Email</th>
                <th className="table-header">Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Last Login</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? <tr><td colSpan={6} className="text-center py-12"><LoadingSpinner /></td></tr>
                : users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-600/20 rounded-full flex items-center justify-center">
                          <span className="text-brand-400 text-xs font-bold">{u.first_name?.[0]}{u.last_name?.[0]}</span>
                        </div>
                        <span className="font-medium text-gray-200">{u.first_name} {u.last_name}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-400">{u.email}</td>
                    <td className="table-cell">
                      <span className={clsx('badge capitalize', ROLE_COLORS[u.role?.name] || 'bg-gray-700 text-gray-400')}>{u.role?.name}</span>
                    </td>
                    <td className="table-cell">
                      <span className={clsx('badge', u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500')}>{u.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="table-cell text-gray-500 text-xs">{u.last_login ? format(new Date(u.last_login), 'MMM d, HH:mm') : 'Never'}</td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditUser(u); setShowModal(true); }} className="btn-ghost p-1.5 text-gray-400 hover:text-gray-100" title="Edit"><Edit2 size={14}/></button>
                        <button onClick={() => setResetUser(u)} className="btn-ghost p-1.5 text-gray-400 hover:text-yellow-400" title="Reset Password"><KeyRound size={14}/></button>
                        <button onClick={() => setDeleteUser(u)} className="btn-ghost p-1.5 text-red-500/60 hover:text-red-400" title="Deactivate"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditUser(null); }} title={editUser ? 'Edit User' : 'New User'} size="md">
        <UserForm user={editUser} roles={roles} loading={createMutation.isPending || updateMutation.isPending}
          onSave={(d) => editUser ? updateMutation.mutate({ id: editUser.id, data: d }) : createMutation.mutate(d)} />
      </Modal>

      <Modal isOpen={!!resetUser} onClose={() => setResetUser(null)} title={`Reset Password — ${resetUser?.first_name}`} size="sm"
        footer={<><button onClick={() => setResetUser(null)} className="btn-secondary">Cancel</button><button onClick={() => resetMutation.mutate({ id: resetUser?.id, password: newPassword })} disabled={newPassword.length < 6 || resetMutation.isPending} className="btn-primary">{resetMutation.isPending ? 'Resetting...' : 'Reset Password'}</button></>}>
        <div><label className="label">New Password (min 6 characters)</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input" placeholder="New password" /></div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteUser} onClose={() => setDeleteUser(null)} onConfirm={() => deleteMutation.mutate(deleteUser?.id)}
        danger loading={deleteMutation.isPending} title="Deactivate User" confirmText="Deactivate"
        message={`Are you sure you want to deactivate ${deleteUser?.first_name} ${deleteUser?.last_name}?`} />
    </div>
  );
}
