'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Zap, ArrowRight, CheckCircle, XCircle, 
  TrendingUp, Activity, Cpu, Layers, MessageSquare 
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import AnimatedNumber from '../components/AnimatedNumber';

export default function LandingPage() {
  const fadeIn = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-transparent text-content-primary font-sans selection:bg-brand-jade-surface selection:text-brand-jade relative">

      {/* Header / Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-surface/85 backdrop-blur-md transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-jade flex items-center justify-center text-white font-bold font-display text-base tracking-tight shadow-sm">
              R
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase text-content-primary font-display">
                REVORA
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link 
              href="/dashboard" 
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-jade hover:bg-brand-jade-deep rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              Launch Platform →
            </Link>
          </div>
        </div>
      </header>

      {/* Live Data Ticker Strip */}
      <div className="w-full bg-surface-subtle/80 backdrop-blur-sm border-b border-border-subtle py-2 overflow-hidden flex items-center relative z-20">
        <div className="ticker__move flex items-center whitespace-nowrap">
          {[
            "₹4,200 recovered from gateway failure",
            "HDFC bank timeout resolved via automated retry",
            "₹15,400 refund escalated for dual-signoff authorization",
            "Quiet hours active: suppressed WhatsApp outreach, queued for 08:00 IST",
            "Payment commitment kept: customer settled ₹2,100, case closed",
            "UPI intent mismatch detected, auto-suggested alternative link",
            "Frequency cap active: maximum 3 outreaches reached, outreach suppressed",
            "₹890 payment recovered via WhatsApp interactive nudge",
            "Safety lock standby: deterministic policy guardrails enforcing 100% compliance"
          ].concat([
            "₹4,200 recovered from gateway failure",
            "HDFC bank timeout resolved via automated retry",
            "₹15,400 refund escalated for dual-signoff authorization",
            "Quiet hours active: suppressed WhatsApp outreach, queued for 08:00 IST",
            "Payment commitment kept: customer settled ₹2,100, case closed",
            "UPI intent mismatch detected, auto-suggested alternative link",
            "Frequency cap active: maximum 3 outreaches reached, outreach suppressed",
            "₹890 payment recovered via WhatsApp interactive nudge",
            "Safety lock standby: deterministic policy guardrails enforcing 100% compliance"
          ]).map((item, index) => (
            <span key={index} className="mx-6 text-[11px] font-sans text-content-secondary flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-jade"></span>
              {item}
              <span className="text-content-muted ml-4">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5 }}
          variants={fadeIn}
          className="space-y-4"
        >
          <span className="inline-block text-[11px] font-semibold tracking-wider text-brand-jade bg-brand-jade-surface border border-brand-jade-border px-3.5 py-1 rounded-full uppercase">
            AUTONOMOUS REVENUE RECOVERY & DETERMINISTIC GUARDRAILS
          </span>
          
          <h2 className="text-3xl sm:text-5xl lg:text-[56px] font-bold tracking-tight leading-[1.08] text-content-primary max-w-4xl mx-auto font-display">
            Most failed payments aren&apos;t gone. <br/>
            <span className="text-brand-jade">
              They&apos;re just unclaimed.
            </span>
          </h2>
          
          <p className="text-sm sm:text-base text-content-secondary max-w-2xl mx-auto leading-relaxed font-sans">
            Revora decides where a merchant&apos;s limited recovery effort earns the most back. 
            Guardrail makes sure it never oversteps.
          </p>

          <div className="pt-3">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-brand-jade hover:bg-brand-jade-deep text-white font-semibold text-sm tracking-wide transition-all shadow-sm cursor-pointer"
            >
              Launch Platform <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Integrated Interactive Perspective Preview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          className="mt-12 max-w-4xl mx-auto surface-elevated rounded-2xl overflow-hidden p-1 relative shadow-xl perspective-container backdrop-blur-md"
        >
          <div className="bg-surface/90 rounded-xl p-5 border border-border-subtle text-left space-y-4">
            {/* Mock Header */}
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-jade" />
                <span className="text-xs font-semibold text-content-primary font-display">
                  Live Capital Flow Pipeline
                </span>
              </div>
              <span className="text-[10px] text-brand-jade bg-brand-jade-surface px-2.5 py-0.5 rounded-full border border-brand-jade-border font-medium">
                LP Optimized
              </span>
            </div>

            {/* Mock Pipeline Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-surface-subtle p-3 rounded-lg border border-border-subtle space-y-1">
                <span className="text-[10px] text-content-tertiary uppercase block">1. Failed Payment</span>
                <span className="font-semibold text-content-primary block">₹4,200 (Insufficient Balance)</span>
                <span className="text-[10px] text-content-tertiary">P(Prior) = 65%</span>
              </div>
              <div className="bg-surface-subtle p-3 rounded-lg border border-border-subtle space-y-1">
                <span className="text-[10px] text-brand-brass uppercase block">2. Expected Value</span>
                <span className="font-semibold text-brand-brass block">+₹2,840 Net Value</span>
                <span className="text-[10px] text-content-tertiary">Channel Cost: ₹5</span>
              </div>
              <div className="bg-surface-subtle p-3 rounded-lg border border-border-subtle space-y-1">
                <span className="text-[10px] text-brand-steel uppercase block">3. Policy Gate</span>
                <span className="font-semibold text-brand-jade block">100% ALLOWED</span>
                <span className="text-[10px] text-content-tertiary">All 5 Invariants PASS</span>
              </div>
              <div className="bg-brand-jade-surface p-3 rounded-lg border border-brand-jade-border space-y-1">
                <span className="text-[10px] text-brand-jade uppercase block">4. Outcome</span>
                <span className="font-semibold text-brand-jade block">Recovered ₹4,200</span>
                <span className="text-[10px] text-brand-jade/80">Interactive Nudge</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Live Stat Strip */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-12 max-w-3xl mx-auto grid grid-cols-3 gap-4 border border-border-subtle bg-surface-subtle/80 backdrop-blur-md rounded-2xl p-6 shadow-sm"
        >
          <div className="text-center">
            <span className="text-2xl sm:text-4xl font-bold font-display text-brand-amber block tracking-tight">
              <AnimatedNumber value={7.9} decimals={1} suffix="%" />
            </span>
            <span className="text-[10px] sm:text-[11px] text-content-secondary font-medium uppercase tracking-wider block mt-1.5">Avg Failure Rate</span>
          </div>
          <div className="text-center border-x border-border-subtle px-4">
            <span className="text-2xl sm:text-4xl font-bold font-display text-brand-jade block tracking-tight">
              <AnimatedNumber value={85} decimals={0} suffix="%" />
            </span>
            <span className="text-[10px] sm:text-[11px] text-content-secondary font-medium uppercase tracking-wider block mt-1.5">Recoverable Yield</span>
          </div>
          <div className="text-center">
            <span className="text-2xl sm:text-4xl font-bold font-display text-content-primary block tracking-tight">
              <AnimatedNumber value={51.6} decimals={1} prefix="+" suffix="%" />
            </span>
            <span className="text-[10px] sm:text-[11px] text-content-secondary font-medium uppercase tracking-wider block mt-1.5">Net Optimization Uplift</span>
          </div>
        </motion.div>
      </section>

      {/* Section 2: The Bottleneck */}
      <section className="bg-surface/80 backdrop-blur-md border-y border-border-subtle py-16 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <span className="text-[11px] font-semibold tracking-wider text-brand-amber block uppercase font-sans">
                THE BOTTLENECK
              </span>
              <h3 className="text-2xl sm:text-3xl font-semibold text-content-primary tracking-tight font-display">
                The problem isn&apos;t detection. <br/>It&apos;s capacity.
              </h3>
              <p className="text-content-secondary text-sm leading-relaxed max-w-lg">
                Merchants already know when payments fail. The real bottleneck is that you have limited WhatsApp send limits, limited agent hours, and strict compliance outreach caps.
              </p>
              <p className="text-content-secondary text-sm leading-relaxed max-w-lg">
                Standard recovery tools contact everyone identically, wasting expensive channels on low-value retries while ignoring customer quiet hours or active commitments.
              </p>
            </div>

            {/* Contrast Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Naive Strategy */}
              <div className="surface-card p-5 space-y-3 rounded-xl border border-border-subtle bg-surface/90">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-brand-burgundy font-bold uppercase tracking-wider">NAIVE APPROACH</span>
                  <XCircle className="w-4 h-4 text-brand-burgundy" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden border border-border-subtle">
                    <div className="h-full w-full bg-brand-burgundy opacity-60"></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-content-tertiary font-sans">
                    <span>Outreach Waste</span>
                    <span>100% Unranked</span>
                  </div>
                </div>
                <p className="text-xs text-content-secondary leading-relaxed">
                  Contacts every failed transaction randomly. Depletes channel quotas instantly. Violates customer fatigue.
                </p>
              </div>

              {/* Revora Optimization */}
              <div className="surface-card p-5 space-y-3 rounded-xl border border-brand-jade-border bg-brand-jade-surface">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-brand-jade font-bold uppercase tracking-wider">REVORA OPTIMIZATION</span>
                  <CheckCircle className="w-4 h-4 text-brand-jade" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-brand-jade-border">
                    <div className="h-full w-[45%] bg-brand-jade"></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-content-tertiary font-sans">
                    <span>Allocated EV Budget</span>
                    <span>45% Optimal</span>
                  </div>
                </div>
                <p className="text-xs text-content-secondary leading-relaxed">
                  Ranks by Expected Value (EV). Solves a Mixed-Integer Linear Program (MILP) to focus budget on high-yield recoveries with zero policy violations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Four Operational Steps */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <span className="text-[11px] font-semibold tracking-wider text-brand-jade block uppercase font-sans">
            OPERATIONAL ARCHITECTURE
          </span>
          <h3 className="text-2xl sm:text-3xl font-semibold text-content-primary tracking-tight mt-1 font-display">
            Financial intelligence in four steps
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Step 1 */}
          <div className="surface-card p-5 rounded-2xl flex flex-col justify-between space-y-3 bg-surface/90 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-brand-steel-surface border border-brand-steel-border flex items-center justify-center text-brand-steel">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider mb-1">1. Diagnose</h4>
              <p className="text-xs text-content-secondary leading-relaxed">
                Extracts error signals to identify root cause (insufficient funds, OTP mismatch, bank timeouts).
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="surface-card p-5 rounded-2xl flex flex-col justify-between space-y-3 bg-surface/90 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-brand-brass-surface border border-brand-brass-border flex items-center justify-center text-brand-brass">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider mb-1">2. Triage & Optimize</h4>
              <p className="text-xs text-content-secondary leading-relaxed">
                Calculates Expected Net Value and solves MILP optimization under strict channel quotas.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="surface-card p-5 rounded-2xl flex flex-col justify-between space-y-3 bg-surface/90 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-brand-amber-surface border border-brand-amber-border flex items-center justify-center text-brand-amber">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider mb-1">3. Guardrail Gate</h4>
              <p className="text-xs text-content-secondary leading-relaxed">
                Enforces deterministic compliance checks (quiet hours, contact caps, active promises) before dispatch.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="surface-card p-5 rounded-2xl flex flex-col justify-between space-y-3 bg-surface/90 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-brand-jade-surface border border-brand-jade-border flex items-center justify-center text-brand-jade">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider mb-1">4. Execute & Learn</h4>
              <p className="text-xs text-content-secondary leading-relaxed">
                Dispatches silent retries, interactive WhatsApp nudges, or voice concierge with Bayesian learning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-surface/85 backdrop-blur-md border-t border-border-subtle py-16 text-center space-y-4">
        <h3 className="text-2xl sm:text-4xl font-semibold tracking-tight text-content-primary font-display">
          Ready to recover lost transaction revenue?
        </h3>
        <p className="text-content-secondary text-xs sm:text-sm max-w-md mx-auto">
          Start the local API, seed a batch of payment failures, and watch the optimization engine recover revenue in real time.
        </p>
        <div className="pt-2">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-jade hover:bg-brand-jade-deep text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            Launch Command Center <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-border-subtle text-[11px] text-content-tertiary font-sans bg-surface/50">
        © 2026 Revora — Revenue Recovery Intelligence
      </footer>

    </div>
  );
}
