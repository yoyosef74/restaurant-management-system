import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { subscribeToEvent, unsubscribeFromEvent } from '../services/socket';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Search, RefreshCw, Eye, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'];

export default function OrdersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', status, page],
    queryFn: () => ordersAPI.getAll({ status: status === 'all' ? undefined : status, page, limit: 20 }),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handler = () => qc.invalidateQueries(['orders']);
    subscribeToEvent('order:new', handler);
    subscribeToEvent('order:updated', handler);
    return () => { unsubscribeFromEvent('order:new', handler); unsubscribeFromEvent('order:updated', handler); };
  }, [qc]);

  const orders = data?.data?.orders || [];
  const pagination = data?.pagination || {};

  const filtered = search ? orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.table?.table_number?.toLowerCase().includes(search.toLowerCase()) ||
    `${o.customer?.first_name} ${o.customer?.last_name}`.toLowerCase().includes(search.toLowerCase())
  ) : orders;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Orders</h1>
          <p className="text-gray-400 text-sm mt-1">{pagination.total || 0} total orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost p-2"><RefreshCw size={18} /></button>
          <button onClick={() => navigate('/pos')} className="btn-primary flex items-center gap-2"><Plus size={18} />New Order</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order #, table, customer..."
            className="input pl-9" />
        </div>
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 overflow-x-auto">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={clsx('flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors',
                status === s ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-gray-200')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="table-header">Order #</th>
                <th className="table-header">Table</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Type</th>
                <th className="table-header">Items</th>
                <th className="table-header">Total</th>
                <th className="table-header">Status</th>
                <th className="table-header">Time</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-12"><LoadingSpinner /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">No orders found</td></tr>
              ) : filtered.map(order => (
                <tr key={order.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="table-cell font-mono text-brand-400 font-medium">{order.order_number}</td>
                  <td className="table-cell">{order.table?.table_number || '—'}</td>
                  <td className="table-cell">
                    {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : <span className="text-gray-600">Guest</span>}
                  </td>
                  <td className="table-cell">
                    <span className="capitalize text-xs bg-gray-800 px-2 py-1 rounded-md">{order.order_type}</span>
                  </td>
                  <td className="table-cell">{order.items?.length || 0}</td>
                  <td className="table-cell font-semibold text-gray-100">${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                  <td className="table-cell"><StatusBadge status={order.status} /></td>
                  <td className="table-cell text-gray-500 text-xs">
                    {order.created_at ? format(new Date(order.created_at), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td className="table-cell">
                    <button onClick={() => navigate(`/orders/${order.id}`)}
                      className="btn-ghost p-1.5 text-gray-400 hover:text-gray-100">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} orders
            </p>
            <div className="flex gap-2">
              <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}
                className="btn-ghost p-1.5 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}
                className="btn-ghost p-1.5 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
