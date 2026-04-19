import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { menuAPI, tablesAPI, customersAPI, ordersAPI, paymentsAPI } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ChevronLeft, X, Check, User, Printer } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

export default function POSPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState(location.state?.tableId ? { id: location.state.tableId, table_number: location.state.tableNumber } : null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderType, setOrderType] = useState('dine-in');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cashTendered, setCashTendered] = useState('');
  const [receipt, setReceipt] = useState(null);

  const { data: categoriesData } = useQuery({ queryKey: ['menu-categories'], queryFn: () => menuAPI.getCategories({ active: 'true' }) });
  const { data: itemsData } = useQuery({
    queryKey: ['menu-items', selectedCategory, search],
    queryFn: () => menuAPI.getItems({ category_id: selectedCategory || undefined, available: 'true', search: search || undefined }),
  });
  const { data: tablesData } = useQuery({ queryKey: ['tables-available'], queryFn: () => tablesAPI.getAll({ status: 'available' }) });
  const { data: customerSearchData } = useQuery({
    queryKey: ['customer-search', customerQuery],
    queryFn: () => customersAPI.search(customerQuery),
    enabled: customerQuery.length >= 2,
  });

  const categories = categoriesData?.data?.categories || [];
  const items = itemsData?.data?.items || [];
  const availableTables = tablesData?.data?.tables || [];
  const customerResults = customerSearchData?.data?.customers || [];

  const TAX_RATE = 0.08;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmt = parseFloat(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmt);
  const taxAmount = taxableAmount * TAX_RATE;
  const tipAmount = parseFloat(tip) || 0;
  const total = taxableAmount + taxAmount + tipAmount;
  const change = paymentMethod === 'cash' ? Math.max(0, (parseFloat(cashTendered) || 0) - total) : 0;

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.menu_item_id === item.id);
      if (existing) return prev.map(i => i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menu_item_id: item.id, name: item.name, price: parseFloat(item.price), quantity: 1, modifiers: [] }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i.menu_item_id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const removeItem = (id) => setCart(prev => prev.filter(i => i.menu_item_id !== id));
  const clearCart = () => { setCart([]); setDiscount(0); setTip(0); setNotes(''); };

  const createOrderMutation = useMutation({
    mutationFn: (data) => ordersAPI.create(data),
    onSuccess: (res) => {
      setCreatedOrder(res.data.order);
      setShowPayment(true);
      toast.success(`Order #${res.data.order.order_number} created`);
    },
    onError: (err) => toast.error(err.message || 'Failed to create order'),
  });

  const processPaymentMutation = useMutation({
    mutationFn: (data) => paymentsAPI.process(data),
    onSuccess: (res) => {
      setReceipt(res.data.receipt);
      toast.success('Payment processed!');
      clearCart();
      setCreatedOrder(null);
      setSelectedTable(null);
      setSelectedCustomer(null);
    },
    onError: (err) => toast.error(err.message || 'Payment failed'),
  });

  const handleCreateOrder = () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    if (orderType === 'dine-in' && !selectedTable) return toast.error('Please select a table');
    createOrderMutation.mutate({
      table_id: selectedTable?.id || null,
      customer_id: selectedCustomer?.id || null,
      order_type: orderType,
      items: cart.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, modifiers: i.modifiers })),
      notes,
    });
  };

  const handlePayment = () => {
    if (!createdOrder) return;
    processPaymentMutation.mutate({
      order_id: createdOrder.id,
      payment_method: paymentMethod,
      amount: total,
      tip_amount: tipAmount,
      cash_tendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : undefined,
    });
  };

  if (receipt) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="card p-6 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-1">Payment Complete!</h2>
          <p className="text-gray-400 text-sm mb-6">Order #{receipt.order_number}</p>
          <div className="bg-gray-800 rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span>{formatCurrency(receipt.subtotal)}</span></div>
            {receipt.discount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Discount</span><span className="text-red-400">-{formatCurrency(receipt.discount)}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-gray-400">Tax</span><span>{formatCurrency(receipt.tax)}</span></div>
            {receipt.tip > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Tip</span><span>{formatCurrency(receipt.tip)}</span></div>}
            <div className="border-t border-gray-700 pt-2 flex justify-between font-bold"><span>Total</span><span className="text-brand-400">{formatCurrency(receipt.total)}</span></div>
            {receipt.change > 0 && <div className="flex justify-between text-sm text-green-400"><span>Change</span><span>{formatCurrency(receipt.change)}</span></div>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Printer size={16} />Print</button>
            <button onClick={() => setReceipt(null)} className="btn-primary flex-1">New Order</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Menu Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search & Filters */}
        <div className="p-4 border-b border-gray-800 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu items..."
              className="input pl-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setSelectedCategory(null)}
              className={clsx('flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                !selectedCategory ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200')}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={clsx('flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedCategory === cat.id ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200')}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map(item => {
              const inCart = cart.find(i => i.menu_item_id === item.id);
              return (
                <button key={item.id} onClick={() => addToCart(item)}
                  className={clsx('card p-3 text-left border-2 transition-all hover:border-brand-500/50 relative',
                    inCart ? 'border-brand-500/50 bg-brand-500/5' : 'border-gray-800')}>
                  {inCart && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-brand-600 rounded-full text-white text-xs font-bold flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  <div className="w-full h-16 bg-gray-800 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      : <span className="text-2xl">🍽️</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-200 line-clamp-1">{item.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-1 mb-2">{item.description}</p>
                  <p className="text-brand-400 font-bold">{formatCurrency(item.price)}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart / Order Panel */}
      <div className="w-80 xl:w-96 flex flex-col bg-gray-900 border-l border-gray-800 flex-shrink-0">
        {/* Order Info */}
        <div className="p-4 border-b border-gray-800 space-y-2">
          <div className="flex gap-2">
            {['dine-in','takeaway','delivery'].map(t => (
              <button key={t} onClick={() => setOrderType(t)}
                className={clsx('flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                  orderType === t ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400')}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTablePicker(true)}
              className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 text-left text-sm transition-colors">
              <p className="text-gray-500 text-xs">Table</p>
              <p className={selectedTable ? 'text-gray-200 font-medium' : 'text-gray-500'}>
                {selectedTable ? selectedTable.table_number : 'Select table'}
              </p>
            </button>
            <button onClick={() => setShowCustomerSearch(true)}
              className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 text-left text-sm transition-colors">
              <p className="text-gray-500 text-xs">Customer</p>
              <p className={selectedCustomer ? 'text-gray-200 font-medium' : 'text-gray-500 text-xs'}>
                {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Optional'}
              </p>
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="text-4xl mb-3">🛒</p>
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Click menu items to add</p>
            </div>
          ) : cart.map(item => (
            <div key={item.menu_item_id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{item.name}</p>
                <p className="text-xs text-brand-400">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.menu_item_id, -1)} className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center"><Minus size={12} /></button>
                <span className="text-sm font-bold w-6 text-center text-gray-100">{item.quantity}</span>
                <button onClick={() => updateQty(item.menu_item_id, 1)} className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center"><Plus size={12} /></button>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-200">{formatCurrency(item.price * item.quantity)}</p>
                <button onClick={() => removeItem(item.menu_item_id)} className="text-red-500/60 hover:text-red-400 mt-0.5"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals & Order */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-800 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Discount</span>
                <div className="flex items-center gap-1">
                  <span>$</span>
                  <input type="number" min="0" max={subtotal} value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-right text-gray-200 text-sm" />
                </div>
              </div>
              <div className="flex justify-between text-gray-400"><span>Tax (8%)</span><span>{formatCurrency(taxAmount)}</span></div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Tip</span>
                <div className="flex gap-1">
                  {[0, 15, 18, 20].map(pct => (
                    <button key={pct} onClick={() => setTip(pct > 0 ? (taxableAmount * pct / 100).toFixed(2) : 0)}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400 hover:text-gray-200">
                      {pct > 0 ? `${pct}%` : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              {tipAmount > 0 && <div className="flex justify-between text-gray-400"><span>Tip amount</span><span>{formatCurrency(tipAmount)}</span></div>}
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-gray-700 pt-3">
              <span className="text-gray-100">Total</span>
              <span className="text-brand-400">{formatCurrency(total)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={clearCart} className="btn-secondary px-3 py-2.5"><X size={16} /></button>
              <button onClick={handleCreateOrder} disabled={createOrderMutation.isPending}
                className="btn-primary flex-1 py-2.5 text-sm font-semibold">
                {createOrderMutation.isPending ? 'Creating...' : 'Place Order →'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Picker Modal */}
      <Modal isOpen={showTablePicker} onClose={() => setShowTablePicker(false)} title="Select Table" size="md">
        <div className="grid grid-cols-3 gap-3">
          {availableTables.map(t => (
            <button key={t.id} onClick={() => { setSelectedTable(t); setShowTablePicker(false); }}
              className={clsx('border-2 rounded-xl p-3 text-center transition-colors hover:border-brand-500',
                selectedTable?.id === t.id ? 'border-brand-500 bg-brand-500/10' : 'border-gray-700')}>
              <p className="font-bold text-gray-100">{t.table_number}</p>
              <p className="text-xs text-gray-500">{t.section?.name}</p>
              <p className="text-xs text-gray-400">{t.capacity} seats</p>
            </button>
          ))}
          {availableTables.length === 0 && <p className="col-span-3 text-center text-gray-500 py-8">No available tables</p>}
        </div>
        {selectedTable && (
          <button onClick={() => { setSelectedTable(null); setShowTablePicker(false); }}
            className="mt-4 btn-secondary w-full text-sm">Clear Selection</button>
        )}
      </Modal>

      {/* Customer Search Modal */}
      <Modal isOpen={showCustomerSearch} onClose={() => setShowCustomerSearch(false)} title="Find Customer" size="sm">
        <div className="space-y-3">
          <input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)}
            placeholder="Search by name, email or phone..." className="input" />
          <div className="space-y-2">
            {customerResults.map(c => (
              <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerQuery(''); }}
                className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-3 text-left transition-colors flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-600/30 rounded-full flex items-center justify-center">
                  <User size={14} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-gray-500">{c.phone || c.email}</p>
                </div>
                <div className="ml-auto text-xs text-brand-400 font-medium">{c.loyalty_points} pts</div>
              </button>
            ))}
            {customerQuery.length >= 2 && customerResults.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No customers found</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPayment && !!createdOrder} onClose={() => {}} title="Process Payment" size="sm"
        footer={
          <>
            <button onClick={() => { setShowPayment(false); navigate(`/orders/${createdOrder?.id}`); }} className="btn-secondary">View Order</button>
            <button onClick={handlePayment} disabled={processPaymentMutation.isPending || (paymentMethod === 'cash' && (parseFloat(cashTendered) || 0) < total)}
              className="btn-primary flex-1">
              {processPaymentMutation.isPending ? 'Processing...' : `Pay ${formatCurrency(total)}`}
            </button>
          </>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[{ method: 'cash', icon: Banknote, label: 'Cash' }, { method: 'card', icon: CreditCard, label: 'Card' }, { method: 'mobile', icon: Smartphone, label: 'Mobile' }].map(({ method, icon: Icon, label }) => (
              <button key={method} onClick={() => setPaymentMethod(method)}
                className={clsx('border-2 rounded-xl p-3 flex flex-col items-center gap-1 transition-colors',
                  paymentMethod === method ? 'border-brand-500 bg-brand-500/10' : 'border-gray-700 hover:border-gray-600')}>
                <Icon size={20} className={paymentMethod === method ? 'text-brand-400' : 'text-gray-400'} />
                <span className="text-xs font-medium text-gray-300">{label}</span>
              </button>
            ))}
          </div>
          <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400"><span>Order</span><span>#{createdOrder?.order_number}</span></div>
            <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-gray-400"><span>Tax</span><span>{formatCurrency(taxAmount)}</span></div>
            {tipAmount > 0 && <div className="flex justify-between text-gray-400"><span>Tip</span><span>{formatCurrency(tipAmount)}</span></div>}
            <div className="border-t border-gray-700 pt-2 flex justify-between font-bold text-lg"><span className="text-gray-100">Total</span><span className="text-brand-400">{formatCurrency(total)}</span></div>
          </div>
          {paymentMethod === 'cash' && (
            <div>
              <label className="label">Cash Tendered</label>
              <input type="number" value={cashTendered} onChange={e => setCashTendered(e.target.value)}
                placeholder="0.00" className="input text-lg font-bold" />
              {parseFloat(cashTendered) >= total && (
                <p className="mt-2 text-green-400 text-sm font-medium">Change: {formatCurrency(change)}</p>
              )}
            </div>
          )}
          {paymentMethod === 'card' && (
            <div className="bg-gray-800 rounded-xl p-4 text-center text-gray-400 text-sm">
              <CreditCard size={24} className="mx-auto mb-2 text-gray-500" />
              Card terminal simulation — payment will be processed automatically
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
