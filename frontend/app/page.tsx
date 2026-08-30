// frontend/app/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { 
  Zap, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  ArrowRight, 
  Database, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  TrendingUp,
  Activity,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface CountUpProps {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

function CountUp({ to, duration = 1.2, decimals = 0, prefix = '', suffix = '' }: CountUpProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const easedProgress = progress * (2 - progress); // easeOutQuad
      
      setCount(easedProgress * to);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [isInView, to, duration]);

  const formattedValue = count.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}

export default function LandingPage() {
  // Simple animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-transparent text-gray-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-400 relative">

      {/* Glow effects behind content */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Header / Nav (Sticky on scroll past top, with blur backdrop) */}
      <header className="sticky top-0 z-50 w-full border-b border-[#232630]/30 bg-[#0A0B0F]/80 backdrop-blur-md transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold font-mono text-base tracking-tighter">
              R
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase">
                REVORA <span className="text-[10px] text-gray-500 font-normal">v2.0</span>
              </h1>
            </div>
          </div>


          <Link 
            href="/dashboard" 
            className="px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl transition-all duration-300 flex items-center gap-1.5"
          >
            Launch Console →
          </Link>
        </div>
      </header>

      {/* Live Data Ticker Strip (Synthetic loop of live recovery activity) */}
      <div className="ticker-wrap w-full bg-[#0A0B0F]/40 border-b border-[#232630]/30 py-2 overflow-hidden flex items-center relative z-20">
        <div className="ticker__move flex items-center whitespace-nowrap">
          {[
            "₹4,200 recovered from gateway failure",
            "HDFC bank timeout resolved via automated retry",
            "₹15,400 refund approved & escalated for manual signoff",
            "Quiet hours active: suppressed WhatsApp outreach, queued for 08:00",
            "Promise kept: customer paid outstanding ₹2,100, case closed",
            "UPI intent mismatch detected, auto-suggested alternative method",
            "Limit lock active: maximum 3 outreaches reached, suppressed",
            "₹890 payment recovered via WhatsApp interactive nudge",
            "Veto switch standby: policy guardrails enforcing 100% compliance"
          ].concat([
            "₹4,200 recovered from gateway failure",
            "HDFC bank timeout resolved via automated retry",
            "₹15,400 refund approved & escalated for manual signoff",
            "Quiet hours active: suppressed WhatsApp outreach, queued for 08:00",
            "Promise kept: customer paid outstanding ₹2,100, case closed",
            "UPI intent mismatch detected, auto-suggested alternative method",
            "Limit lock active: maximum 3 outreaches reached, suppressed",
            "₹890 payment recovered via WhatsApp interactive nudge",
            "Veto switch standby: policy guardrails enforcing 100% compliance"
          ]).map((item, index) => (
            <span key={index} className="mx-6 text-[10px] font-mono text-gray-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse"></span>
              {item}
              <span className="text-gray-700 ml-4">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-8 pb-12 text-center relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6 }}
          variants={fadeIn}
          className="space-y-4"
        >
          <span className="inline-block text-[10px] sm:text-xs font-black font-mono tracking-[0.2em] text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 px-3.5 py-1 rounded-full uppercase">
            RAZORPAY AI BUILDATHON 2026 · AI REVENUE RECOVERY
          </span>
          
          <h2 className="text-3xl sm:text-5xl lg:text-[62px] font-semibold tracking-tight leading-[1.05] text-white max-w-4xl mx-auto display-font">
            Most failed payments aren&apos;t gone. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
              They&apos;re just unclaimed.
            </span>
          </h2>
          
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Revora decides where a merchant&apos;s limited recovery effort earns the most back. 
            Guardrail makes sure it never oversteps.
          </p>

          <div className="pt-2">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-sm font-bold uppercase tracking-wider glow-cta shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] transition-shadow duration-300 cursor-pointer"
            >
              Launch the Command Center <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Mock Browser Chrome Frame displaying Dashboard Screenshot Preview Peek */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="mt-8 max-w-4xl mx-auto bg-[#111319]/80 border border-[#232630]/80 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-950/20 backdrop-blur-sm relative max-h-[420px]"
        >
          {/* Browser Top Bar */}
          <div className="bg-[#15171F] px-4 py-2.5 border-b border-[#232630]/80 flex items-center gap-3">
            {/* Window Dots */}
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/60 block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/60 block"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/60 block"></span>
            </div>
            {/* Address Bar */}
            <div className="flex-1 max-w-md mx-auto bg-[#0A0B0F]/70 border border-[#232630]/50 rounded-lg py-1 px-3 text-[10px] font-mono text-gray-500 tracking-wide text-left truncate flex items-center gap-1.5">
              <span className="text-emerald-500/60">https://</span>
              <span>localhost:3000/dashboard</span>
            </div>
          </div>
          
          {/* Browser Content / Image Container */}
          <div className="relative w-full overflow-hidden bg-[#0A0B0F]">
            <img 
              src="/dashboard-screenshot.png" 
              alt="Revora Recovery Command Center Live Dashboard" 
              className="w-full h-auto block object-cover object-top hover:scale-[1.01] transition-transform duration-700 ease-out"
            />

            {/* Bottom Gradient Fade Mask for Intentional Preview Peek */}
            <div 
              className="absolute inset-x-0 bottom-0 h-36 pointer-events-none z-10"
              style={{
                background: "linear-gradient(to bottom, transparent 30%, rgba(10, 11, 15, 0.85) 75%, #0A0B0F 100%)"
              }}
            />
          </div>
        </motion.div>

        {/* Live Stat Strip (Animated appearance and counter logic) */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-14 max-w-3xl mx-auto grid grid-cols-3 gap-4 border border-[#232630]/60 bg-[#111319]/40 backdrop-blur-md rounded-2xl p-6 shadow-xl"
        >
          <div className="text-center">
            <span className="text-2xl sm:text-4xl font-extrabold font-mono text-orange-400 block tracking-tight">
              <CountUp to={7.9} decimals={1} suffix="%" />
            </span>
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest block mt-2">Avg Failure Rate</span>
          </div>
          <div className="text-center border-x border-[#232630]/60 px-4">
            <span className="text-2xl sm:text-4xl font-extrabold font-mono text-emerald-400 block tracking-tight">
              <CountUp to={85} decimals={0} suffix="%" />
            </span>
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest block mt-2">Recoverable Yield</span>
          </div>
          <div className="text-center">
            <span className="text-2xl sm:text-4xl font-extrabold font-mono text-gray-400 block tracking-tight">
              <CountUp to={0} decimals={0} prefix="₹" />
            </span>
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest block mt-2">Naive Recovery</span>
          </div>
        </motion.div>
      </section>

      {/* Section 2: The Real Problem */}
      <motion.section 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-[#111319]/40 border-y border-[#232630]/50 py-20 relative"
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-[10px] font-black font-mono tracking-widest text-orange-400 block uppercase">
                THE BOTTLENECK
              </span>
              <h3 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight display-font">
                The problem isn&apos;t detection. <br/>It&apos;s capacity.
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
                Merchants already know when payments fail. The real bottleneck is that you have limited WhatsApp send limits, limited agent hours, and strict compliance-capped outreach caps.
              </p>
              <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
                Standard recovery tools contact everyone identically, wasting expensive channels on low-value retries while ignoring customer quiet hours or active promises.
              </p>
            </div>

            {/* Two-Column Visual Contrast Grid (Staggered Children) */}
            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {/* Naive Strategy */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
                }}
                className="animated-border-card naive-hover p-5 space-y-4 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/40 transition-all duration-300"
                style={{ '--border-glow-color': '#EF4444' } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest">NAIVE APPROACH</span>
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-red-950/20 border border-red-500/10 rounded overflow-hidden">
                    <div className="h-full w-full bg-red-600/30"></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                    <span>Outbox Waste</span>
                    <span>100%</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal font-light">
                  Contacts every failed txn randomly. Runs out of daily WhatsApp caps and agent bandwidth instantly. Blocks refund approvals.
                </p>
              </motion.div>

              {/* Revora Triage */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
                }}
                className="animated-border-card revora-hover p-5 space-y-4 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/40 transition-all duration-300"
                style={{ '--border-glow-color': '#10B981' } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">REVORA APPROACH</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <div className="h-2 w-full bg-emerald-950/20 border border-emerald-500/20 rounded overflow-hidden">
                    <div className="h-full w-[45%] bg-emerald-500/50"></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                    <span>Allocated EV Budget</span>
                    <span>45% Used</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal font-light">
                  Ranks by Expected Value (EV). Solves a linear program to focus budget on high-value recoveries. Enforces compliance rules.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Section 3: How it Works (4 Steps) */}
      <motion.section 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-5xl mx-auto px-6 py-20"
      >
        <div className="text-center mb-12">
          <span className="text-[10px] font-black font-mono tracking-widest text-emerald-400 block uppercase">
            OPERATIONAL ARCHITECTURE
          </span>
          <h3 className="text-3xl font-semibold text-white tracking-tight mt-2 display-font">
            Automated intelligence in four steps
          </h3>
        </div>

        {/* 4 Cards (Staggered Children with rotating borders) */}
        <motion.div 
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Card 1: Diagnose */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
            className="animated-border-card diagnose-hover p-5 flex flex-col justify-between min-h-[180px] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/40 transition-all duration-300"
            style={{ '--border-glow-color': '#3B82F6' } as React.CSSProperties}
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-1.5">1. Diagnose</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                Analyzes error signals to figure out why a payment failed (insufficient funds, OTP mismatch, bank timeouts).
              </p>
            </div>
          </motion.div>

          {/* Card 2: Triage */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
            className="animated-border-card triage-hover p-5 flex flex-col justify-between min-h-[180px] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/40 transition-all duration-300"
            style={{ '--border-glow-color': '#A855F7' } as React.CSSProperties}
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-1.5">2. Triage</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                Calculates Expected Value (EV) and solves a linear program to allocate channels under strict daily caps.
              </p>
            </div>
          </motion.div>

          {/* Card 3: Guardrail */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
            className="animated-border-card guardrail-hover p-5 flex flex-col justify-between min-h-[180px] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/40 transition-all duration-300"
            style={{ '--border-glow-color': '#F97316' } as React.CSSProperties}
          >
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-1.5">3. Guardrail</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                Evaluates every action against active rules (quiet hours, contact-caps, refund limit locks) before execution.
              </p>
            </div>
          </motion.div>

          {/* Card 4: Execute */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
            className="animated-border-card execute-hover p-5 flex flex-col justify-between min-h-[180px] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/40 transition-all duration-300"
            style={{ '--border-glow-color': '#10B981' } as React.CSSProperties}
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-1.5">4. Execute</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                Triggers the recovery action: silent gateway retries, WhatsApp outreaches, refund approvals, or agent calls.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Section 4: The Proof */}
      <motion.section 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-[#111319]/40 border-y border-[#232630]/50 py-20 text-center"
      >
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <span className="text-[10px] font-black font-mono tracking-widest text-emerald-400 block uppercase">
            OPTIMIZATION METRICS
          </span>
          <h3 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight display-font">
            Same recovery budget. <br/>More rupees recovered.
          </h3>
          
          {/* Static Chart Mockup */}
          <div className="pt-6 pb-4 max-w-md mx-auto">
            <div className="bg-[#0A0B0F]/60 border border-[#232630] rounded-2xl p-6 shadow-lg flex flex-col gap-6">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
                <span>RECOVERY COMPARISON BATCH (SEED RUN)</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              
              <div className="space-y-4">
                {/* Baseline bar */}
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-gray-400">Naive Baseline (FCFS)</span>
                    <span className="text-gray-400">
                      <CountUp to={24800} decimals={0} prefix="₹" />
                    </span>
                  </div>
                  <div className="h-5 bg-gray-800/40 border border-gray-700/30 rounded-lg overflow-hidden">
                    <div className="h-full bg-gray-500/30 w-[55%]"></div>
                  </div>
                </div>

                {/* Optimized bar */}
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-emerald-400 font-bold">Revora Optimization</span>
                    <span className="text-emerald-400 font-bold">
                      <CountUp to={37600} decimals={0} prefix="₹" />
                    </span>
                  </div>
                  <div className="h-5 bg-emerald-950/20 border border-emerald-500/25 rounded-lg overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-[90%]"></div>
                  </div>
                </div>
              </div>

              {/* Uplift callout */}
              <div className="border-t border-[#232630] pt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">Average Revenue Uplift:</span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  <CountUp to={51.6} decimals={1} prefix="+" suffix="%" />
                </span>
              </div>
            </div>
          </div>
          
          <p className="text-[10px] text-gray-500 italic max-w-sm mx-auto">
            &quot;Every number on the live dashboard is computed from a real linear program, not a guess.&quot;
          </p>
        </div>
      </motion.section>

      {/* Section 5: Built With (Credibility Strip) */}
      <motion.section 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="py-12 bg-[#0A0B0F] text-center border-b border-[#232630]/40"
      >
        <div className="max-w-4xl mx-auto px-6 space-y-4">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">
            100% free, local-first stack — nothing here requires a paid API key.
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">
            <span>FastAPI</span>
            <span className="text-gray-700">·</span>
            <span>PuLP LP Solver</span>
            <span className="text-gray-700">·</span>
            <span>Next.js</span>
            <span className="text-gray-700">·</span>
            <span>Ollama</span>
            <span className="text-gray-700">·</span>
            <span>Razorpay Test Mode</span>
          </div>
        </div>
      </motion.section>

      {/* Section 6: Final CTA */}
      <motion.section 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-4xl mx-auto px-6 py-24 text-center space-y-6"
      >
        <h3 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white display-font">
          See it recover money, live.
        </h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Start the local API, seed a batch of payment failures, and watch the triage optimizer recover revenue instantly.
        </p>
        <div className="pt-2">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-sm font-bold uppercase tracking-wider glow-cta shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] transition-shadow duration-300 cursor-pointer"
          >
            Launch the Command Center <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-8 bg-[#07080C] text-center border-t border-[#232630]/30 text-[10px] text-gray-600 font-mono uppercase tracking-wider relative z-20">
        © 2026 Revora Triage Engine · Built for AI Revenue Recovery
      </footer>

    </div>
  );
}

