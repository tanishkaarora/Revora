// frontend/components/PromiseCalendar.tsx
import React, { useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { Calendar as CalendarIcon, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function PromiseCalendar() {
  const promises = useAppStore((state) => state.promises);
  const fetchPromises = useAppStore((state) => state.fetchPromises);

  useEffect(() => {
    fetchPromises();
  }, [fetchPromises]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
            <Clock className="w-2.5 h-2.5" /> Pending
          </span>
        );
      case 'kept':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
            <CheckCircle className="w-2.5 h-2.5" /> Kept
          </span>
        );
      case 'broken':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-mono">
            <AlertTriangle className="w-2.5 h-2.5" /> Broken
          </span>
        );
      default:
        return null;
    }
  };

  // Group promises by date
  const groupedPromises: Record<string, typeof promises> = {};
  promises.forEach((p) => {
    const date = p.promised_date || 'Undated';
    if (!groupedPromises[date]) {
      groupedPromises[date] = [];
    }
    groupedPromises[date].push(p);
  });

  // Sort dates
  const sortedDates = Object.keys(groupedPromises).sort();

  return (
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-lg h-full">
      <div className="flex items-center justify-between mb-4 border-b border-[#232630] pb-3">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-400 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-emerald-400" />
          Active Promises Ledger
        </h3>
        <span className="text-[10px] text-gray-500 font-mono">Total Promises: {promises.length}</span>
      </div>

      {promises.length === 0 ? (
        <div className="h-[250px] flex flex-col items-center justify-center text-center">
          <CalendarIcon className="w-8 h-8 text-gray-600 mb-2" />
          <span className="text-xs text-gray-500">No active commitments found.</span>
          <p className="text-[10px] text-gray-600 max-w-[200px] mt-1">
            Simulate a customer reply in the WhatsApp simulator to generate promises.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 font-mono border-l-2 border-emerald-500 pl-2">
                {date === 'Undated' ? 'Flexible Schedule' : new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                {groupedPromises[date].map((p, index) => (
                  <div
                    key={`${p.failed_payment_id}-${index}`}
                    className="bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-semibold text-gray-300 block">{p.customer_name}</span>
                        <span className="text-[9px] text-gray-500 font-mono">Payment ID: {p.failed_payment_id}</span>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>
                    
                    <div className="bg-[#13151C]/60 p-1.5 rounded border border-[#232630] mt-1">
                      <p className="text-[10px] text-gray-400 italic truncate" title={p.raw_reply}>
                        &quot;{p.raw_reply}&quot;
                      </p>
                    </div>

                    <div className="flex justify-between items-center mt-2 text-[9px] text-gray-500">
                      <span>Confidence: {(p.confidence * 100).toFixed(0)}%</span>
                      <span>Recorded: {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
