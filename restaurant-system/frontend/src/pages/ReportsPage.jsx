import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { format, subDays } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.name.includes('revenue') || p.name === 'total' ? `$${parseFloat(p.value || 0).toFixed(2)}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [groupBy, setGroupBy] = useState('day');

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['reports-sales', dateFrom, dateTo, groupBy],
    queryFn: () => reportsAPI.getSales({ date_from: dateFrom, date_to: dateTo, group_by: groupBy }),
  });
  const { data: itemsData } = useQuery({
    queryKey: ['reports-items', dateFrom, dateTo],
    queryFn: () => reportsAPI.getItems({ date_from: dateFrom, date_to: dateTo, limit: 10 }),
  });
  const { data: staffData } = useQuery({
    queryKey: ['reports-staff', dateFrom, dateTo],
    queryFn: () => reportsAPI.getStaff({ date_from: dateFrom, date_to: dateTo }),
  });

  const sales = salesData?.data?.sales || [];
  const summary = salesData?.data?.summary || {};
  const topItems = itemsData?.data?.items || [];
  const staff = staffData?.data?.staff || [];

  const chartData = sales.map(s => ({
    period: s.period,
    revenue: parseFloat(s.total || 0),
    orders: parseInt(s.order_count || 0),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Reports & Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Business performance overview</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-40" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-40" />
          <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="input w-32">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${parseFloat(summary.total_revenue || 0).toFixed(2)}`, color: 'text-brand-400' },
          { label: 'Total Orders', value: parseInt(summary.total_orders || 0), color: 'text-blue-400' },
          { label: 'Avg Order Value', value: `$${parseFloat(summary.avg_order || 0).toFixed(2)}`, color: 'text-green-400' },
          { label: 'Total Tips', value: `$${parseFloat(summary.total_tips || 0).toFixed(2)}`, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-gray-500 text-xs mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-100 mb-4">Revenue & Orders</h3>
        {salesLoading ? <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="period" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left" dataKey="revenue" fill="#f97316" radius={[4,4,0,0]} name="revenue" />
              <Bar yAxisId="right" dataKey="orders" fill="#3b82f6" radius={[4,4,0,0]} name="orders" opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Items */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-100 mb-4">Top Selling Items</h3>
          <div className="space-y-3">
            {topItems.slice(0, 8).map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-600 w-4">#{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-200 truncate">{item.name}</span>
                    <span className="text-sm font-semibold text-brand-400 ml-2">${parseFloat(item.total_revenue || 0).toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1">
                    <div className="bg-brand-500 h-1 rounded-full" style={{ width: `${(item.total_qty / (topItems[0]?.total_qty || 1)) * 100}%` }} />
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">{item.total_qty}x</span>
              </div>
            ))}
            {topItems.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No data for selected period</p>}
          </div>
        </div>

        {/* Staff Performance */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-100 mb-4">Staff Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                <th className="table-header pl-0">Staff</th>
                <th className="table-header">Orders</th>
                <th className="table-header">Revenue</th>
                <th className="table-header">Tips</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {staff.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">No data</td></tr>
                  : staff.map(s => (
                    <tr key={s.id} className="hover:bg-gray-800/50">
                      <td className="table-cell pl-0 font-medium text-gray-200">{s.first_name} {s.last_name}</td>
                      <td className="table-cell text-gray-400">{s.total_orders}</td>
                      <td className="table-cell font-semibold text-gray-100">${parseFloat(s.total_revenue || 0).toFixed(2)}</td>
                      <td className="table-cell text-yellow-400">${parseFloat(s.total_tips || 0).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
