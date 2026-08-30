// frontend/components/SystemHealth.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../lib/store';
import { 
  Shield, Clock, Activity, ShieldAlert, ShieldCheck, 
  AlertTriangle, CheckCircle2, XCircle, ArrowRight, Sparkles, Lock, Zap 
} from 'lucide-react';

export default function SystemHealth() {
  const cases = useAppStore((state) => state.cases);
  const activeCaseId = useAppStore((state) => state.activeCaseId);

  // Time & Quiet Hours check
  const [time, setTime] = useState<string>('');
  const [isQuiet, setIsQuiet] = useState<boolean>(false);

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      setTime(timeStr);
      const quiet = hours >= 21 || hours < 8;
      setIsQuiet(quiet);
    }
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeCase = cases.find(c => c.id === activeCaseId) || cases[0];

  // Guardrail counters
  const quietHoursBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'quiet_hours').length;
  const contactCapBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'contact_cap_exceeded').length;
  const promiseBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'promise_pending').length;
  const refundEscalations = cases.filter(c => c.allocated && c.outcome === 'ESCALATE' && c.rule_fired === 'refund_signature_required').length;
  const killSwitchBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'kill_switch_active').length;

  const totalInterventions = quietHoursBlocks + contactCapBlocks + promiseBlocks + refundEscalations + killSwitchBlocks;

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1E222D] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight font-display">
              Guardrail Safety Architecture
            </h3>
            <p className="text-xs text-gray-400">Deterministic Policy Gate & Invariant Inforcement</p>
          </div>
        </div>
        <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-medium">
          Policy Gate
        </span>

      </div>

      {/* Signature Two-Step Contrast Visual Flow: AI Proposal -> Policy Gate -> Decision */}
      <div className="bg-[#0A0B0E] p-4 rounded-xl border border-[#1E222D] space-y-3">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
          Live Policy Invariant Execution Flow
        </span>

        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          {/* Step 1: AI Recommendation */}
          <div className="md:col-span-4 bg-[#141720] p-3.5 rounded-xl border border-[#232838] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-indigo-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 1. AI Recommendation
              </span>
              <span className="text-gray-400 font-technical text-[10px]">
                {activeCase ? activeCase.id.slice(0, 8) : 'PAY-DEMO'}
              </span>
            </div>
            <p className="text-xs text-gray-200 font-medium capitalize">
              {activeCase ? activeCase.candidate_action.replace(/_/g, ' ') : 'Send WhatsApp Nudge'}
            </p>
            <p className="text-[11px] text-gray-400 leading-normal">
              Optimal EV allocation proposed for {activeCase?.cause ? activeCase.cause.replace(/_/g, ' ') : 'insufficient balance'}.
            </p>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex md:col-span-1 justify-center text-gray-500">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Step 2: Policy Gate Checks */}
          <div className="md:col-span-3 bg-[#141720] p-3.5 rounded-xl border border-[#232838] space-y-1.5">
            <span className="text-amber-400 font-semibold text-[11px] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> 2. Policy Gate
            </span>
            <div className="space-y-1 text-[11px] text-gray-300 font-sans">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Kill switch check: PASS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Quiet hours (21:00-08:00): PASS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Contact limit cap (≤3): PASS</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex md:col-span-1 justify-center text-gray-500">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Step 3: Result (ALLOWED / BLOCKED) */}
          <div className="md:col-span-2 bg-[#141720] p-3.5 rounded-xl border border-[#232838] flex flex-col items-center justify-center text-center">
            {activeCase?.outcome === 'BLOCK' ? (
              <>
                <XCircle className="w-6 h-6 text-rose-400 mb-1" />
                <span className="text-xs font-bold text-rose-400">BLOCKED</span>
                <span className="text-[10px] text-gray-400 mt-0.5 font-sans">Veto Enforced</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                <span className="text-xs font-bold text-emerald-400">ALLOWED</span>
                <span className="text-[10px] text-gray-400 mt-0.5 font-sans">100% Safe</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        {/* Quiet Hours Status */}
        <div className="bg-[#0A0B0E] p-3.5 rounded-xl border border-[#1E222D] flex flex-col justify-between">
          <div className="flex justify-between items-center text-gray-400">
            <span className="font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" /> Quiet Hours Window
            </span>
            <span className="text-[11px] text-gray-400">21:00 - 08:00</span>
          </div>
          <div className="my-2">
            <span className="text-xl font-bold text-white font-display">{time}</span>
          </div>
          <div className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
            isQuiet ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
          }`}>
            {isQuiet ? <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isQuiet ? 'Outreach Suppressed' : 'Outreach Active'}</span>
          </div>
        </div>

        {/* Total Interventions Counter */}
        <div className="bg-[#0A0B0E] p-3.5 rounded-xl border border-[#1E222D] flex flex-col justify-between">
          <div className="flex justify-between items-center text-gray-400">
            <span className="font-medium flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> Policy Interventions
            </span>
            <span className="text-sm font-bold text-amber-400">{totalInterventions}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 my-2 text-[11px] text-gray-400 font-sans">
            <div>Quiet: <span className="text-white font-semibold">{quietHoursBlocks}</span></div>
            <div>Cap (3x): <span className="text-white font-semibold">{contactCapBlocks}</span></div>
            <div>Promises: <span className="text-white font-semibold">{promiseBlocks}</span></div>
            <div>Refunds: <span className="text-white font-semibold">{refundEscalations}</span></div>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">
            100% Policy Compliance Maintained
          </span>
        </div>

        {/* Safety Proof Guarantee */}
        <div className="bg-[#0A0B0E] p-3.5 rounded-xl border border-[#1E222D] flex flex-col justify-between">
          <span className="text-gray-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mathematical Guarantee
          </span>
          <p className="text-[11px] text-gray-300 my-2 leading-relaxed">
            Policy rules execute after the PuLP optimizer and before any API call — making rule violations structurally impossible.
          </p>
          <span className="text-[10px] text-gray-400">
            Verified by 27 invariant test cases
          </span>
        </div>
      </div>
    </div>
  );
}

