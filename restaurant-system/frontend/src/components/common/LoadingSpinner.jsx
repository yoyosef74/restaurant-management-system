import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ fullscreen, size = 24, className }) {
  if (fullscreen) return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={40} className="animate-spin text-brand-500" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
  return <Loader2 size={size} className={clsx('animate-spin text-brand-500', className)} />;
}
