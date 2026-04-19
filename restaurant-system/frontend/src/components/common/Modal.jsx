import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={clsx('relative w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl animate-slide-up', sizes[size])}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 text-gray-400 hover:text-gray-100">
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-140px)]">{children}</div>
        {/* Footer */}
        {footer && <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
