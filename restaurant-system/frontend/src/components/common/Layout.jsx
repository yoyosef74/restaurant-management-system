import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, UtensilsCrossed, ShoppingBag, CreditCard, ChefHat,
  BookOpen, Package, Users, CalendarDays, BarChart3, Settings, LogOut,
  Menu, X, Bell, ChevronRight, Wifi, WifiOff
} from 'lucide-react';
import { clsx } from 'clsx';
import { getSocket } from '../../services/socket';
import NotificationBell from './NotificationBell';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/tables', icon: UtensilsCrossed, label: 'Tables' },
  { to: '/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/pos', icon: CreditCard, label: 'POS' },
  { to: '/kitchen', icon: ChefHat, label: 'Kitchen', roles: ['admin','manager','kitchen'] },
  { to: '/menu', icon: BookOpen, label: 'Menu', roles: ['admin','manager'] },
  { to: '/inventory', icon: Package, label: 'Inventory', roles: ['admin','manager'] },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/reservations', icon: CalendarDays, label: 'Reservations' },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin','manager'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['admin'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin','manager'] },
];

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const socket = getSocket();
  const isConnected = socket?.connected;

  const handleLogout = () => { logout(); navigate('/login'); };

  const filteredNav = navItems.filter(item => !item.roles || hasRole(...item.roles));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <ChefHat size={20} className="text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-sm leading-tight">La Bella Cucina</p>
            <p className="text-xs text-gray-500 leading-tight">Restaurant POS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {filteredNav.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
          >
            <Icon size={18} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-800">
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-brand-400 text-xs font-bold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-100 truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="btn-ghost p-1.5 text-gray-500 hover:text-red-400">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="w-full flex justify-center btn-ghost text-gray-500 hover:text-red-400 p-2">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={clsx(
        'hidden lg:flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 flex-shrink-0',
        sidebarOpen ? 'w-56' : 'w-16'
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => { setSidebarOpen(v => !v); setMobileOpen(v => !v); }}
            className="btn-ghost p-2">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className={clsx('flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
              isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
