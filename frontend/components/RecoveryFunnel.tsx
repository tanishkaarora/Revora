// frontend/components/RecoveryFunnel.tsx
import React from 'react';
import { useAppStore } from '../lib/store';
import { Shield, Sparkles, UserCheck, RefreshCw, Ban, Send, AlertTriangle, Clock, CalendarX, Moon } from 'lucide-react';

export default function RecoveryFunnel() {
  const cases = useAppStore((state) => state.cases);

  // Stage 1: Ingested
  const totalCount = cases.length;
  const totalValuePaise = cases.reduce((acc, c) => acc + c.amount_paise, 0);
  const totalValueRupees = totalValuePaise / 100.0;

  // Stage 2: Diagnosed Causes
  const balanceCount = cases.filter(c => c.cause === 'insufficient_balance').length;
  const timeoutCount = cases.filter(c => c.cause === 'bank_timeout').length;
  const otpCount = cases.filter(c => c.cause === 'wrong_otp').length;
  const mandateCount = cases.filter(c => c.cause === 'expired_mandate').length;
  const declineCount = cases.filter(c => c.cause === 'card_declined').length;

  // Stage 3: Triage Allocations & Drop-off reasons
  const whatsappAlloc = cases.filter(c => c.allocated && (c.candidate_action === 'send_whatsapp_nudge' || c.candidate_action === 'suggest_alt_method')).length;
  const humanAlloc = cases.filter(c => c.allocated && c.candidate_action === 'escalate_human').length;
  const retryAlloc = cases.filter(c => c.allocated && c.candidate_action === 'silent_retry').length;
  
  const negativeEvCount = cases.filter(c => (!c.allocated || c.candidate_action === 'suppress') && (c.expected_value <= 0 || c.triage_reason.toLowerCase().includes('expected value'))).length;
  const capacityExhaustedCount = cases.filter(c => (!c.allocated || c.candidate_action === 'suppress') && (c.triage_reason.toLowerCase().includes('capacity exhausted') || c.triage_reason.toLowerCase().includes('capacity'))).length;

  // Stage 4: Guardrail Drop-off reasons
  const allowedCount = cases.filter(c => c.allocated && c.outcome === 'ALLOW').length;
  const promisePendingBlocks = cases.filter(c => c.allocated && c.rule_fired === 'promise_pending').length;
  const quietHoursBlocks = cases.filter(c => c.allocated && c.rule_fired === 'quiet_hours').length;
  const contactCapBlocks = cases.filter(c => c.allocated && c.rule_fired === 'contact_cap_exceeded').length;
  const killSwitchBlocks = cases.filter(c => c.allocated && c.rule_fired === 'kill_switch_active').length;
  const refundEscalations = cases.filter(c => c.allocated && c.rule_fired === 'refund_signature_required').length;

  // Stage 5: Recovered
  const recoveredCases = cases.filter(c => c.recovered);
  const recoveredCount = recoveredCases.length;
  const recoveredValuePaise = recoveredCases.reduce((acc, c) => acc + c.amount_recovered_paise, 0);
  const recoveredValueRupees = recoveredValuePaise / 100.0;
  
  const recoveryRate = totalCount > 0 ? (recoveredCount / totalCount) * 100.0 : 0.0;

  return (
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-[#232630] pb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide uppercase text-white">
            Recovery Funnel & Drop-Off Attrition Root Causes
          </h3>
          <p className="text-xs text-gray-400">
            Categorized attribution of case progression and drop-offs pulled directly from Triage reasons and Guardrail rules.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500 font-medium mr-2">Recovery Yield:</span>
          <span className="text-sm font-bold font-mono text-emerald-400">{recoveryRate.toFixed(1)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
        {/* Stage 1: Ingested */}
        <div className="bg-[#0A0B0F] p-4 rounded-lg border border-[#1B1D25] relative">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500 rounded-r-lg opacity-40"></div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block font-mono">1. INGESTED</span>
          <span className="text-3xl font-extrabold font-mono block text-blue-400 mt-2 leading-none">{totalCount}</span>
          <span className="text-xs text-gray-400 font-mono block mt-1">₹{totalValueRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          <p className="text-[10px] text-gray-500 mt-2">All incoming failed transaction events</p>
        </div>

        {/* Stage 2: Diagnosed */}
        <div className="bg-[#0A0B0F] p-4 rounded-lg border border-[#1B1D25] relative">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-purple-500 rounded-r-lg opacity-40"></div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block font-mono">2. DIAGNOSED</span>
          <div className="mt-2 space-y-1 text-[10px] font-mono">
            <div className="flex justify-between"><span className="text-orange-400">Balance:</span><span className="font-bold">{balanceCount}</span></div>
            <div className="flex justify-between"><span className="text-blue-400">Timeout:</span><span className="font-bold">{timeoutCount}</span></div>
            <div className="flex justify-between"><span className="text-purple-400">Wrong OTP:</span><span className="font-bold">{otpCount}</span></div>
            <div className="flex justify-between"><span className="text-yellow-400">Mandate:</span><span className="font-bold">{mandateCount}</span></div>
            <div className="flex justify-between"><span className="text-red-400">Declined:</span><span className="font-bold">{declineCount}</span></div>
          </div>
        </div>

        {/* Stage 3: Triaged & Triage Drop-offs */}
        <div className="bg-[#0A0B0F] p-4 rounded-lg border border-[#1B1D25] relative">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500 rounded-r-lg opacity-40"></div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block font-mono">3. TRIAGED ALLOCATION</span>
          <div className="mt-2 space-y-1 text-[10px] font-mono">
            <div className="flex justify-between text-gray-300">
              <span className="text-emerald-400">WhatsApp Nudges:</span>
              <span className="font-bold">{whatsappAlloc}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span className="text-amber-400">Human Calls:</span>
              <span className="font-bold">{humanAlloc}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span className="text-sky-400">Silent Retries:</span>
              <span className="font-bold">{retryAlloc}</span>
            </div>
            <div className="pt-1.5 border-t border-[#1C1F2B] space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-gray-500 block">Triage Drop-Off Reasons:</span>
              <div className="flex justify-between text-red-400">
                <span>Negative ENV:</span>
                <span>{negativeEvCount}</span>
              </div>
              <div className="flex justify-between text-orange-400">
                <span>Capacity Full:</span>
                <span>{capacityExhaustedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stage 4: Guardrail Gated & Policy Drop-offs */}
        <div className="bg-[#0A0B0F] p-4 rounded-lg border border-[#1B1D25] relative">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-pink-500 rounded-r-lg opacity-40"></div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block font-mono">4. GUARDRAIL GATED</span>
          <div className="mt-2 space-y-1 text-[10px] font-mono">
            <div className="flex justify-between text-emerald-400">
              <span>ALLOWED:</span>
              <span className="font-bold">{allowedCount}</span>
            </div>
            <div className="pt-1.5 border-t border-[#1C1F2B] space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-gray-500 block">Guardrail Block Reasons:</span>
              {promisePendingBlocks > 0 && (
                <div className="flex justify-between text-purple-400">
                  <span>Promise Pending:</span>
                  <span>{promisePendingBlocks}</span>
                </div>
              )}
              {quietHoursBlocks > 0 && (
                <div className="flex justify-between text-indigo-400">
                  <span>Quiet Hours:</span>
                  <span>{quietHoursBlocks}</span>
                </div>
              )}
              {contactCapBlocks > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Contact Cap (3):</span>
                  <span>{contactCapBlocks}</span>
                </div>
              )}
              {killSwitchBlocks > 0 && (
                <div className="flex justify-between text-red-400 font-bold">
                  <span>Kill Switch:</span>
                  <span>{killSwitchBlocks}</span>
                </div>
              )}
              {refundEscalations > 0 && (
                <div className="flex justify-between text-yellow-400">
                  <span>Dual Auth Req:</span>
                  <span>{refundEscalations}</span>
                </div>
              )}
              {promisePendingBlocks === 0 && quietHoursBlocks === 0 && contactCapBlocks === 0 && (
                <div className="text-gray-500 italic text-[9px]">All allocated cleared rules</div>
              )}
            </div>
          </div>
        </div>

        {/* Stage 5: Recovered */}
        <div className="bg-emerald-950/20 p-4 rounded-lg border border-emerald-500/20 relative">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 rounded-r-lg opacity-50"></div>
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block font-mono">5. RECOVERED</span>
          <span className="text-3xl font-extrabold font-mono block text-emerald-400 mt-2 leading-none">{recoveredCount}</span>
          <span className="text-xs font-bold font-mono block text-white mt-1">₹{recoveredValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <p className="text-[9px] text-emerald-500/60 mt-2 font-medium">Reconciled funds collected</p>
        </div>
      </div>
    </div>
  );
}
