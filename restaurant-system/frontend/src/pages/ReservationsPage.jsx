import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsAPI, tablesAPI, customersAPI } from '../services/api';
import { Plus, Calendar, Users, X } from 'lucide-react';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function ReservationsPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showModal, setShowModal] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', date],
    queryFn: () => reservationsAPI.getAll({ date }),
  });
  const { data: tablesData } = useQuery({ queryKey: ['tables-all'], queryFn: () => tablesAPI.getAll() });
  const { data: customersData } = useQuery({ queryKey: ['customers-list'], queryFn: () => customersAPI.getAll({ limit: 100 }) });

  const reservations = data?.data?.reservations || [];
  const tables = tablesData?.data?.tables || [];
  const customers = customersData?.data?.customers || [];

  const createMutation = useMutation({
    mutationFn: (d) => reservationsAPI.create(d),
    onSuccess: () => { qc.invalidateQueries(['reservations']); setShowModal(false); reset(); toast.success('Reservation created'); },
    onError: (err) => toast.error(err.message),
  });
  const cancelMutation = useMutation({
    mutationFn: (id) => reservationsAPI.cancel(id),
    onSuccess: () => { qc.invalidateQueries(['reservations']); toast.success('Reservation cancelled'); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => reservationsAPI.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries(['reservations']); toast.success('Status updated'); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Reservations</h1>
          <p className="text-gray-400 text-sm mt-1">{reservations.length} reservations for {format(new Date(date + 'T12:00:00'), 'MMM d, yyyy')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} />New Reservation</button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Calendar size={18} className="text-gray-500" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-48" />
      </div>

      <div className="space-y-3">
        {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner /></div>
          : reservations.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Calendar size={40} className="mx-auto mb-3 text-gray-800" />
              <p>No reservations for this date</p>
            </div>
          ) : reservations.map(r => (
            <div key={r.id} className="card p-4 flex items-center gap-4">
              <div className="text-center w-16 flex-shrink-0">
                <p className="text-xl font-bold text-brand-400">{r.reservation_time?.slice(0,5)}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-200">{r.customer?.first_name} {r.customer?.last_name}</p>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Users size={12} />{r.party_size} guests</span>
                  {r.table && <span>Table {r.table.table_number}</span>}
                  <span>{r.duration_minutes} min</span>
                </div>
                {r.special_requests && <p className="text-xs text-yellow-400 mt-1 italic">📝 {r.special_requests}</p>}
              </div>
              <div className="flex gap-2">
                {r.status === 'confirmed' && (
                  <button onClick={() => updateMutation.mutate({ id: r.id, status: 'seated' })}
                    className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-xs text-green-400 font-medium">
                    Seat
                  </button>
                )}
                {['confirmed','pending'].includes(r.status) && (
                  <button onClick={() => cancelMutation.mutate(r.id)}
                    className="p-1.5 text-red-500/60 hover:text-red-400 transition-colors"><X size={16} /></button>
                )}
              </div>
            </div>
          ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Reservation" size="md"
        footer={<button form="res-form" type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Reservation'}</button>}>
        <form id="res-form" onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Customer</label>
            <select {...register('customer_id')} className="input">
              <option value="">Walk-in / No Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} — {c.phone || c.email}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Date *</label><input type="date" {...register('reservation_date', { required: true })} defaultValue={date} className="input" /></div>
            <div><label className="label">Time *</label><input type="time" {...register('reservation_time', { required: true })} className="input" /></div>
            <div><label className="label">Party Size *</label><input type="number" min="1" max="50" {...register('party_size', { required: true })} className="input" placeholder="2" /></div>
            <div><label className="label">Table</label>
              <select {...register('table_id')} className="input">
                <option value="">Auto-assign</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.table_number} ({t.capacity} seats)</option>)}
              </select>
            </div>
            <div><label className="label">Duration (min)</label><input type="number" {...register('duration_minutes')} defaultValue={90} className="input" /></div>
          </div>
          <div><label className="label">Special Requests</label><textarea {...register('special_requests')} className="input h-20 resize-none" placeholder="Allergies, celebrations, seating preferences..." /></div>
        </form>
      </Modal>
    </div>
  );
}
