import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { subscribeToEvent, unsubscribeFromEvent } from '../../services/socket';
import { clsx } from 'clsx';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handlers = {
      'order:new': (order) => addNotification({ type: 'order', message: `New order #${order.order_number}`, color: 'blue' }),
      'order:item_ready': (data) => addNotification({ type: 'ready', message: `Item ready at table ${data.tableNumber || ''}`, color: 'green' }),
      'inventory:low_stock': (item) => addNotification({ type: 'alert', message: `Low stock: ${item.name}`, color: 'red' }),
    };
    Object.entries(handlers).forEach(([event, fn]) => subscribeToEvent(event, fn));
    return () => Object.entries(handlers).forEach(([event, fn]) => unsubscribeFromEvent(event, fn));
  }, []);

  const addNotification = (notif) => {
    setNotifications(prev => [{ ...notif, id: Date.now(), time: new Date() }, ...prev].slice(0, 20));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const colors = { blue: 'bg-blue-500', green: 'bg-green-500', red: 'bg-red-500', yellow: 'bg-yellow-500' };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(v => !v); if (!open) markAllRead(); }}
        className="relative btn-ghost p-2">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="font-semibold text-gray-100 text-sm">Notifications</span>
            <button onClick={() => setNotifications([])} className="text-xs text-gray-500 hover:text-gray-300">Clear all</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No notifications</p>
            ) : notifications.map(n => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50">
                <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', colors[n.color] || 'bg-gray-500')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.time.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
