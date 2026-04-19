import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const SETTING_GROUPS = [
  { category: 'general', label: 'General', keys: ['restaurant_name','restaurant_address','restaurant_phone','restaurant_email','opening_time','closing_time'] },
  { category: 'billing', label: 'Billing & Tax', keys: ['tax_rate','currency','currency_symbol','receipt_footer'] },
  { category: 'orders', label: 'Orders', keys: ['order_number_prefix'] },
  { category: 'reservations', label: 'Reservations', keys: ['reservation_duration'] },
  { category: 'loyalty', label: 'Loyalty Program', keys: ['loyalty_points_rate'] },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [localSettings, setLocalSettings] = useState({});
  const [activeGroup, setActiveGroup] = useState('general');

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll(),
    onSuccess: (res) => {
      const map = {};
      res.data?.settings?.forEach(s => { map[s.key] = s.value; });
      setLocalSettings(map);
    },
  });

  const settings = data?.data?.settings || [];
  const settingsMap = {};
  settings.forEach(s => { settingsMap[s.key] = s.value; });

  const updateMutation = useMutation({
    mutationFn: (data) => settingsAPI.updateBulk(data),
    onSuccess: () => { qc.invalidateQueries(['settings']); toast.success('Settings saved'); },
    onError: (err) => toast.error(err.message),
  });

  const activeGroupSettings = SETTING_GROUPS.find(g => g.category === activeGroup);

  const handleSave = () => {
    const changed = {};
    Object.entries(localSettings).forEach(([key, val]) => {
      if (val !== settingsMap[key]) changed[key] = val;
    });
    if (Object.keys(changed).length === 0) return toast('No changes to save');
    updateMutation.mutate(changed);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">System Settings</h1>
          <p className="text-gray-400 text-sm mt-1">Configure your restaurant system</p>
        </div>
        <button onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary flex items-center gap-2">
          <Save size={18} />{updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {SETTING_GROUPS.map(g => (
            <button key={g.category} onClick={() => setActiveGroup(g.category)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeGroup === g.category ? 'bg-brand-600/20 text-brand-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
              {g.label}
            </button>
          ))}
        </div>

        {/* Settings Form */}
        <div className="flex-1 card p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-5">{activeGroupSettings?.label}</h2>
          {isLoading ? <div className="text-gray-500">Loading...</div> : (
            <div className="space-y-5">
              {activeGroupSettings?.keys.map(key => {
                const setting = settings.find(s => s.key === key);
                if (!setting && !['tax_rate','loyalty_points_rate','reservation_duration','opening_time','closing_time','order_number_prefix'].includes(key)) return null;
                const label = key.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase());
                const isBoolean = setting?.type === 'boolean';
                const isNumber = setting?.type === 'number';
                return (
                  <div key={key}>
                    <label className="label">{label}</label>
                    {key.includes('footer') || key.includes('address') ? (
                      <textarea value={localSettings[key] ?? setting?.value ?? ''}
                        onChange={e => setLocalSettings(p => ({ ...p, [key]: e.target.value }))}
                        className="input h-20 resize-none" />
                    ) : (
                      <input
                        type={isNumber ? 'number' : key.includes('time') ? 'time' : 'text'}
                        step={isNumber && key === 'tax_rate' ? '0.001' : '1'}
                        value={localSettings[key] ?? setting?.value ?? ''}
                        onChange={e => setLocalSettings(p => ({ ...p, [key]: e.target.value }))}
                        className="input max-w-sm"
                      />
                    )}
                    {setting?.description && <p className="text-xs text-gray-600 mt-1">{setting.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
