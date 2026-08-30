// frontend/components/RecoveryFunnel.tsx
import React from 'react';
import { useAppStore } from '../lib/store';
import { 
  Shield, Sparkles, UserCheck, RefreshCw, Ban, Send, AlertTriangle, 
  Clock, CalendarX, Moon, ArrowRight, DollarSign, Activity, CheckCircle2 
} from 'lucide-react';

export default function RecoveryFunnel() {
  const cases = useAppStore((state) => state.cases);

  // Stage 1: Ingested
  const totalCount = cases.length;
  const totalValuePaise = cases.reduce((acc, c) => acc + c.amount_paise, 0);
  const totalValueRupees = totalValuePaise / 100.0;

  // Stage 3: Channel Allocations
  const whatsappAlloc = cases.filter(c => c.allocated && (c.candidate_action === 'send_whatsapp_nudge' || c.candidate_action === 'suggest_alt_method'));
  const humanAlloc = cases.filter(c => c.allocated && c.candidate_action === 'escalate_human');
  const retryAlloc = cases.filter(c => c.allocated && c.candidate_action === 'silent_retry');
  const suppressedCases = cases.filter(c => !c.allocated || c.candidate_action === 'suppress');

  const whatsappRupees = whatsappAlloc.reduce((acc, c) => acc + c.amount_paise, 0) / 100.0;
  const humanRupees = humanAlloc.reduce((acc, c) => acc + c.amount_paise, 0) / 100.0;
  const retryRupees = retryAlloc.reduce((acc, c) => acc + c.amount_paise, 0) / 100.0;
  const suppressedRupees = suppressedCases.reduce((acc, c) => acc + c.amount_paise, 0) / 100.0;

  // Recovered
  const recoveredCases = cases.filter(c => c.recovered);
  const recoveredCount = recoveredCases.length;
  const recoveredValuePaise = recoveredCases.reduce((acc, c) => acc + c.amount_recovered_paise, 0);
  const recoveredValueRupees = recoveredValuePaise / 100.0;
  
  const recoveryRate = totalCount > 0 ? (recoveredCount / totalCount) * 100.0 : 0.0;

  return (
    <div className="surface-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E222D] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white tracking-tight font-display">
              Money Flow & Channel Routing Breakdown
            </h3>
            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 font-medium">
              Capital Distribution
            </span>

          </div>
          <p className="text-xs text-gray-400 mt-1">
            Dynamic capital distribution across autonomous channels and fatigue-suppressed cohorts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-sans">Aggregate Yield:</span>
          <span className="text-sm font-bold font-technical text-emerald-400">
            {recoveryRate.toFixed(1)}% (₹{recoveredValueRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
          </span>
        </div>
      </div>

      {/* Money Flow Routing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* WhatsApp Channel */}
        <div className="bg-[#12141D] p-4 rounded-xl border border-[#202534] space-y-2 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> WhatsApp Nudges
            </span>
            <span className="text-gray-400 font-technical text-[11px]">{whatsappAlloc.length} cases</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-technical text-base font-bold text-white">
              ₹{whatsappRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">P(rec) ~ 74%</span>
          </div>
          <p className="text-[11px] text-gray-400 pt-1 border-t border-[#1C202C]">
            Low friction interactive payment links with smart expiration reminders.
          </p>
        </div>

        {/* Silent Retry Channel */}
        <div className="bg-[#12141D] p-4 rounded-xl border border-[#202534] space-y-2 hover:border-sky-500/30 transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-sky-400 font-semibold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Silent Network Retry
            </span>
            <span className="text-gray-400 font-technical text-[11px]">{retryAlloc.length} cases</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-technical text-base font-bold text-white">
              ₹{retryRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-sky-400 font-medium">₹0 Direct Cost</span>
          </div>
          <p className="text-[11px] text-gray-400 pt-1 border-t border-[#1C202C]">
            Zero-contact automatic retry during temporary bank gateway downtime.
          </p>
        </div>

        {/* Human Escalation */}
        <div className="bg-[#12141D] p-4 rounded-xl border border-[#202534] space-y-2 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> High-Value Human Call
            </span>
            <span className="text-gray-400 font-technical text-[11px]">{humanAlloc.length} cases</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-technical text-base font-bold text-white">
              ₹{humanRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-amber-400 font-medium">Top 2% VIP</span>
          </div>
          <p className="text-[11px] text-gray-400 pt-1 border-t border-[#1C202C]">
            Dedicated voice concierge triage strictly reserved for high ticket transactions.
          </p>
        </div>

        {/* Suppression & Policy Guard */}
        <div className="bg-[#12141D] p-4 rounded-xl border border-[#202534] space-y-2 hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-rose-400 font-semibold flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5" /> Suppressed Outreach
            </span>
            <span className="text-gray-400 font-technical text-[11px]">{suppressedCases.length} cases</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-technical text-base font-bold text-gray-300">
              ₹{suppressedRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-gray-400 font-medium">Preserved Trust</span>
          </div>
          <p className="text-[11px] text-gray-400 pt-1 border-t border-[#1C202C]">
            Suppressed to prevent spam fatigue, quiet hours violations, and negative net EV.
          </p>
        </div>
      </div>
    </div>
  );
}
