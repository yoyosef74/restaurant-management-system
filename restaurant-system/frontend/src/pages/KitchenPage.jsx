import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kitchenAPI } from '../services/api';
import { subscribeToEvent, unsubscribeFromEvent } from '../services/socket';
import { clsx } from 'clsx';
import { Clock, CheckCircle, ChefHat, RefreshCw, Zap } from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import toast from 'react-hot-toast';
import StatusBadge from '../components/common/StatusBadge';

const URGENCY = (orderedAt) => {
  const mins = differenceInMinutes(new Date(), new Date(orderedAt));
  if (mins > 20) return { color: 'border-red-500 bg-red-500/5', label: 'URGENT', labelColor: 'text-red-400' };
  if (mins > 10) return { color: 'border-yellow-500 bg-yellow-500/5', label: 'HURRY', labelColor: 'text-yellow-400' };
  return { color: 'border-gray-700 bg-gray-900', label: null, labelColor: '' };
};

const KitchenOrderCard = ({ order, onItemUpdate, onOrderReady }) => {
  const urgency = URGENCY(order.ordered_at || order.created_at);
  const pendingItems = (order.items || []).filter(i => ['pending','preparing'].includes(i.status));
  const readyItems = (order.items || []).filter(i => i.status === 'ready');

  return (
    <div className={clsx('border-2 rounded-2xl overflow-hidden transition-all', urgency.color)}>
      {/* Card Header */}
      <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-bold text-gray-100 text-lg">{order.table?.table_number || 'Takeaway'}</span>
            <span className="text-xs text-gray-500">#{order.order_number?.split('-').pop()}</span>
          </div>
          <StatusBadge status={order.status} />
          {urgency.label && <span className={clsx('text-xs font-bold animate-pulse-soft', urgency.labelColor)}>{urgency.label}</span>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={12} />
            <span>{formatDistanceToNow(new Date(order.ordered_at || order.created_at), { addSuffix: true })}</span>
          </div>
          {order.waiter && <span className="text-xs text-gray-600">{order.waiter.first_name}</span>}
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2">
        {(order.items || []).map(item => (
          <div key={item.id}
            className={clsx('flex items-center gap-3 p-3 rounded-xl border transition-all',
              item.status === 'ready' ? 'border-green-500/30 bg-green-500/5 opacity-60' :
              item.status === 'preparing' ? 'border-orange-500/30 bg-orange-500/5' :
              'border-gray-700 bg-gray-800/50')}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-200 bg-gray-700 rounded px-1.5 py-0.5 min-w-[24px] text-center">{item.quantity}x</span>
                <span className="text-sm font-medium text-gray-200 truncate">{item.name}</span>
              </div>
              {item.special_instructions && (
                <p className="text-xs text-yellow-400 mt-1 italic">⚡ {item.special_instructions}</p>
              )}
              {item.modifiers?.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{item.modifiers.map(m => m.name).join(', ')}</p>
              )}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {item.status === 'pending' && (
                <button onClick={() => onItemUpdate(item.id, 'preparing')}
                  className="px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 rounded-lg text-xs text-orange-400 font-medium transition-colors">
                  Start
                </button>
              )}
              {item.status === 'preparing' && (
                <button onClick={() => onItemUpdate(item.id, 'ready')}
                  className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-xs text-green-400 font-medium transition-colors">
                  Ready ✓
                </button>
              )}
              {item.status === 'ready' && (
                <span className="px-2 py-1 text-xs text-green-400 font-medium">✓ Ready</span>
              )}
            </div>
          </div>
        ))}
        {order.kitchen_notes && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
            <p className="text-xs text-yellow-400">📝 {order.kitchen_notes}</p>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-3 pb-3">
        <button onClick={() => onOrderReady(order.id)}
          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          <CheckCircle size={16} /> Mark All Ready
        </button>
      </div>
    </div>
  );
};

export default function KitchenPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => kitchenAPI.getOrders(),
    refetchInterval: 15000,
  });
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['kitchen-stats'],
    queryFn: () => kitchenAPI.getStats(),
    refetchInterval: 10000,
  });

  useEffect(() => {
    const handler = () => { refetch(); refetchStats(); };
    subscribeToEvent('order:new', handler);
    subscribeToEvent('order:updated', handler);
    subscribeToEvent('kitchen:item_updated', handler);
    return () => {
      unsubscribeFromEvent('order:new', handler);
      unsubscribeFromEvent('order:updated', handler);
      unsubscribeFromEvent('kitchen:item_updated', handler);
    };
  }, [refetch, refetchStats]);

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, status }) => kitchenAPI.updateItemStatus(itemId, status),
    onSuccess: () => { qc.invalidateQueries(['kitchen-orders']); qc.invalidateQueries(['kitchen-stats']); },
    onError: (err) => toast.error(err.message),
  });

  const markReadyMutation = useMutation({
    mutationFn: (orderId) => kitchenAPI.markReady(orderId),
    onSuccess: () => { qc.invalidateQueries(['kitchen-orders']); toast.success('Order marked ready'); },
    onError: (err) => toast.error(err.message),
  });

  const orders = data?.data?.orders || [];
  const stats = statsData?.data || {};

  const filtered = orders.filter(o => {
    if (filter === 'pending') return o.status === 'confirmed';
    if (filter === 'preparing') return o.status === 'preparing';
    if (filter === 'ready') return o.status === 'ready';
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      {/* KDS Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <ChefHat size={20} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">Kitchen Display</h1>
              <p className="text-xs text-gray-500">Avg prep time: {stats.avg_prep_time || 0} min</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{stats.pending || 0}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400">{stats.preparing || 0}</p>
                <p className="text-xs text-gray-500">Cooking</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{stats.ready || 0}</p>
                <p className="text-xs text-gray-500">Ready</p>
              </div>
            </div>
            <button onClick={() => { refetch(); refetchStats(); }} className="btn-ghost p-2">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          {['all', 'pending', 'preparing', 'ready'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
                filter === f ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200')}>
              {f}
              {f !== 'all' && <span className="ml-1.5 text-xs opacity-70">
                ({orders.filter(o => f === 'pending' ? o.status === 'confirmed' : f === 'preparing' ? o.status === 'preparing' : o.status === 'ready').length})
              </span>}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-64 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600">
            <ChefHat size={48} className="mb-3 text-gray-800" />
            <p className="text-lg font-medium">No orders in queue</p>
            <p className="text-sm">All caught up! 🎉</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(order => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                onItemUpdate={(itemId, status) => updateItemMutation.mutate({ itemId, status })}
                onOrderReady={(orderId) => markReadyMutation.mutate(orderId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
