import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false, loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className={danger ? 'btn-danger' : 'btn-primary'}>
            {loading ? 'Processing...' : confirmText}
          </button>
        </>
      }>
      <div className="flex items-start gap-4">
        {danger && <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-red-400" />
        </div>}
        <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
