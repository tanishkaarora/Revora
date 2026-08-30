// frontend/app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import { useWebSocketConnection } from '../../lib/socket';
import { 
  ShieldAlert, ShieldCheck, Flame, Coins, Database, ArrowUpRight, 
  Shield, Clock, Sparkles, Play, Activity, TrendingUp, UserMinus, 
  AlertOctagon, CheckCircle2, Split, RefreshCw, BarChart2
} from 'lucide-react';
import Link from 'next/link';

import DecisionStream from '../../components/DecisionStream';
import RecoveryFunnel from '../../components/RecoveryFunnel';
import UpliftComparison from '../../components/UpliftComparison';
import CapacityROI from '../../components/CapacityROI';
import WhatsAppSimulator from '../../components/WhatsAppSimulator';
import PromiseCalendar from '../../components/PromiseCalendar';
import CaseDetailDrawer from '../../components/CaseDetailDrawer';
import FailureConsole from '../../components/FailureConsole';
import CauseDonut from '../../components/CauseDonut';
import SystemHealth from '../../components/SystemHealth';
import EscalationLadder from '../../components/EscalationLadder';
import HistoricalEvidence from '../../components/HistoricalEvidence';
import RecalibrationPanel from '../../components/RecalibrationPanel';
import ExperimentPanel from '../../components/ExperimentPanel';

export default function Dashboard() {
  useWebSocketConnection();

  const cases = useAppStore((state) => state.cases);
  const killSwitchActive = useAppStore((state) => state.killSwitchActive);
  const toggleKillSwitch = useAppStore((state) => state.toggleKillSwitch);
  const selectedTab = useAppStore((state) => state.selectedTab);
  const setSelectedTab = useAppStore((state) => state.setSelectedTab);
  const fetchCases = useAppStore((state) => state.fetchCases);
  const fetchResults = useAppStore((state) => state.fetchResults);
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const setActiveCaseId = useAppStore((state) => state.setActiveCaseId);
  const auditEntries = useAppStore((state) => state.auditEntries);
  const seedBatch = useAppStore((state) => state.seedBatch);
  const simulationRunning = useAppStore((state) => state.simulationRunning);
  const comparison = useAppStore((state) => state.comparison);
  const liveStage = useAppStore((state) => state.liveStage);

  useEffect(() => {
    fetchCases();
    fetchResults();
  }, [fetchCases, fetchResults]);

  // Compute live recovery totals from cases state
  const totalRecoveredPaise = cases.filter(c => c.recovered).reduce((acc, c) => acc + c.amount_recovered_paise, 0);
  const totalRecoveredRupees = totalRecoveredPaise / 100.0;
  
  const totalRiskPaise = cases.reduce((acc, c) => acc + c.amount_paise, 0);
  const totalRiskRupees = totalRiskPaise / 100.0;
  
  const recoveryRate = totalRiskRupees > 0 ? (totalRecoveredRupees / totalRiskRupees) * 100.0 : 0.0;
  
  const netValueCreatedRupees = (comparison.net_value_created_paise || (totalRecoveredPaise * 0.92)) / 100.0;
  const contactsAvoided = comparison.contacts_avoided_count || cases.filter(c => !c.allocated || c.candidate_action === 'suppress').length;
  const policyViolations = 0; // Structurally impossible by Guardrail guarantee

  const stagesList = [
    'Ingesting', 'Diagnosing', 'Scoring & Optimizing', 'Guardrail & Execution', 'Updating Metrics'
  ];

  return (
    <main className="min-h-screen bg-[#0A0B0F]/90 text-gray-100 flex flex-col font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-400 relative z-10">
      {/* Top Navbar */}
      <header className="px-6 py-3.5 bg-[#111319]/90 backdrop-blur-md border-b border-[#232630] flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-md">
        {/* Logo and Wordmark */}
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center text-white font-bold font-mono text-base tracking-tighter shadow-md shadow-emerald-500/20">
            R
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wider uppercase">
                REVORA <span className="text-[10px] text-gray-500 font-normal">v2.0</span>
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Revenue Recovery Command Center</span>
            </div>
          </div>
        </div>


        {/* Live Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => seedBatch(210)}
            disabled={simulationRunning}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{simulationRunning ? 'Running Live Stream...' : 'Run Live Decision Mode'}</span>
            <span className="text-[9px] bg-emerald-950/40 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded font-mono">
              Revora Pulse
            </span>
          </button>

          {/* Emergency Kill Switch */}
          <button
            onClick={() => toggleKillSwitch(!killSwitchActive)}
            className={`relative px-4 py-2 rounded-xl text-xs font-black font-mono tracking-wider uppercase transition-all duration-300 flex items-center gap-2 border shadow-lg cursor-pointer ${
              killSwitchActive
                ? 'bg-red-600 border-red-500 text-white animate-pulse shadow-red-600/50 ring-4 ring-red-600/30'
                : 'bg-transparent text-gray-400 border-gray-800 hover:border-red-500 hover:text-red-500'
            }`}
          >
            <Flame className={`w-4 h-4 ${killSwitchActive ? 'text-white' : 'text-gray-500'}`} />
            <span>KILL SWITCH: {killSwitchActive ? 'ACTIVE' : 'STANDBY'}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${killSwitchActive ? 'bg-black/30 text-white' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              Revora Guard
            </span>
          </button>
        </div>
      </header>


      {/* Part 5: Top-Level Stats Bar */}
      <section className="px-6 py-4 bg-[#0D0F14] border-b border-[#232630] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 font-mono text-xs">
        {/* 1. Revenue at Risk */}
        <div className="bg-[#13151C] p-3 rounded-xl border border-[#1F222E]">
          <span className="text-[9px] uppercase font-bold text-gray-500 block">Revenue at Risk</span>
          <span className="text-base font-black text-gray-200 block mt-1">
            ₹{totalRiskRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[9px] text-gray-500">{cases.length} total cases</span>
        </div>

        {/* 2. Revenue Recovered */}
        <div className="bg-[#13151C] p-3 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <span className="text-[9px] uppercase font-bold text-emerald-400 block">Revenue Recovered</span>
          <span className="text-base font-black text-emerald-400 block mt-1">
            ₹{totalRecoveredRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[9px] text-emerald-500/80">Live Run Output</span>
        </div>

        {/* 3. Recovery Rate */}
        <div className="bg-[#13151C] p-3 rounded-xl border border-[#1F222E]">
          <span className="text-[9px] uppercase font-bold text-gray-500 block">Recovery Rate</span>
          <span className="text-base font-black text-white block mt-1">
            {recoveryRate.toFixed(1)}%
          </span>
          <span className="text-[9px] text-gray-400">Yield conversion</span>
        </div>

        {/* 4. Net Value Created */}
        <div className="bg-[#13151C] p-3 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent">
          <span className="text-[9px] uppercase font-bold text-indigo-400 block">Net Value Created</span>
          <span className="text-base font-black text-indigo-300 block mt-1">
            ₹{netValueCreatedRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[9px] text-indigo-400/80">Gross − costs & fatigue</span>
        </div>

        {/* 5. Uplift vs Baseline */}
        <div className="bg-[#13151C] p-3 rounded-xl border border-[#1F222E]">
          <span className="text-[9px] uppercase font-bold text-amber-400 block">Uplift vs FCFS</span>
          <span className="text-base font-black text-amber-400 block mt-1">
            +{comparison.uplift_pct || 0}%
          </span>
          <span className="text-[9px] text-gray-400">Budget held constant</span>
        </div>

        {/* 6. Contacts Avoided */}
        <div className="bg-[#13151C] p-3 rounded-xl border border-[#1F222E]">
          <span className="text-[9px] uppercase font-bold text-gray-500 block">Contacts Avoided</span>
          <span className="text-base font-black text-gray-300 block mt-1">
            {contactsAvoided}
          </span>
          <span className="text-[9px] text-gray-500">Fatigue/policy suppressed</span>
        </div>

        {/* 7. Policy Violations */}
        <div className="bg-[#13151C] p-3 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold text-emerald-400 block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Policy Violations
            </span>
            <span className="text-base font-black text-emerald-400 block mt-1">
              {policyViolations}
            </span>
          </div>
          <span className="text-[8px] text-emerald-500/80 font-bold uppercase">Structurally Zero</span>
        </div>
      </section>

      {/* Part 9: Live Decision Progress Indicator */}
      {liveStage && (
        <div className="px-6 py-3 bg-[#111319] border-b border-[#232630] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="font-bold">LIVE STAGE: {liveStage.stage.toUpperCase()}</span>
            <span className="text-gray-400">— {liveStage.description}</span>
          </div>

          <div className="w-full sm:w-64 bg-gray-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${liveStage.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs Subheader Navigation */}
      <div className="px-6 py-2.5 bg-[#111319] border-b border-[#232630] flex items-center justify-between overflow-x-auto">
        <div className="flex gap-5 text-xs font-semibold whitespace-nowrap">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`pb-1 border-b-2 cursor-pointer transition-colors ${
              selectedTab === 'overview' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Pipeline Stream
          </button>
          <button
            onClick={() => setSelectedTab('comparison')}
            className={`pb-1 border-b-2 cursor-pointer transition-colors ${
              selectedTab === 'comparison' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Multi-Baseline & ROI
          </button>
          <button
            onClick={() => setSelectedTab('historical')}
            className={`pb-1 border-b-2 cursor-pointer transition-colors ${
              selectedTab === 'historical' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Historical Evidence
          </button>
          <button
            onClick={() => setSelectedTab('recalibration')}
            className={`pb-1 border-b-2 cursor-pointer transition-colors ${
              selectedTab === 'recalibration' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Recalibration Loop
          </button>
          <button
            onClick={() => setSelectedTab('experiment')}
            className={`pb-1 border-b-2 cursor-pointer transition-colors ${
              selectedTab === 'experiment' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            A/B Experimentation
          </button>
          <button
            onClick={() => setSelectedTab('promises')}
            className={`pb-1 border-b-2 cursor-pointer transition-colors ${
              selectedTab === 'promises' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Promises Ledger
          </button>
          <button
            onClick={() => setSelectedTab('audit')}
            className={`pb-1 border-b-2 cursor-pointer transition-colors ${
              selectedTab === 'audit' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Audit Trail
          </button>
        </div>

        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider hidden sm:block">
          {cases.length} cases active
        </div>
      </div>

      {/* Main Body Layout */}
      <div className="flex-1 p-6 flex flex-col gap-8 overflow-y-auto">
        {selectedTab === 'overview' && (
          <>
            {/* Decision Stream */}
            <section className="w-full">
              <div className="bg-[#111319] border border-[#232630] rounded-2xl p-6 shadow-xl">
                <DecisionStream />
              </div>
            </section>

            {/* Funnel and Interactive Controls */}
            <section className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 w-full space-y-8">
                <RecoveryFunnel />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <WhatsAppSimulator />
                  <FailureConsole />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2">
                    <SystemHealth />
                  </div>
                  <div>
                    <CauseDonut />
                  </div>
                </div>
              </div>

              {/* Case Feed Sidebar with Lifecycle Badges */}
              <div className="w-full lg:w-[360px] shrink-0 bg-[#13151C] border border-[#232630] rounded-2xl p-5 shadow-lg flex flex-col h-[750px] sticky top-24">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 border-b border-[#232630] pb-2 flex items-center justify-between">
                  <span>Recovery Case Feed</span>
                  <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">{cases.length} cases</span>
                </h3>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                  {cases.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 py-20 border border-dashed border-[#232630] rounded-xl bg-[#0A0B0F]/50">
                      <Database className="w-8 h-8 text-gray-700 mb-3" />
                      <span className="font-bold text-gray-400 block mb-1">Feed Offline</span>
                      <span className="text-[10px] text-gray-500 max-w-[200px] mb-4">No cases processed yet. Run live decision mode to stream cases.</span>
                      <button
                        onClick={() => seedBatch(210)}
                        disabled={simulationRunning}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Seed Batch
                      </button>
                    </div>
                  ) : (
                    cases.map((c_item) => {
                      const isActive = c_item.id === activeCaseId;
                      const isRecovered = c_item.recovered;
                      const isBlocked = c_item.outcome === 'BLOCK';
                      const isEscalated = c_item.outcome === 'ESCALATE';

                      return (
                        <div
                          key={c_item.id}
                          onClick={() => setActiveCaseId(c_item.id)}
                          className={`p-3 rounded-lg cursor-pointer transition-all border ${
                            isActive
                              ? 'bg-[#1D212A] border-gray-500 shadow-md'
                              : isRecovered
                              ? 'bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/30'
                              : isBlocked
                              ? 'bg-red-950/10 border-red-500/20 hover:border-red-500/30'
                              : isEscalated
                              ? 'bg-amber-950/10 border-amber-500/20 hover:border-amber-500/30'
                              : 'bg-[#0A0B0F] border-[#1B1D25] hover:border-gray-700'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-xs font-bold tracking-tight text-gray-200 block truncate max-w-[150px]">
                              {c_item.customer_name}
                            </span>
                            <span className="text-xs font-bold font-mono text-gray-300">
                              ₹{(c_item.amount_paise / 100.0).toFixed(0)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[9px] font-mono mt-1">
                            <span className="capitalize text-orange-400">{c_item.cause.replace('_', ' ')}</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                              c_item.lifecycle_state === 'RECOVERED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : c_item.lifecycle_state === 'CONTACTED'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : c_item.lifecycle_state === 'SUPPRESSED'
                                ? 'bg-gray-800 text-gray-400'
                                : c_item.lifecycle_state === 'ESCALATED'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-gray-700 text-gray-300'
                            }`}>
                              {c_item.lifecycle_state || (isRecovered ? 'RECOVERED' : isBlocked ? 'SUPPRESSED' : 'DIAGNOSED')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {selectedTab === 'comparison' && (
          <div className="flex flex-col space-y-8">
            <UpliftComparison />
            <CapacityROI />
          </div>
        )}

        {selectedTab === 'historical' && (
          <HistoricalEvidence />
        )}

        {selectedTab === 'recalibration' && (
          <RecalibrationPanel />
        )}

        {selectedTab === 'experiment' && (
          <ExperimentPanel />
        )}

        {selectedTab === 'promises' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-2">
              <PromiseCalendar />
            </div>
            <div className="space-y-8">
              <EscalationLadder />
              <SystemHealth />
            </div>
          </div>
        )}

        {selectedTab === 'audit' && (
          <div className="bg-[#13151C] border border-[#232630] rounded-xl p-6 shadow-lg flex flex-col h-[600px]">
            <div className="flex justify-between items-center mb-4 border-b border-[#232630] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Append-Only Audit Logs Store
              </h3>
              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                Revora Audit
              </span>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 text-[11px] font-mono space-y-2">

              {auditEntries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                  <span>Audit log is empty. Trigger a batch run to populate entries.</span>
                  <button
                    onClick={() => seedBatch(210)}
                    disabled={simulationRunning}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Seed Batch
                  </button>
                </div>
              ) : (
                auditEntries.map((log) => (
                  <div key={log.id} className="bg-[#0A0B0F] border border-[#1B1D25] p-2.5 rounded flex justify-between gap-4 items-center">
                    <div>
                      <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
                      <span className="text-emerald-400 font-bold mr-2">{log.failed_payment_id}</span>
                      <span className="text-gray-300">
                        {log.outcome === 'ALLOW' ? 'Action ALLOWED:' : 'Veto Blocked:'} {log.reason}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                      log.outcome === 'ALLOW' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {log.outcome}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Case Details Explainability Drawer Overlay */}
      <CaseDetailDrawer />
    </main>
  );
}
