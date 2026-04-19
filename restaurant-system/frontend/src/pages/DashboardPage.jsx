import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI, reportsAPI } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Users, Table2, AlertTriangle, ChefHat } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { subscribeToEvent, unsubscribeFromEvent } from '../services/socket';
import { useQueryClient } from '@tanstack/react-query';

const StatCard = ({ label, value, sub, icon: Icon, trend, color = 'brand' }) => {
  const colors = {
    brand: { bg: 'bg-brand-600/20', icon: 'text-brand-400', border: 'border-brand-600/20' },
    green: { bg: 'bg-green-600/20', icon: 'text-green-400', border: 'border-green-600/20' },
    blue: { bg: 'bg-blue-600/20', icon: 'text-blue-400', border: 'border-blue-600/20' },
    red: { bg: 'bg-red-600/20', icon: 'text-red-400', border: 'border-red-600/20' },
    purple: { bg: 'bg-purple-600/20', icon: 'text-purple-400', border: 'border-purple-600/20' },
  };
  const c = colors[color] || colors.brand;
  return (
    <div className={`card p-5 border ${c.border}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className={c.icon} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${parseFloat(trend) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {parseFloat(trend) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-100 mb-1">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.name === 'revenue' ? `$${parseFloat(p.value).toFixed(2)}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats(),
    refetchInterval: 60000,
  });
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['dashboard-reports'],
    queryFn: () => reportsAPI.getDashboard(),
  });

  useEffect(() => {
    const handler = () => refetch();
    subscribeToEvent('order:updated', handler);
    subscribeToEvent('order:new', handler);
    return () => {
      unsubscribeFromEvent('order:updated', handler);
      unsubscribeFromEvent('order:new', handler);
    };
  }, [refetch]);

  if (statsLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner size={32} /></div>;

  const s = stats?.data;
  const r = reports?.data;

  const chartData = (s?.chart || []).map(d => ({
    date: format(parseISO(d.date), 'MMM dd'),
    revenue: parseFloat(d.revenue || 0),
    orders: parseInt(d.orders || 0),
  }));

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ef4444'];

  const tableData = r?.table_stats || [];
  const paymentData = (r?.payment_breakdown || []).map(p => ({
    name: p.payment_method,
    value: parseFloat(p.total || 0),
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Real-time restaurant performance overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Revenue" value={`$${parseFloat(s?.revenue?.today || 0).toFixed(2)}`}
          icon={DollarSign} color="brand" trend={s?.revenue?.change} sub="vs yesterday" />
        <StatCard label="Orders Today" value={s?.orders?.today || 0}
          icon={ShoppingBag} color="blue" sub={`${s?.orders?.active || 0} active now`} />
        <StatCard label="Table Occupancy" value={`${s?.tables?.occupancy || 0}%`}
          icon={Table2} color="green" sub={`${s?.tables?.occupied}/${s?.tables?.total} occupied`} />
        <StatCard label="Low Stock Alerts" value={s?.alerts?.low_stock || 0}
          icon={AlertTriangle} color={s?.alerts?.low_stock > 0 ? 'red' : 'green'}
          sub={s?.alerts?.new_customers ? `${s.alerts.new_customers} new customers` : 'inventory'} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-100 mb-4">Revenue — Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="url(#revGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-100 mb-4">Payment Methods</h3>
          {paymentData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    dataKey="value" stroke="none">
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `$${parseFloat(v).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {paymentData.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-400 capitalize">{p.name}</span>
                    </div>
                    <span className="text-gray-200 font-medium">${p.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-gray-500 text-sm text-center py-12">No payments today yet</p>}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-100 mb-4">Top Selling Items Today</h3>
          {r?.top_items?.length > 0 ? (
            <div className="space-y-3">
              {r.top_items.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-4">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-200">{item.name}</span>
                      <span className="text-sm font-semibold text-brand-400">${parseFloat(item.revenue || 0).toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full"
                        style={{ width: `${(item.quantity / (r.top_items[0]?.quantity || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.quantity}x</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm text-center py-8">No sales data today</p>}
        </div>

        {/* Table Status */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-100 mb-4">Table Status Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Available', status: 'available', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              { label: 'Occupied', status: 'occupied', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
              { label: 'Reserved', status: 'reserved', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'Cleaning', status: 'cleaning', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
            ].map(({ label, status, color, bg }) => {
              const count = tableData.find(t => t.status === status)?.count || 0;
              return (
                <div key={status} className={`border rounded-xl p-4 ${bg}`}>
                  <p className={`text-2xl font-bold ${color}`}>{count}</p>
                  <p className="text-gray-400 text-sm">{label}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Active Orders</span>
              <span className="text-brand-400 font-semibold">{s?.orders?.active || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
