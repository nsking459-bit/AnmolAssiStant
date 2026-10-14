import React from 'react';
import { AlertTriangle, Check, X, Phone, MessageSquare, Trash2, Mail } from 'lucide-react';
import { PendingConfirmation } from '../types/jarvis';

interface ConfirmationDialogProps {
  confirmation: PendingConfirmation | null;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ confirmation }) => {
  if (!confirmation) return null;

  const getActionIcon = () => {
    switch (confirmation.actionType) {
      case 'call':
        return <Phone className="w-6 h-6 text-emerald-400" />;
      case 'sms':
      case 'whatsapp':
        return <MessageSquare className="w-6 h-6 text-cyan-400" />;
      case 'email':
        return <Mail className="w-6 h-6 text-blue-400" />;
      case 'delete_memory':
      case 'wipe_notes':
      default:
        return <Trash2 className="w-6 h-6 text-rose-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl border-2 border-amber-500/50 p-5 shadow-[0_0_30px_rgba(245,158,11,0.25)] space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300">
            {getActionIcon()}
          </div>
          <div>
            <h3 className="font-hud font-bold text-base text-gray-100 uppercase tracking-wider">
              {confirmation.title}
            </h3>
            <p className="text-xs font-mono-tech text-gray-300 mt-1">
              {confirmation.description}
            </p>
          </div>
        </div>

        {/* Action Details Grid */}
        {confirmation.details && Object.keys(confirmation.details).length > 0 && (
          <div className="bg-gray-950/80 border border-cyan-900/40 rounded-xl p-3 space-y-1.5 text-xs font-mono-tech">
            {Object.entries(confirmation.details).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-gray-400 capitalize">{key}:</span>
                <span className="text-cyan-300 font-semibold truncate max-w-[200px]">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={confirmation.onCancel}
            className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-mono-tech uppercase transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <button
            onClick={confirmation.onConfirm}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-hud text-xs uppercase tracking-wider font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
};
