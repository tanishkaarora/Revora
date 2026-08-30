// frontend/components/PromiseCalendar.tsx
import React, { useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { 
  Calendar as CalendarIcon, CheckCircle, AlertTriangle, 
  Clock, ArrowRight, ShieldCheck, UserCheck, MessageSquare, Lock 
} from 'lucide-react';

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
          <span className="flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-medium">
            <Clock className="w-3 h-3" /> Contact Suppressed
          </span>
        );
      case 'kept':
        return (
          <span className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
            <CheckCircle className="w-3 h-3" /> Promise Kept
          </span>
        );
      case 'broken':
        return (
          <span className="flex items-center gap-1 text-[11px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-0.5 rounded-full font-medium">
            <AlertTriangle className="w-3 h-3" /> Broken (Re-triaged)
          </span>
        );
      default:
        return null;
    }
  };

  // Group promises by date
  const groupedPromises: Record<string, typeof promises> = {};
  promises.forEach((p) => {
    const date = p.promised_date || 'Flexible Commitment';
    if (!groupedPromises[date]) {
      groupedPromises[date] = [];
    }
    groupedPromises[date].push(p);
  });

  const sortedDates = Object.keys(groupedPromises).sort();

  return (
    <div className="surface-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E222D] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white tracking-tight font-display">
              Promise Protection Ledger & State Transitions
            </h3>
            <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 font-medium">
              State Tracker
            </span>

          </div>
          <p className="text-xs text-gray-400 mt-1">
            Automatic outreach suppression state-machine triggered upon extracting payment commitments.
          </p>
        </div>
        <span className="text-xs text-gray-400 font-sans">
          Active Commitments: <strong className="text-white font-technical">{promises.length}</strong>
        </span>
      </div>

      {/* State Machine Transition Banner */}
      <div className="bg-[#0A0B0E] p-3.5 rounded-xl border border-[#1E222D] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-indigo-300">
          <MessageSquare className="w-4 h-4" />
          <span className="font-semibold">1. Promise Detected</span>
          <span className="text-gray-500 font-sans text-[11px]">(NLP regex / LLM)</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-600 hidden md:block" />
        <div className="flex items-center gap-2 text-amber-300">
          <Lock className="w-4 h-4" />
          <span className="font-semibold">2. Outreach Suppressed</span>
          <span className="text-gray-500 font-sans text-[11px]">(Zero spam calls)</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-600 hidden md:block" />
        <div className="flex items-center gap-2 text-emerald-300">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-semibold">3. Verified Resolution</span>
          <span className="text-gray-500 font-sans text-[11px]">(Razorpay webhook)</span>
        </div>
      </div>

      {promises.length === 0 ? (
        <div className="h-[220px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#1E222D] rounded-xl">
          <CalendarIcon className="w-8 h-8 text-gray-600 mb-2" />
          <span className="text-sm font-semibold text-gray-300">No Commitments In Flight</span>
          <p className="text-xs text-gray-500 max-w-[280px] mt-1 leading-relaxed">
            Customer replies via the WhatsApp simulator will automatically register and lock here.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2.5">
              <h4 className="text-xs font-semibold text-gray-300 font-sans flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                {date === 'Flexible Commitment' ? date : new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                {groupedPromises[date].map((p, index) => (
                  <div
                    key={`${p.failed_payment_id}-${index}`}
                    className="bg-[#12141D] p-3.5 rounded-xl border border-[#1E222E] flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-white block">{p.customer_name}</span>
                        <span className="text-[10px] text-gray-500 font-technical">ID: {p.failed_payment_id}</span>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>
                    
                    <div className="bg-[#0A0B0E] p-2.5 rounded-lg border border-[#1E222D]">
                      <p className="text-[11px] text-gray-300 italic truncate" title={p.raw_reply}>
                        &ldquo;{p.raw_reply}&rdquo;
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-sans">
                      <span>Confidence: <strong className="text-gray-300">{(p.confidence * 100).toFixed(0)}%</strong></span>
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

