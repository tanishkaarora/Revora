// frontend/components/CaseDetailDrawer.tsx
import React from 'react';
import { useAppStore } from '../lib/store';
import { 
  X, ShieldAlert, BadgeInfo, Calculator, CalendarClock, 
  MessageSquare, AlertTriangle, ShieldCheck, ChevronRight, 
  Send, RefreshCw, Users, Shield, Clock, CheckCircle2, XCircle,
  TrendingUp, Sparkles, Activity
} from 'lucide-react';

export default function CaseDetailDrawer() {
  const cases = useAppStore((state) => state.cases);
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const setActiveCaseId = useAppStore((state) => state.setActiveCaseId);

  const c = cases.find(item => item.id === activeCaseId);
  if (!c) return null;

  const amountRupees = c.amount_paise / 100.0;
  const costRupees = c.cost / 100.0;
  const evRupees = c.expected_value / 100.0;
  const pRecovery = c.probability_estimate;

  // Base probabilities and costs for channel evaluation
  const allChannels = [
    { 
      action: 'silent_retry', 
      name: 'Silent Auto-Retry', 
      channel: 'retry',
      cost: 0, 
      p: c.cause === 'bank_timeout' ? 0.82 : 0.05, 
      fatigue: 0 
    },
    { 
      action: 'send_whatsapp_nudge', 
      name: 'WhatsApp Nudge', 
      channel: 'whatsapp',
      cost: 5.0, 
      p: c.cause === 'bank_timeout' ? 0.38 : c.cause === 'wrong_otp' ? 0.74 : 0.65, 
      fatigue: 2.0 
    },
    { 
      action: 'suggest_alt_method', 
      name: 'Alt Method Nudge', 
      channel: 'whatsapp',
      cost: 5.0, 
      p: c.cause === 'card_declined' ? 0.73 : 0.68, 
      fatigue: 2.0 
    },
    { 
      action: 'escalate_human', 
      name: 'Human Agent Call', 
      channel: 'human',
      cost: 150.0, 
      p: 0.82, 
      fatigue: 10.0 
    },
    { 
      action: 'suppress', 
      name: 'Suppress Outreach', 
      channel: 'suppress',
      cost: 0, 
      p: 0.0, 
      fatigue: 0 
    }
  ];

  // Calculate Net EV for each channel for this specific case
  const channelEVs = allChannels.map(ch => {
    const gross = ch.p * amountRupees;
    const net = ch.action === 'suppress' ? 0.0 : gross - ch.cost - ch.fatigue;
    return {
      ...ch,
      expectedNetRupees: net
    };
  }).sort((a, b) => b.expectedNetRupees - a.expectedNetRupees);

  // Deterministic explanation string
  const selectedChannelObj = channelEVs.find(ch => ch.action === c.candidate_action) || channelEVs[0];
  const runnerUp = channelEVs.find(ch => ch.action !== c.candidate_action && ch.action !== 'suppress') || channelEVs[1];

  let explanationText = '';
  if (c.candidate_action === 'suppress') {
    explanationText = `Case was suppressed because expected recovery value did not clear intervention costs or channel capacity was exhausted for this tier.`;
  } else {
    explanationText = `${selectedChannelObj.name} (${selectedChannelObj.channel}) was selected because it has the highest expected net value (₹${selectedChannelObj.expectedNetRupees.toFixed(2)}) under current capacity and fatigue constraints, ahead of ${runnerUp ? `${runnerUp.name} (₹${runnerUp.expectedNetRupees.toFixed(2)})` : 'other alternatives'}.`;
  }

  // Guardrail 5 Rule Checks
  const guardrailRules = [
    {
      name: '1. Kill-Switch Safety',
      desc: 'Ensures emergency kill switch is not active',
      passed: c.rule_fired !== 'kill_switch_active',
      fired: c.rule_fired === 'kill_switch_active'
    },
    {
      name: '2. Quiet Hours (08:00–21:00)',
      desc: 'Blocks unsolicited customer outreach during night hours',
      passed: c.rule_fired !== 'quiet_hours',
      fired: c.rule_fired === 'quiet_hours'
    },
    {
      name: '3. Contact Cap (Max 3)',
      desc: 'Prevents customer fatigue / harassment over-outreach',
      passed: c.rule_fired !== 'contact_cap_exceeded',
      fired: c.rule_fired === 'contact_cap_exceeded'
    },
    {
      name: '4. Active Promise Protection',
      desc: 'Suppresses contact if customer promised to pay',
      passed: c.rule_fired !== 'promise_pending',
      fired: c.rule_fired === 'promise_pending'
    },
    {
      name: '5. Refund Risk & Dual Auth',
      desc: 'Requires cryptographic signature on sensitive refunds',
      passed: c.rule_fired !== 'refund_signature_required',
      fired: c.rule_fired === 'refund_signature_required'
    }
  ];

  const getLifecycleColor = (state: string) => {
    switch (state) {
      case 'RECOVERED': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'CONTACTED': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'PROMISED':
      case 'WAITING': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'RETRY': return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'ESCALATED': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'SUPPRESSED': return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-[#111319] border-l border-[#232630] shadow-2xl z-50 flex flex-col overflow-hidden text-gray-200">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-[#232630] flex items-center justify-between bg-[#13161C]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-mono">Case: {c.id}</h3>
            <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${getLifecycleColor(c.lifecycle_state || 'DIAGNOSED')}`}>
              {c.lifecycle_state || 'DIAGNOSED'}
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">Customer ID: {c.customer_id}</span>
        </div>
        <button
          onClick={() => setActiveCaseId(null)}
          className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Deterministic Explanation Card */}
        <div className="bg-[#0A0B0F] p-4 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent">
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Deterministic Decision Rationale
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed font-sans">
            {explanationText}
          </p>
        </div>

        {/* All Channels EV Comparison */}
        <div className="bg-[#0A0B0F] p-4 rounded-xl border border-[#1B1D25] space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              Channel Expected Net Value (ENV)
            </h4>
            <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
              Revora Optimizer
            </span>
          </div>
          
          <div className="space-y-1.5">
            {channelEVs.map(ch => {
              const isSelected = ch.action === c.candidate_action;
              return (
                <div 
                  key={ch.action}
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all ${
                    isSelected 
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white' 
                      : 'bg-[#13151C] border-[#232630] text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                    <div>
                      <span className="font-semibold text-gray-200 block">{ch.name}</span>
                      <span className="text-[10px] text-gray-500">P(rec)={ch.p.toFixed(2)} | Cost=₹{ch.cost} | Fat=₹{ch.fatigue}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold ${isSelected ? 'text-emerald-400' : 'text-gray-300'}`}>
                      ENV: ₹{ch.expectedNetRupees.toFixed(2)}
                    </span>
                    {isSelected && (
                      <span className="block text-[9px] uppercase font-bold text-emerald-500">Selected</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step-by-Step Decision Trace Timeline */}
        <div className="bg-[#0A0B0F] p-4 rounded-xl border border-[#1B1D25]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              Decision Trace & Policy Timeline
            </h4>
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              Revora Audit
            </span>
          </div>

          <div className="space-y-4 relative pl-5 border-l border-[#232630]">
            {/* Step 1: Diagnosis */}
            <div className="relative">
              <div className="absolute -left-[25px] top-0.5 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-[#0A0B0F]" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-blue-400 font-bold block">STEP 1 — ROOT CAUSE DIAGNOSIS</span>
                  <span className="text-[8px] font-mono text-blue-300">Revora Intelligence</span>
                </div>
                <div className="text-xs text-gray-300 flex items-center gap-2 mt-0.5">
                  <span className="capitalize font-semibold">{c.cause.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">({(c.diagnosis_confidence * 100).toFixed(0)}% confidence)</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">Source: {c.diagnosis_source}</p>
              </div>

            </div>

            {/* Step 2: Scoring */}
            <div className="relative">
              <div className="absolute -left-[25px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0A0B0F]" />
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold block">STEP 2 — BAYESIAN PROBABILITY & ENV</span>
                <span className="text-xs text-gray-300 block">P(recovery) = {pRecovery.toFixed(2)} | Net EV = ₹{evRupees.toFixed(2)}</span>
                <p className="text-[10px] text-gray-500 mt-0.5">Calibrated via Bayesian Beta-Binomial with contact fatigue penalties</p>
              </div>
            </div>

            {/* Step 3: Optimizer */}
            <div className="relative">
              <div className="absolute -left-[25px] top-0.5 w-2.5 h-2.5 rounded-full bg-purple-400 border-2 border-[#0A0B0F]" />
              <div>
                <span className="text-[10px] font-mono text-purple-400 font-bold block">STEP 3 — LP CONSTRAINED OPTIMIZATION</span>
                <span className="text-xs text-gray-300 block capitalize">
                  {c.allocated ? `Assigned to ${c.channel} channel` : 'Suppressed (Capacity / EV)'}
                </span>
                <p className="text-[10px] text-gray-500 mt-0.5">{c.triage_reason}</p>
              </div>
            </div>

            {/* Step 4: Guardrail Rules */}
            <div className="relative">
              <div className="absolute -left-[25px] top-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#0A0B0F]" />
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold block">STEP 4 — 5-RULE GUARDRAIL VERIFICATION</span>
                <div className="space-y-1 mt-1.5">
                  {guardrailRules.map(rule => (
                    <div key={rule.name} className="flex items-center justify-between text-[10px] font-mono bg-[#13151C] px-2 py-1 rounded border border-[#232630]">
                      <span className="text-gray-300">{rule.name}</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold ${rule.passed ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {rule.passed ? 'PASS' : 'BLOCKED'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Guardrail Decision: <strong className="text-white">{c.outcome}</strong> ({c.rule_fired})</p>
              </div>
            </div>

            {/* Step 5: Execution & Outcome */}
            <div className="relative">
              <div className={`absolute -left-[25px] top-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0A0B0F] ${c.recovered ? 'bg-emerald-400' : 'bg-gray-500'}`} />
              <div>
                <span className="text-[10px] font-mono text-gray-400 font-bold block">STEP 5 — EXECUTION & OUTCOME</span>
                <span className="text-xs text-white font-semibold block">
                  {c.recovered ? `Recovered ₹${(c.amount_recovered_paise / 100.0).toFixed(2)}` : c.outcome === 'ALLOW' ? 'Outreach Dispatched' : 'Action Aborted'}
                </span>
                <p className="text-[10px] text-gray-500 mt-0.5">Lifecycle: {c.lifecycle_state || 'DIAGNOSED'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Logs */}
        {c.conversation && c.conversation.length > 0 && (
          <div className="bg-[#0A0B0F] p-4 rounded-xl border border-[#1B1D25] space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              Conversation Transcript
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {c.conversation.map((msg, i) => (
                <div 
                  key={i} 
                  className={`p-2.5 rounded-lg text-xs font-mono leading-relaxed ${
                    msg.sender === 'bot' 
                      ? 'bg-emerald-950/30 border border-emerald-800/30 text-emerald-200' 
                      : msg.sender === 'user'
                      ? 'bg-blue-950/30 border border-blue-800/30 text-blue-200'
                      : 'bg-gray-800/40 border border-gray-700/40 text-gray-300'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">
                    {msg.sender} • {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                  {msg.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
