import React from 'react';
import { clsx } from 'clsx';

const STATUS_STYLES = {
  pending: 'status-pending', confirmed: 'status-confirmed', preparing: 'status-preparing',
  ready: 'status-ready', served: 'status-served', paid: 'status-paid',
  cancelled: 'status-cancelled', refunded: 'status-cancelled',
  available: 'status-available', occupied: 'status-occupied',
  reserved: 'status-reserved', cleaning: 'status-cleaning',
  active: 'bg-green-500/20 text-green-400', inactive: 'bg-gray-700 text-gray-400',
  low: 'bg-red-500/20 text-red-400', ok: 'bg-green-500/20 text-green-400',
};

export default function StatusBadge({ status, className }) {
  return (
    <span className={clsx('badge', STATUS_STYLES[status] || 'bg-gray-700 text-gray-400', className)}>
      {status?.replace(/-/g, ' ')}
    </span>
  );
}
