'use client';

import React from 'react';
import { useAppStore } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calculator, MessageSquare, AlertTriangle, ShieldCheck, 
  Sparkles, Activity, CheckCircle2, Lock, Zap, Check
} from 'lucide-react';
import WhatsAppSimulator from './WhatsAppSimulator';
import AnimatedNumber from './AnimatedNumber';

export default function CaseDetailDrawer() {
  const cases = useAppStore((state) => state.cases);
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const setActiveCaseId = useAppStore((state) => state.setActiveCaseId);
  const selectedTab = useAppStore((state) => state.selectedTab);

  const c = cases.find(item => item.id === activeCaseId);
  if (!c || selectedTab !== 'overview') return null;

  const amountRupees = c.amount_paise / 100.0;
  const costRupees = c.cost / 100.0;
  const evRupees = c.expected_value / 100.0;
  const pRecovery = c.probability_estimate;

  // Base probabilities and costs for channel evaluation
  const allChannels = [
    { 
      action: 'silent_retry', 
      name: 'Silent Network Retry', 
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
      name: 'Voice Concierge Triage', 
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

  let explanationText = '';
  if (c.candidate_action === 'suppress') {
    explanationText = `Suppression selected: gross expected recovery did not clear direct outreach cost and customer fatigue penalties.`;
  } else {
    explanationText = `${selectedChannelObj.name} achieves highest Expected Net Value (₹${selectedChannelObj.expectedNetRupees.toFixed(2)}) factoring ₹${selectedChannelObj.cost} direct cost and ₹${selectedChannelObj.fatigue} fatigue penalty.`;
  }

  // Guardrail 5 Rule Checks
  const guardrailRules = [
    {
      name: 'Kill-Switch Safety',
      desc: 'Operational emergency stop check',
      passed: c.rule_fired !== 'kill_switch_active'
    },
    {
      name: 'Quiet Hours (21:00–08:00)',
      desc: 'Suppresses nighttime outreach',
      passed: c.rule_fired !== 'quiet_hours'
    },
    {
      name: 'Contact Frequency Cap (≤3)',
      desc: 'Limits contact fatigue',
      passed: c.rule_fired !== 'contact_cap_exceeded'
    },
    {
      name: 'Active Promise Protection',
      desc: 'Honors commitment windows',
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
      case 'RECOVERED': return 'bg-brand-jade-surface text-brand-jade border-brand-jade-border';
      case 'CONTACTED': return 'bg-brand-steel-surface text-brand-steel border-brand-steel-border';
      case 'PROMISED':
      case 'WAITING': return 'bg-brand-brass-surface text-brand-brass border-brand-brass-border';
      case 'RETRY': return 'bg-brand-steel-surface text-brand-steel border-brand-steel-border';
      case 'ESCALATED': return 'bg-brand-amber-surface text-brand-amber border-brand-amber-border';
      default: return 'bg-surface-subtle text-content-tertiary border-border-subtle';
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" 
        onClick={() => setActiveCaseId(null)}
      >
        <motion.div 
          initial={{ x: 500, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 500, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:w-[560px] bg-surface border-l border-border-muted shadow-2xl h-full flex flex-col overflow-hidden text-content-primary"
        >
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-subtle">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-semibold text-content-primary font-display">
                  Decision Intelligence Rationale
                </h3>
                <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${getLifecycleColor(c.lifecycle_state || 'DIAGNOSED')}`}>
                  {c.lifecycle_state || 'DIAGNOSED'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-content-secondary">
                <span>Customer: <strong className="text-content-primary">{c.customer_name}</strong></span>
                <span className="font-technical text-content-tertiary">ID: {c.id}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveCaseId(null)}
              className="p-1.5 rounded-lg hover:bg-surface text-content-tertiary hover:text-content-primary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Primary Recommended Action Card */}
            <div className="surface-elevated p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-jade uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Optimal Action Selected
                </span>
                <span className="text-[10px] text-content-tertiary bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle font-medium">
                  PuLP LP Solver
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <h4 className="text-lg font-bold text-content-primary capitalize font-display">
                    {c.candidate_action.replace(/_/g, ' ')}
                  </h4>
                  <span className="text-xs text-content-secondary">
                    Channel: <strong className="text-content-primary uppercase">{c.channel || 'Auto'}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-technical text-lg font-bold text-brand-jade block">
                    +₹{evRupees.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-content-tertiary">Expected Net Value</span>
                </div>
              </div>

              {/* Key Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-border-subtle text-xs">
                <div>
                  <span className="text-content-tertiary block text-[10px]">Payment Value</span>
                  <span className="font-technical font-bold text-content-primary">₹{amountRupees.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-content-tertiary block text-[10px]">P(Recovery)</span>
                  <span className="font-technical font-bold text-brand-jade">{(pRecovery * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-content-tertiary block text-[10px]">Channel Cost</span>
                  <span className="font-technical font-bold text-content-secondary">₹{costRupees.toFixed(2)}</span>
                </div>
              </div>

              {/* Why Justification */}
              <div className="bg-surface-subtle p-3 rounded-xl border border-border-subtle text-xs text-content-secondary leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-brand-brass shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-content-primary block mb-0.5">Decision Justification:</span>
                  {explanationText}
                </div>
              </div>
            </div>

            {/* Why Not the Alternatives? Ranked Comparison */}
            <div className="surface-card p-5 rounded-2xl space-y-3.5">
              <div className="flex justify-between items-center border-b border-border-subtle pb-2">
                <h4 className="text-xs font-semibold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-brand-steel" />
                  Why Not The Alternatives?
                </h4>
                <span className="text-[10px] text-content-tertiary font-sans">Ranked by Net EV</span>
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
                            <CheckCircle2 className="w-3.5 h-3.5 text-brand-jade shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-border-muted shrink-0" />
                          )}
                          <span className={isSelected ? 'font-semibold text-content-primary' : 'text-content-secondary'}>
                            {ch.name}
                          </span>
                        </div>
                        <span className={`font-technical ${isSelected ? 'font-bold text-brand-jade' : 'text-content-tertiary'}`}>
                          ₹{ch.expectedNetRupees.toFixed(2)}
                        </span>
                      </div>

                      {/* Bar comparison */}
                      <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border border-border-subtle">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSelected 
                              ? 'bg-brand-jade' 
                              : 'bg-content-muted'
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
              <div className="flex justify-between items-center border-b border-border-subtle pb-2">
                <h4 className="text-xs font-semibold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-brand-steel" />
                  Decision Audit Trace
                </h4>
                <span className="text-[10px] text-brand-jade bg-brand-jade-surface px-2 py-0.5 rounded border border-brand-jade-border font-medium">
                  Verified
                </span>
              </div>

              <div className="space-y-3.5 pl-4 border-l border-border-muted relative text-xs">
                {/* 1. Diagnosis */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-steel border-2 border-surface" />
                  <span className="text-[10px] font-semibold text-brand-steel uppercase tracking-wide block">1. Diagnosis</span>
                  <p className="text-content-primary font-medium capitalize mt-0.5">
                    {c.cause.replace(/_/g, ' ')} ({(c.diagnosis_confidence * 100).toFixed(0)}% confidence)
                  </p>
                  <span className="text-[10px] text-content-tertiary">Source: {c.diagnosis_source}</span>
                </div>

                {/* 2. Optimization */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-brass border-2 border-surface" />
                  <span className="text-[10px] font-semibold text-brand-brass uppercase tracking-wide block">2. Optimization</span>
                  <p className="text-content-primary font-medium mt-0.5">
                    Allocated to {c.channel || 'retry'} channel
                  </p>
                  <span className="text-[10px] text-content-tertiary">P={pRecovery.toFixed(2)} | Net EV=+₹{evRupees.toFixed(2)}</span>
                </div>

                {/* 3. Safety Guardrails */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-amber border-2 border-surface" />
                  <span className="text-[10px] font-semibold text-brand-amber uppercase tracking-wide block">3. Policy Gate</span>
                  <div className="space-y-1 mt-1.5">
                    {guardrailRules.map(rule => (
                      <div key={rule.name} className="flex items-center justify-between text-[11px] bg-surface-subtle px-2.5 py-1 rounded border border-border-subtle">
                        <span className="text-content-secondary">{rule.name}</span>
                        <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${rule.passed ? 'text-brand-jade bg-brand-jade-surface' : 'text-brand-burgundy bg-brand-burgundy-surface'}`}>
                          {rule.passed ? 'PASS' : 'BLOCKED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Execution */}
                <div className="relative">
                  <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-surface ${c.recovered ? 'bg-brand-jade' : 'bg-content-muted'}`} />
                  <span className="text-[10px] font-semibold text-content-tertiary uppercase tracking-wide block">4. Outcome</span>
                  <p className="text-content-primary font-semibold mt-0.5">
                    {c.recovered ? `Recovered ₹${(c.amount_recovered_paise / 100.0).toFixed(2)}` : c.outcome === 'ALLOW' ? 'Dispatched' : 'Suppressed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive WhatsApp Simulator Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-brand-jade" />
                WhatsApp Channel Simulator
              </h4>
              <WhatsAppSimulator />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
