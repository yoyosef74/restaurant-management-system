import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '../services/api';
import { Search, Plus, Edit2, Star, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const CustomerForm = ({ customer, onSave, loading }) => {
  const { register, handleSubmit } = useForm({ defaultValues: customer || {} });
  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">First Name *</label><input {...register('first_name', { required: true })} className="input" /></div>
        <div><label className="label">Last Name</label><input {...register('last_name')} className="input" /></div>
        <div><label className="label">Email</label><input type="email" {...register('email')} className="input" /></div>
        <div><label className="label">Phone</label><input {...register('phone')} className="input" /></div>
        <div className="col-span-2"><label className="label">Notes</label><textarea {...register('notes')} className="input h-20 resize-none" /></div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}</button>
    </form>
  );
};

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => customersAPI.getAll({ search: search || undefined, page, limit: 20 }),
  });

  const customers = data?.data?.customers || [];
  const pagination = data?.pagination || {};

  const createMutation = useMutation({
    mutationFn: (d) => customersAPI.create(d),
    onSuccess: () => { qc.invalidateQueries(['customers']); setShowModal(false); toast.success('Customer created'); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customersAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['customers']); setShowModal(false); setEditCustomer(null); toast.success('Customer updated'); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Customers</h1>
          <p className="text-gray-400 text-sm mt-1">{pagination.total || 0} registered customers</p>
        </div>
        <button onClick={() => { setEditCustomer(null); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={18} />Add Customer</button>
      </div>
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search customers..." className="input pl-9 max-w-md" />
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="table-header">Customer</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Visits</th>
                <th className="table-header">Total Spent</th>
                <th className="table-header">Loyalty Points</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? <tr><td colSpan={6} className="text-center py-12"><LoadingSpinner /></td></tr>
                : customers.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No customers found</td></tr>
                : customers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-400 text-xs font-bold">{c.first_name[0]}{c.last_name?.[0]}</span>
                        </div>
                        <span className="font-medium text-gray-200">{c.first_name} {c.last_name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-0.5">
                        {c.phone && <div className="flex items-center gap-1 text-xs text-gray-400"><Phone size={10} />{c.phone}</div>}
                        {c.email && <div className="flex items-center gap-1 text-xs text-gray-400"><Mail size={10} />{c.email}</div>}
                      </div>
                    </td>
                    <td className="table-cell text-gray-400">{c.total_visits}</td>
                    <td className="table-cell font-semibold text-gray-100">${parseFloat(c.total_spent || 0).toFixed(2)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1 text-yellow-400 font-medium">
                        <Star size={14} className="fill-yellow-400" />{c.loyalty_points}
                      </div>
                    </td>
                    <td className="table-cell">
                      <button onClick={() => { setEditCustomer(c); setShowModal(true); }} className="btn-ghost p-1.5 text-gray-400 hover:text-gray-100"><Edit2 size={15} /></button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-sm text-gray-400">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p-1)} className="btn-ghost p-1.5 disabled:opacity-40"><ChevronLeft size={16}/></button>
              <button disabled={!pagination.hasNext} onClick={() => setPage(p => p+1)} className="btn-ghost p-1.5 disabled:opacity-40"><ChevronRight size={16}/></button>
            </div>
          </div>
        )}
      </div>
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditCustomer(null); }}
        title={editCustomer ? 'Edit Customer' : 'New Customer'} size="md">
        <CustomerForm customer={editCustomer} loading={createMutation.isPending || updateMutation.isPending}
          onSave={(d) => editCustomer ? updateMutation.mutate({ id: editCustomer.id, data: d }) : createMutation.mutate(d)} />
      </Modal>
    </div>
  );
}
