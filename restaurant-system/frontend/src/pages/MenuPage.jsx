import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuAPI } from '../services/api';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, Star } from 'lucide-react';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const ItemForm = ({ item, categories, onSave, loading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: item || {} });
  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Item Name *</label>
          <input {...register('name', { required: true })} className="input" placeholder="Spaghetti Carbonara" />
        </div>
        <div>
          <label className="label">Category *</label>
          <select {...register('category_id', { required: true })} className="input">
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">SKU</label>
          <input {...register('sku')} className="input" placeholder="PAS001" />
        </div>
        <div>
          <label className="label">Price *</label>
          <input type="number" step="0.01" {...register('price', { required: true, min: 0 })} className="input" placeholder="0.00" />
        </div>
        <div>
          <label className="label">Cost</label>
          <input type="number" step="0.01" {...register('cost')} className="input" placeholder="0.00" />
        </div>
        <div>
          <label className="label">Prep Time (min)</label>
          <input type="number" {...register('preparation_time')} className="input" placeholder="15" />
        </div>
        <div>
          <label className="label">Calories</label>
          <input type="number" {...register('calories')} className="input" placeholder="0" />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea {...register('description')} className="input h-20 resize-none" placeholder="Item description..." />
        </div>
        <div className="col-span-2">
          <label className="label">Image URL</label>
          <input {...register('image_url')} className="input" placeholder="https://..." />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('is_available')} className="w-4 h-4 accent-brand-600" />
            <span className="text-sm text-gray-400">Available</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('is_featured')} className="w-4 h-4 accent-brand-600" />
            <span className="text-sm text-gray-400">Featured</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
        </button>
      </div>
    </form>
  );
};

export default function MenuPage() {
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const { data: categoriesData } = useQuery({ queryKey: ['menu-categories-all'], queryFn: () => menuAPI.getCategories({ active: 'false' }) });
  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['menu-items-all', selectedCategory, search],
    queryFn: () => menuAPI.getItems({ category_id: selectedCategory || undefined, search: search || undefined }),
  });

  const categories = categoriesData?.data?.categories || [];
  const items = itemsData?.data?.items || [];

  const createMutation = useMutation({
    mutationFn: (data) => menuAPI.createItem(data),
    onSuccess: () => { qc.invalidateQueries(['menu-items-all']); setShowItemModal(false); toast.success('Item created'); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => menuAPI.updateItem(id, data),
    onSuccess: () => { qc.invalidateQueries(['menu-items-all']); setShowItemModal(false); setEditItem(null); toast.success('Item updated'); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => menuAPI.deleteItem(id),
    onSuccess: () => { qc.invalidateQueries(['menu-items-all']); setDeleteItem(null); toast.success('Item deactivated'); },
    onError: (err) => toast.error(err.message),
  });
  const toggleMutation = useMutation({
    mutationFn: (id) => menuAPI.toggleAvailability(id),
    onSuccess: () => { qc.invalidateQueries(['menu-items-all']); toast.success('Availability updated'); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Menu Management</h1>
          <p className="text-gray-400 text-sm mt-1">{items.length} items across {categories.length} categories</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowItemModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Item
        </button>
      </div>

      <div className="flex gap-4 mb-6 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="input pl-9" />
        </div>
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 overflow-x-auto">
          <button onClick={() => setSelectedCategory(null)}
            className={clsx('flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              !selectedCategory ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-gray-200')}>
            All
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setSelectedCategory(c.id)}
              className={clsx('flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                selectedCategory === c.id ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-gray-200')}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="table-header">Item</th>
                <th className="table-header">Category</th>
                <th className="table-header">Price</th>
                <th className="table-header">Cost</th>
                <th className="table-header">Margin</th>
                <th className="table-header">Prep</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? <tr><td colSpan={8} className="text-center py-12"><LoadingSpinner /></td></tr>
                : items.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">No items found</td></tr>
                : items.map(item => {
                    const margin = item.cost > 0 ? (((item.price - item.cost) / item.price) * 100).toFixed(0) : null;
                    return (
                      <tr key={item.id} className={clsx('hover:bg-gray-800/50 transition-colors', !item.is_available && 'opacity-50')}>
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            {item.image_url && <img src={item.image_url} alt={item.name} className="w-8 h-8 rounded-lg object-cover" />}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-gray-200">{item.name}</p>
                                {item.is_featured && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                              </div>
                              {item.tags?.length > 0 && <p className="text-xs text-gray-600">{item.tags.slice(0,2).join(', ')}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell text-gray-400">{item.category?.name}</td>
                        <td className="table-cell font-semibold text-gray-100">${parseFloat(item.price).toFixed(2)}</td>
                        <td className="table-cell text-gray-400">${parseFloat(item.cost || 0).toFixed(2)}</td>
                        <td className="table-cell">
                          {margin && <span className={clsx('text-xs font-medium', parseFloat(margin) > 50 ? 'text-green-400' : 'text-yellow-400')}>{margin}%</span>}
                        </td>
                        <td className="table-cell text-gray-400">{item.preparation_time}m</td>
                        <td className="table-cell">
                          <span className={clsx('badge', item.is_available ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400')}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex gap-1">
                            <button onClick={() => toggleMutation.mutate(item.id)} title="Toggle availability"
                              className="btn-ghost p-1.5 text-gray-400 hover:text-gray-100">
                              {item.is_available ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                            </button>
                            <button onClick={() => { setEditItem(item); setShowItemModal(true); }}
                              className="btn-ghost p-1.5 text-gray-400 hover:text-gray-100"><Edit2 size={15} /></button>
                            <button onClick={() => setDeleteItem(item)}
                              className="btn-ghost p-1.5 text-red-500/60 hover:text-red-400"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showItemModal} onClose={() => { setShowItemModal(false); setEditItem(null); }}
        title={editItem ? 'Edit Menu Item' : 'Add Menu Item'} size="lg">
        <ItemForm
          item={editItem}
          categories={categories}
          loading={createMutation.isPending || updateMutation.isPending}
          onSave={(data) => editItem ? updateMutation.mutate({ id: editItem.id, data }) : createMutation.mutate(data)}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteMutation.mutate(deleteItem?.id)} danger loading={deleteMutation.isPending}
        title="Deactivate Item" confirmText="Deactivate"
        message={`Are you sure you want to deactivate "${deleteItem?.name}"? It will be hidden from the menu.`} />
    </div>
  );
}
