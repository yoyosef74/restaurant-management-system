import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersAPI, paymentsAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { ArrowLeft, CreditCard, Banknote, Smartphone, Printer, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { clsx } from 'clsx';

const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cashTendered, setCashTendered] = useState('');
  const [tipAmount, setTipAmount] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersAPI.getOne(id),
    refetchInterval: 15000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => ordersAPI.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['order', id]); toast.success('Status updated'); },
    onError: (err) => toast.error(err.message),
  });

  const processPaymentMutation = useMutation({
    mutationFn: (data) => paymentsAPI.process(data),
    onSuccess: () => { qc.invalidateQueries(['order', id]); setShowPayment(false); toast.success('Payment processed!'); },
    onError: (err) => toast.error(err.message || 'Payment failed'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner size={32} /></div>;

  const order = data?.data?.order;
  if (!order) return <div className="p-6 text-gray-400">Order not found</div>;

  const activeItems = order.items?.filter(i => i.status !== 'cancelled') || [];
  const taxableAmt = parseFloat(order.subtotal) - parseFloat(order.discount_amount || 0);
  const total = taxableAmt + parseFloat(order.tax_amount) + parseFloat(tipAmount || order.tip_amount || 0);
  const change = paymentMethod === 'cash' ? Math.max(0, parseFloat(cashTendered || 0) - total) : 0;

  const STATUS_ACTIONS = {
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['served'],
    served: [],
    paid: [], cancelled: [], refunded: [],
  };
  const nextStatuses = STATUS_ACTIONS[order.status] || [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-100 mb-6 transition-colors">
        <ArrowLeft size={18} /> Back to Orders
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <div className="card p-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-gray-100">{order.order_number}</h1>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                {order.table && <span>Table: <span className="text-gray-200 font-medium">{order.table.table_number}</span></span>}
                {order.waiter && <span>Waiter: <span className="text-gray-200 font-medium">{order.waiter.first_name} {order.waiter.last_name}</span></span>}
                {order.customer && <span>Customer: <span className="text-gray-200 font-medium">{order.customer.first_name} {order.customer.last_name}</span></span>}
                <span className="capitalize">Type: <span className="text-gray-200 font-medium">{order.order_type}</span></span>
              </div>
              {order.created_at && <p className="text-xs text-gray-600 mt-2">{format(new Date(order.created_at), 'PPpp')}</p>}
            </div>
          </div>

          {/* Items */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-gray-200">Order Items</h2>
              <span className="text-sm text-gray-500">{activeItems.length} item(s)</span>
            </div>
            <div className="divide-y divide-gray-800">
              {order.items?.map(item => (
                <div key={item.id} className={clsx('flex items-center gap-4 px-5 py-3', item.status === 'cancelled' && 'opacity-40')}>
                  <span className="text-sm font-bold text-gray-400 w-6">{item.quantity}×</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200">{item.name}</p>
                    {item.special_instructions && <p className="text-xs text-yellow-400 italic mt-0.5">{item.special_instructions}</p>}
                  </div>
                  <StatusBadge status={item.status} />
                  <span className="text-sm font-semibold text-gray-200 w-20 text-right">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {(order.notes || order.kitchen_notes) && (
            <div className="card p-5 space-y-2">
              {order.notes && <div><p className="text-xs text-gray-500 mb-1">Order Notes</p><p className="text-sm text-gray-300">{order.notes}</p></div>}
              {order.kitchen_notes && <div><p className="text-xs text-gray-500 mb-1">Kitchen Notes</p><p className="text-sm text-yellow-400">{order.kitchen_notes}</p></div>}
            </div>
          )}

          {/* Actions */}
          {nextStatuses.length > 0 && (
            <div className="flex gap-3">
              {nextStatuses.map(s => (
                <button key={s} onClick={() => updateStatusMutation.mutate(s)}
                  disabled={updateStatusMutation.isPending}
                  className={clsx('flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors',
                    s === 'cancelled' ? 'btn-danger' : 'btn-primary')}>
                  {s === 'cancelled' ? '✕ Cancel Order' : `→ Mark ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-200 mb-4">Order Summary</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              {parseFloat(order.discount_amount) > 0 && (
                <div className="flex justify-between text-red-400"><span>Discount</span><span>-{formatCurrency(order.discount_amount)}</span></div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>Tax ({(parseFloat(order.tax_rate || 0.08) * 100).toFixed(0)}%)</span>
                <span>{formatCurrency(order.tax_amount)}</span>
              </div>
              {parseFloat(order.tip_amount) > 0 && (
                <div className="flex justify-between text-gray-400"><span>Tip</span><span>{formatCurrency(order.tip_amount)}</span></div>
              )}
              <div className="border-t border-gray-800 pt-2.5 flex justify-between font-bold text-base">
                <span className="text-gray-100">Total</span>
                <span className="text-brand-400">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>

            {/* Payments */}
            {order.payments?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">Payments</p>
                {order.payments.map(p => (
                  <div key={p.id} className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-400">{p.payment_method}</span>
                    <span className={clsx(p.status === 'refunded' ? 'text-red-400 line-through' : 'text-gray-200')}>
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Pay button */}
            {!['paid','cancelled','refunded'].includes(order.status) && (
              <button onClick={() => setShowPayment(true)}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                <CreditCard size={16} /> Process Payment
              </button>
            )}
            {order.status === 'paid' && (
              <button onClick={() => window.print()}
                className="btn-secondary w-full mt-4 flex items-center justify-center gap-2">
                <Printer size={16} /> Print Receipt
              </button>
            )}
          </div>

          {/* Timeline */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-200 mb-3 text-sm">Timeline</h3>
            <div className="space-y-2">
              {[
                { label: 'Created', time: order.created_at },
                { label: 'Ordered', time: order.ordered_at },
                { label: 'Served', time: order.served_at },
                { label: 'Paid', time: order.paid_at },
              ].filter(t => t.time).map(({ label, time }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-400">{format(new Date(time), 'HH:mm:ss')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title="Process Payment" size="sm"
        footer={
          <>
            <button onClick={() => setShowPayment(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => processPaymentMutation.mutate({ order_id: order.id, payment_method: paymentMethod, amount: parseFloat(order.total_amount) + tipAmount, tip_amount: tipAmount, cash_tendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : undefined })}
              disabled={processPaymentMutation.isPending}
              className="btn-primary">
              {processPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
            </button>
          </>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[{ method:'cash', icon:Banknote }, { method:'card', icon:CreditCard }, { method:'mobile', icon:Smartphone }].map(({ method, icon:Icon }) => (
              <button key={method} onClick={() => setPaymentMethod(method)}
                className={clsx('border-2 rounded-xl p-3 flex flex-col items-center gap-1 transition-colors capitalize',
                  paymentMethod === method ? 'border-brand-500 bg-brand-500/10' : 'border-gray-700')}>
                <Icon size={20} className={paymentMethod === method ? 'text-brand-400' : 'text-gray-400'} />
                <span className="text-xs text-gray-300">{method}</span>
              </button>
            ))}
          </div>
          <div>
            <label className="label">Tip Amount</label>
            <div className="flex gap-2 mb-2">
              {[0,15,18,20].map(pct => (
                <button key={pct} onClick={() => setTipAmount(pct > 0 ? parseFloat((parseFloat(order.subtotal) * pct / 100).toFixed(2)) : 0)}
                  className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400">
                  {pct > 0 ? `${pct}%` : 'No tip'}
                </button>
              ))}
            </div>
            <input type="number" value={tipAmount} onChange={e => setTipAmount(parseFloat(e.target.value)||0)}
              className="input" placeholder="0.00" />
          </div>
          {paymentMethod === 'cash' && (
            <div>
              <label className="label">Cash Tendered</label>
              <input type="number" value={cashTendered} onChange={e => setCashTendered(e.target.value)} className="input" placeholder="0.00" />
              {parseFloat(cashTendered) >= total && <p className="mt-1 text-green-400 text-sm">Change: {formatCurrency(change)}</p>}
            </div>
          )}
          <div className="bg-gray-800 rounded-xl p-3 flex justify-between text-sm font-bold">
            <span>Total to Pay</span>
            <span className="text-brand-400">{formatCurrency(parseFloat(order.total_amount) + tipAmount)}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
