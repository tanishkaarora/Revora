// frontend/components/CaseDetailDrawer.tsx
import React from 'react';
import { useAppStore } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldAlert, BadgeInfo, Calculator, CalendarClock, 
  MessageSquare, AlertTriangle, ShieldCheck, ChevronRight, 
  Send, RefreshCw, Users, Shield, Clock, CheckCircle2, XCircle,
  TrendingUp, Sparkles, Activity, Check, HelpCircle, Lock, Zap
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
      name: 'Silent Network Auto-Retry', 
      channel: 'retry',
      cost: 0, 
      p: c.cause === 'bank_timeout' ? 0.82 : 0.05, 
      fatigue: 0 
    },
    { 
      action: 'send_whatsapp_nudge', 
      name: 'WhatsApp Interactive Nudge', 
      channel: 'whatsapp',
      cost: 5.0, 
      p: c.cause === 'bank_timeout' ? 0.38 : c.cause === 'wrong_otp' ? 0.74 : 0.65, 
      fatigue: 2.0 
    },
    { 
      action: 'suggest_alt_method', 
      name: 'Alt Payment Link', 
      channel: 'whatsapp',
      cost: 5.0, 
      p: c.cause === 'card_declined' ? 0.73 : 0.68, 
      fatigue: 2.0 
    },
    { 
      action: 'escalate_human', 
      name: 'Human Support Callback', 
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

  // Highest EV channel
  const maxNetEV = Math.max(...channelEVs.map(ch => ch.expectedNetRupees), 1);
  const selectedChannelObj = channelEVs.find(ch => ch.action === c.candidate_action) || channelEVs[0];
  const runnerUp = channelEVs.find(ch => ch.action !== c.candidate_action && ch.action !== 'suppress') || channelEVs[1];

  let explanationText = '';
  if (c.candidate_action === 'suppress') {
    explanationText = `Suppression selected: gross expected recovery did not clear direct outreach and customer fatigue penalties.`;
  } else {
    explanationText = `${selectedChannelObj.name} achieves highest Expected Net Value (₹${selectedChannelObj.expectedNetRupees.toFixed(2)}) factoring ₹${selectedChannelObj.cost} direct cost and ₹${selectedChannelObj.fatigue} fatigue penalty.`;
  }

  // Guardrail 5 Rule Checks
  const guardrailRules = [
    {
      name: 'Kill-Switch Safety',
      desc: 'Operational kill switch check',
      passed: c.rule_fired !== 'kill_switch_active'
    },
    {
      name: 'Quiet Hours (21:00–08:00)',
      desc: 'Blocks night-time customer contact',
      passed: c.rule_fired !== 'quiet_hours'
    },
    {
      name: 'Contact Frequency Cap (≤3)',
      desc: 'Suppresses contact fatigue',
      passed: c.rule_fired !== 'contact_cap_exceeded'
    },
    {
      name: 'Active Promise Protection',
      desc: 'Honors payment commitments',
      passed: c.rule_fired !== 'promise_pending'
    },
    {
      name: 'High-Value Dual Authorization',
      desc: 'Requires HMAC signature on refunds >₹5,000',
      passed: c.rule_fired !== 'refund_signature_required'
    }
  ];

  const getLifecycleColor = (state: string) => {
    switch (state) {
      case 'RECOVERED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CONTACTED': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'PROMISED':
      case 'WAITING': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'RETRY': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'ESCALATED': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setActiveCaseId(null)}>
        <motion.div 
          initial={{ x: 480, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 480, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:w-[560px] bg-[#111319] border-l border-[#1E222D] shadow-2xl h-full flex flex-col overflow-hidden text-slate-200"
        >
          {/* Drawer Header */}
          <div className="px-6 py-4.5 border-b border-[#1E222D] flex items-center justify-between bg-[#151821]">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-semibold text-white font-display">
                  Case Decision Rationale
                </h3>
                <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${getLifecycleColor(c.lifecycle_state || 'DIAGNOSED')}`}>
                  {c.lifecycle_state || 'DIAGNOSED'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span>Customer: <strong className="text-gray-200">{c.customer_name}</strong></span>
                <span className="font-technical text-gray-400">ID: {c.id}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveCaseId(null)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Prominent Recommended Action Card */}
            <div className="bg-gradient-to-br from-[#181B26] to-[#12141D] p-5 rounded-2xl border border-[#262D3E] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Zap className="w-3.5 h-3.5" /> Optimal Recovery Action
                </span>
                <span className="text-[10px] text-gray-400 bg-[#10121A] px-2 py-0.5 rounded border border-[#202534]">
                  Triage Result
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white capitalize font-display">
                    {c.candidate_action.replace(/_/g, ' ')}
                  </h4>
                  <span className="text-xs text-gray-400">
                    Channel: <strong className="text-gray-200 uppercase">{c.channel || 'Auto'}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-technical text-lg font-bold text-emerald-400 block">
                    +₹{evRupees.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-400">Expected Net Value (ENV)</span>
                </div>
              </div>

              {/* Key Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#222838] text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Transaction Value</span>
                  <span className="font-technical font-bold text-white">₹{amountRupees.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Recovery Probability</span>
                  <span className="font-technical font-bold text-emerald-400">{(pRecovery * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Execution Cost</span>
                  <span className="font-technical font-bold text-gray-300">₹{costRupees.toFixed(2)}</span>
                </div>
              </div>

              {/* Why One-Liner */}
              <div className="bg-[#0A0B0E] p-3 rounded-xl border border-[#1E222D] text-xs text-gray-300 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-indigo-300 block mb-0.5">Why this decision?</span>
                  {explanationText}
                </div>
              </div>
            </div>

            {/* Why Not the Alternatives? Comparison Bars */}
            <div className="surface-card p-5 rounded-2xl space-y-3.5">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-purple-400" />
                  Why Not The Alternatives?
                </h4>
                <span className="text-[10px] text-gray-400">Ranked by Net EV</span>
              </div>

              <div className="space-y-3">
                {channelEVs.map(ch => {
                  const isSelected = ch.action === c.candidate_action;
                  const ratio = Math.max(0, Math.min(100, (ch.expectedNetRupees / maxNetEV) * 100));

                  return (
                    <div key={ch.action} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-gray-600 shrink-0" />
                          )}
                          <span className={isSelected ? 'font-semibold text-white' : 'text-gray-400'}>
                            {ch.name}
                          </span>
                        </div>
                        <span className={`font-technical ${isSelected ? 'font-bold text-emerald-400' : 'text-gray-400'}`}>
                          ₹{ch.expectedNetRupees.toFixed(2)}
                        </span>
                      </div>

                      {/* Bar comparison */}
                      <div className="w-full bg-[#1A1D27] h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSelected 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                              : 'bg-gray-700'
                          }`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step Decision Trace Timeline */}
            <div className="surface-card p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  Decision Audit Trail
                </h4>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                  Verified Trace
                </span>
              </div>


              <div className="space-y-4 pl-4 border-l border-[#222736] relative text-xs">
                {/* 1. Diagnosis */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-sky-400 border-2 border-[#111319]" />
                  <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wide block">1. Diagnosis</span>
                  <p className="text-gray-200 font-medium capitalize mt-0.5">
                    {c.cause.replace(/_/g, ' ')} ({(c.diagnosis_confidence * 100).toFixed(0)}% confidence)
                  </p>
                  <span className="text-[10px] text-gray-400">Source: {c.diagnosis_source}</span>
                </div>

                {/* 2. Bayesian Prior & Optimization */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-400 border-2 border-[#111319]" />
                  <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide block">2. Optimization</span>
                  <p className="text-gray-200 font-medium mt-0.5">
                    Allocated to {c.channel || 'retry'} channel
                  </p>
                  <span className="text-[10px] text-gray-400">P(rec)={pRecovery.toFixed(2)} | Net EV=+₹{evRupees.toFixed(2)}</span>
                </div>

                {/* 3. Safety Guardrails */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#111319]" />
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide block">3. Policy Gate</span>
                  <div className="space-y-1 mt-1.5">
                    {guardrailRules.map(rule => (
                      <div key={rule.name} className="flex items-center justify-between text-[11px] bg-[#161922] px-2.5 py-1 rounded border border-[#222736]">
                        <span className="text-gray-300">{rule.name}</span>
                        <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${rule.passed ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                          {rule.passed ? 'PASS' : 'BLOCKED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Execution */}
                <div className="relative">
                  <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#111319] ${c.recovered ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block">4. Outcome</span>
                  <p className="text-white font-semibold mt-0.5">
                    {c.recovered ? `Recovered ₹${(c.amount_recovered_paise / 100.0).toFixed(2)}` : c.outcome === 'ALLOW' ? 'Dispatched' : 'Suppressed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Conversation Logs */}
            {c.conversation && c.conversation.length > 0 && (
              <div className="surface-card p-5 rounded-2xl space-y-3">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  Conversation Transcript
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {c.conversation.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-xl text-xs leading-relaxed ${
                        msg.sender === 'bot' 
                          ? 'bg-emerald-950/20 border border-emerald-500/20 text-emerald-200' 
                          : msg.sender === 'user'
                          ? 'bg-sky-950/20 border border-sky-500/20 text-sky-200'
                          : 'bg-gray-800/30 border border-gray-700/30 text-gray-300'
                      }`}
                    >
                      <span className="text-[10px] font-medium text-gray-400 block mb-0.5">
                        {msg.sender === 'bot' ? 'Revora Assistant' : msg.sender === 'user' ? 'Customer' : 'System'} • {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                      {msg.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

