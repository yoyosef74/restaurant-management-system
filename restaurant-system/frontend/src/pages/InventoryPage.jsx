import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryAPI } from '../services/api';
import { Plus, AlertTriangle, TrendingDown, Package, Search, Edit2, ArrowUpDown } from 'lucide-react';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const AdjustForm = ({ item, onSave, loading }) => {
  const { register, handleSubmit, watch } = useForm({ defaultValues: { transaction_type: 'purchase', quantity: '', notes: '' } });
  const txType = watch('transaction_type');
  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="bg-gray-800 rounded-xl p-3 mb-2">
        <p className="text-sm font-medium text-gray-200">{item?.name}</p>
        <p className="text-xs text-gray-500">Current stock: {item?.current_stock} {item?.unit}</p>
      </div>
      <div>
        <label className="label">Transaction Type</label>
        <select {...register('transaction_type', { required: true })} className="input">
          <option value="purchase">Purchase / Restock</option>
          <option value="consumption">Consumption</option>
          <option value="waste">Waste / Spoilage</option>
          <option value="adjustment">Manual Adjustment</option>
        </select>
      </div>
      <div>
        <label className="label">Quantity ({item?.unit}) *</label>
        <input type="number" step="0.001" min="0.001" {...register('quantity', { required: true, min: 0.001 })} className="input" placeholder="0.000" />
      </div>
      {txType === 'purchase' && (
        <div>
          <label className="label">Unit Cost ($)</label>
          <input type="number" step="0.0001" {...register('unit_cost')} className="input" placeholder="0.0000" />
        </div>
      )}
      <div>
        <label className="label">Notes</label>
        <textarea {...register('notes')} className="input h-20 resize-none" placeholder="Optional notes..." />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Saving...' : 'Record Transaction'}
      </button>
    </form>
  );
};

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [adjustItem, setAdjustItem] = useState(null);
  const [page, setPage] = useState(1);
  const [showLowOnly, setShowLowOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, category, page, showLowOnly],
    queryFn: () => inventoryAPI.getItems({ search: search || undefined, category_id: category || undefined, page, limit: 30, low_stock: showLowOnly || undefined }),
  });
  const { data: categoriesData } = useQuery({ queryKey: ['inv-categories'], queryFn: () => inventoryAPI.getCategories() });
  const { data: lowStockData } = useQuery({ queryKey: ['low-stock'], queryFn: () => inventoryAPI.getLowStock() });

  const items = data?.data || [];
  const pagination = data?.pagination || {};
  const categories = categoriesData?.data?.categories || [];
  const lowStockItems = lowStockData?.data?.items || [];

  const adjustMutation = useMutation({
    mutationFn: (data) => inventoryAPI.adjustStock(data),
    onSuccess: () => { qc.invalidateQueries(['inventory']); qc.invalidateQueries(['low-stock']); setAdjustItem(null); toast.success('Stock adjusted'); },
    onError: (err) => toast.error(err.message),
  });

  const stockLevel = (item) => {
    const pct = item.maximum_stock > 0 ? (item.current_stock / item.maximum_stock) * 100 : 0;
    if (item.current_stock <= item.reorder_point) return { color: 'bg-red-500', pct, label: 'low' };
    if (pct < 50) return { color: 'bg-yellow-500', pct, label: 'medium' };
    return { color: 'bg-green-500', pct, label: 'ok' };
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Inventory</h1>
          <p className="text-gray-400 text-sm mt-1">{lowStockItems.length} items need restocking</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-400" />
            <span className="font-semibold text-red-400">Low Stock Alerts ({lowStockItems.length} items)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.slice(0, 8).map(item => (
              <button key={item.id} onClick={() => setAdjustItem(item)}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg px-3 py-1.5 text-sm text-red-300 transition-colors">
                {item.name} — {item.current_stock} {item.unit} left
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search inventory..." className="input pl-9" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="input sm:w-48">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => setShowLowOnly(v => !v)}
          className={clsx('px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2',
            showLowOnly ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400')}>
          <TrendingDown size={16} /> Low Stock Only
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="table-header">Item</th>
                <th className="table-header">Category</th>
                <th className="table-header">Stock Level</th>
                <th className="table-header">Current</th>
                <th className="table-header">Reorder Point</th>
                <th className="table-header">Unit Cost</th>
                <th className="table-header">Value</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? <tr><td colSpan={8} className="text-center py-12"><LoadingSpinner /></td></tr>
                : items.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">No items found</td></tr>
                : items.map(item => {
                    const level = stockLevel(item);
                    const value = (item.current_stock * item.cost_per_unit).toFixed(2);
                    return (
                      <tr key={item.id} className={clsx('hover:bg-gray-800/50 transition-colors', level.label === 'low' && 'bg-red-500/3')}>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            {level.label === 'low' && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                            <div>
                              <p className="font-medium text-gray-200">{item.name}</p>
                              {item.sku && <p className="text-xs text-gray-600">{item.sku}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell text-gray-400">{item.category?.name || '—'}</td>
                        <td className="table-cell">
                          <div className="w-24">
                            <div className="w-full bg-gray-800 rounded-full h-1.5">
                              <div className={clsx('h-1.5 rounded-full transition-all', level.color)}
                                style={{ width: `${Math.min(100, level.pct)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={clsx('font-semibold', level.label === 'low' ? 'text-red-400' : 'text-gray-100')}>
                            {item.current_stock} <span className="text-gray-500 font-normal text-xs">{item.unit}</span>
                          </span>
                        </td>
                        <td className="table-cell text-gray-400">{item.reorder_point} {item.unit}</td>
                        <td className="table-cell text-gray-400">${parseFloat(item.cost_per_unit || 0).toFixed(4)}</td>
                        <td className="table-cell font-medium text-gray-200">${value}</td>
                        <td className="table-cell">
                          <button onClick={() => setAdjustItem(item)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 border border-brand-600/30 rounded-lg text-xs text-brand-400 font-medium transition-colors">
                            <ArrowUpDown size={12} /> Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      <Modal isOpen={!!adjustItem} onClose={() => setAdjustItem(null)} title="Adjust Stock" size="sm">
        {adjustItem && <AdjustForm item={adjustItem} loading={adjustMutation.isPending}
          onSave={(data) => adjustMutation.mutate({ item_id: adjustItem.id, ...data })} />}
      </Modal>
    </div>
  );
}
