import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tablesAPI, ordersAPI } from '../services/api';
import { subscribeToEvent, unsubscribeFromEvent } from '../services/socket';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { Plus, Users, Clock, RefreshCw, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const TABLE_STATUS_COLORS = {
  available: 'border-green-500/50 bg-green-500/10 hover:bg-green-500/20',
  occupied: 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20',
  reserved: 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20',
  cleaning: 'border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20',
};

const TableCard = ({ table, onClick }) => {
  const order = table.orders?.[0];
  const statusColor = TABLE_STATUS_COLORS[table.status] || 'border-gray-700 bg-gray-800';
  return (
    <button onClick={() => onClick(table)}
      className={clsx('border-2 rounded-2xl p-4 text-left transition-all w-full', statusColor)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-100 text-lg">{table.table_number}</p>
          <p className="text-xs text-gray-500">{table.section?.name}</p>
        </div>
        <StatusBadge status={table.status} />
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <Users size={12} />
        <span>{table.capacity} seats</span>
      </div>
      {order && (
        <div className="bg-black/20 rounded-lg p-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 font-medium">#{order.order_number?.split('-').pop()}</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <Clock size={10} />
            <span>{formatDistanceToNow(new Date(order.ordered_at || order.created_at), { addSuffix: true })}</span>
          </div>
          <p className="text-sm font-semibold text-gray-200 mt-1">${parseFloat(order.total_amount || 0).toFixed(2)}</p>
        </div>
      )}
    </button>
  );
};

export default function TablesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedTable, setSelectedTable] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesAPI.getAll(),
    refetchInterval: 30000,
  });
  const { data: sectionsData } = useQuery({ queryKey: ['sections'], queryFn: () => tablesAPI.getSections() });

  useEffect(() => {
    const handler = () => refetch();
    subscribeToEvent('table:updated', handler);
    subscribeToEvent('order:updated', handler);
    subscribeToEvent('order:new', handler);
    return () => {
      unsubscribeFromEvent('table:updated', handler);
      unsubscribeFromEvent('order:updated', handler);
      unsubscribeFromEvent('order:new', handler);
    };
  }, [refetch]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => tablesAPI.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['tables']); toast.success('Table status updated'); setSelectedTable(null); },
    onError: (err) => toast.error(err.message),
  });

  const tables = data?.data?.tables || [];
  const sections = sectionsData?.data?.sections || [];

  const filtered = tables.filter(t => {
    if (selectedSection !== 'all' && t.section_id !== parseInt(selectedSection)) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Tables</h1>
          <p className="text-gray-400 text-sm mt-1">
            {stats.occupied}/{stats.total} occupied · {stats.available} available · {stats.reserved} reserved
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost p-2"><RefreshCw size={18} /></button>
          <button onClick={() => navigate('/pos')} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {['all', ...sections.map(s => ({ id: s.id, name: s.name }))].map(s => {
            const id = s === 'all' ? 'all' : s.id;
            const name = s === 'all' ? 'All Sections' : s.name;
            return (
              <button key={id} onClick={() => setSelectedSection(String(id))}
                className={clsx('px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  String(selectedSection) === String(id) ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-gray-200')}>
                {name}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {['all', 'available', 'occupied', 'reserved', 'cleaning'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx('px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                statusFilter === s ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-gray-200')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(table => (
            <TableCard key={table.id} table={table} onClick={setSelectedTable} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-500">No tables found</div>
          )}
        </div>
      )}

      {/* Table Detail Modal */}
      {selectedTable && (
        <Modal isOpen={!!selectedTable} onClose={() => setSelectedTable(null)}
          title={`Table ${selectedTable.table_number}`} size="sm"
          footer={
            <div className="flex gap-2 w-full flex-wrap">
              {selectedTable.status !== 'available' && (
                <button onClick={() => updateStatusMutation.mutate({ id: selectedTable.id, status: 'available' })}
                  className="btn-secondary text-sm">Mark Available</button>
              )}
              {selectedTable.status !== 'cleaning' && (
                <button onClick={() => updateStatusMutation.mutate({ id: selectedTable.id, status: 'cleaning' })}
                  className="btn-secondary text-sm">Needs Cleaning</button>
              )}
              {selectedTable.orders?.[0] && (
                <button onClick={() => navigate(`/orders/${selectedTable.orders[0].id}`)}
                  className="btn-primary text-sm flex items-center gap-1 ml-auto">
                  View Order <ChevronRight size={14} />
                </button>
              )}
              {selectedTable.status === 'available' && (
                <button onClick={() => { navigate('/pos', { state: { tableId: selectedTable.id, tableNumber: selectedTable.table_number } }); setSelectedTable(null); }}
                  className="btn-primary text-sm flex items-center gap-1 ml-auto">
                  <Plus size={14} /> New Order
                </button>
              )}
            </div>
          }>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500">Status</p>
                <StatusBadge status={selectedTable.status} className="mt-1" />
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500">Capacity</p>
                <p className="text-gray-200 font-semibold mt-1">{selectedTable.capacity} seats</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500">Section</p>
                <p className="text-gray-200 font-semibold mt-1">{selectedTable.section?.name || '—'}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500">Shape</p>
                <p className="text-gray-200 font-semibold mt-1 capitalize">{selectedTable.shape}</p>
              </div>
            </div>
            {selectedTable.orders?.[0] && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h4 className="text-sm font-semibold text-gray-200 mb-3">Current Order</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Order #</span>
                    <span className="text-gray-200">{selectedTable.orders[0].order_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Status</span>
                    <StatusBadge status={selectedTable.orders[0].status} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Items</span>
                    <span className="text-gray-200">{selectedTable.orders[0].items?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-gray-400">Total</span>
                    <span className="text-brand-400">${parseFloat(selectedTable.orders[0].total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
