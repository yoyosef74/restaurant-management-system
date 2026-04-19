import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChefHat, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@restaurant.com', password: 'password123' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Admin', email: 'admin@restaurant.com', role: 'Full access' },
    { label: 'Manager', email: 'manager@restaurant.com', role: 'Management' },
    { label: 'Waiter', email: 'waiter@restaurant.com', role: 'Orders & Tables' },
    { label: 'Kitchen', email: 'kitchen@restaurant.com', role: 'KDS only' },
    { label: 'Cashier', email: 'cashier@restaurant.com', role: 'POS & Payments' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-brand-900 via-brand-800 to-gray-900 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <ChefHat size={24} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">La Bella Cucina</span>
        </div>
        <div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Restaurant<br />Management<br />System
          </h1>
          <p className="text-brand-200 text-lg leading-relaxed">
            Complete POS & ERP solution for modern restaurants.<br />
            Real-time orders, kitchen display, inventory & analytics.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {['Orders', 'Tables', 'Kitchen', 'Inventory', 'Reports', 'Analytics'].map(f => (
            <div key={f} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-white text-sm font-medium">{f}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <ChefHat size={32} className="text-brand-500" />
            <span className="text-white font-bold text-xl">La Bella Cucina</span>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-2">Sign In</h2>
            <p className="text-gray-400 text-sm mb-8">Enter your credentials to access the system</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email Address</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input" placeholder="admin@restaurant.com" required />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="input pr-10" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Demo accounts */}
          <div className="mt-6">
            <p className="text-gray-500 text-xs text-center mb-3">Demo accounts (password: password123)</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(acc => (
                <button key={acc.email} onClick={() => setForm({ email: acc.email, password: 'password123' })}
                  className="bg-gray-900 border border-gray-800 hover:border-brand-600/50 rounded-lg p-3 text-left transition-colors">
                  <p className="text-gray-200 text-sm font-medium">{acc.label}</p>
                  <p className="text-gray-500 text-xs">{acc.role}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
