// frontend/components/GuardrailCounter.tsx
import React from 'react';
import { useAppStore } from '../lib/store';
import { Shield, AlertTriangle, Clock, EyeOff, FileSignature } from 'lucide-react';

export default function GuardrailCounter() {
  const cases = useAppStore((state) => state.cases);

  // Count only cases that Triage allocated capacity to, but Guardrail overrode
  const quietHoursBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'quiet_hours').length;
  const contactCapBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'contact_cap_exceeded').length;
  const promiseBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'promise_pending').length;
  const refundEscalations = cases.filter(c => c.allocated && c.outcome === 'ESCALATE' && c.rule_fired === 'refund_signature_required').length;
  const killSwitchBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'kill_switch_active').length;

  const totalInterventions = quietHoursBlocks + contactCapBlocks + promiseBlocks + refundEscalations + killSwitchBlocks;

  return (
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-400 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          Guardrail Interventions
        </h3>
        <span className="text-2xl font-bold font-mono text-amber-500 animate-pulse-slow">
          {totalInterventions}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Kill Switch */}
        <div className="bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-500" /> Kill Switch
          </span>
          <span className="text-lg font-bold font-mono text-red-500 mt-1">{killSwitchBlocks}</span>
        </div>

        {/* Quiet Hours */}
        <div className="bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-400" /> Quiet Hours
          </span>
          <span className="text-lg font-bold font-mono text-blue-400 mt-1">{quietHoursBlocks}</span>
        </div>

        {/* Contact Cap */}
        <div className="bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <EyeOff className="w-3 h-3 text-orange-400" /> Contact Caps
          </span>
          <span className="text-lg font-bold font-mono text-orange-400 mt-1">{contactCapBlocks}</span>
        </div>

        {/* Promise Suppressions */}
        <div className="bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Shield className="w-3 h-3 text-amber-500" /> Active Promises
          </span>
          <span className="text-lg font-bold font-mono text-amber-500 mt-1">{promiseBlocks}</span>
        </div>

        {/* Refund Sign-off */}
        <div className="col-span-2 bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] flex items-center justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FileSignature className="w-3.5 h-3.5 text-purple-400" /> Refund Approvals Escalated
          </span>
          <span className="text-lg font-bold font-mono text-purple-400">{refundEscalations}</span>
        </div>
      </div>
      
      <p className="text-[10px] text-gray-500 mt-3 text-center italic">
        *Shows overrides of optimized Triage recommendations only.
      </p>
    </div>
  );
}
