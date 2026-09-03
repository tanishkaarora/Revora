'use client';

import React, { useState } from 'react';
import { Split, Trophy, CheckCircle2, TrendingUp, BarChart2, ArrowRight } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';

interface GroupStats {
  group_label: string;
  action: string;
  attempts: number;
  recovered_count: number;
  recovery_rate: number;
  recovered_paise: number;
  costs_paise: number;
  net_value_paise: number;
}

interface ExperimentResponse {
  experiment_name: string;
  sample_size: number;
  split_method: string;
  winner: string;
  group_a: GroupStats;
  group_b: GroupStats;
}

export default function ExperimentPanel() {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<ExperimentResponse | null>(null);

  const handleRunExperiment = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/demo/run-experiment?count=120', {
        method: 'POST'
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to run experiment:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Split className="w-4 h-4 text-brand-brass" />
            <h3 className="text-sm font-semibold text-content-primary font-display">
              Recovery Experimentation Lab
            </h3>
            <span className="text-[10px] font-sans font-medium px-2.5 py-0.5 rounded-full bg-brand-brass-surface text-brand-brass border border-brand-brass-border">
              A/B Strategy Evaluation
            </span>
          </div>

          <p className="text-xs text-content-secondary">
            Randomized evaluation comparing candidate recovery actions on identical customer failure cohorts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunExperiment}
          disabled={loading}
          className="px-4 py-2 bg-brand-jade hover:bg-brand-jade-deep text-white rounded-xl text-xs font-semibold tracking-wide flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <BarChart2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Evaluating Trial...' : 'Run Experiment (N=120)'}
        </button>
      </div>

      {/* Trial Results */}
      {data ? (
        <div className="space-y-5">
          {/* Winner Banner */}
          <div className="bg-surface-elevated p-4 rounded-xl border border-brand-brass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-brass-surface border border-brand-brass-border flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-brand-brass" />
              </div>
              <div>
                <span className="text-[10px] font-sans uppercase text-content-tertiary block">Experiment Verdict</span>
                <span className="text-sm font-semibold text-content-primary">
                  {data.winner === 'Group A' ? data.group_a.group_label : data.group_b.group_label} generated superior net revenue yield
                </span>
              </div>
            </div>
            <span className="text-xs font-sans text-brand-brass bg-brand-brass-surface px-3 py-1 rounded-lg border border-brand-brass-border self-start sm:self-auto">
              Sample N={data.sample_size} ({data.split_method})
            </span>
          </div>

          {/* Side by Side Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group A */}
            <div className={`p-5 rounded-xl border space-y-4 ${
              data.winner === 'Group A' 
                ? 'bg-surface-elevated border-brand-brass shadow-sm' 
                : 'bg-surface-subtle border-border-subtle'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-sans text-content-tertiary block">Strategy Variant A</span>
                  <h4 className="text-sm font-bold text-content-primary font-display">{data.group_a.group_label}</h4>
                </div>
                {data.winner === 'Group A' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-brass-surface text-brand-brass border border-brand-brass-border flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Winner
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Attempts</span>
                  <span className="text-content-primary font-bold">{data.group_a.attempts}</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Recovery Rate</span>
                  <span className="text-brand-jade font-bold">{(data.group_a.recovery_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Gross Recovered</span>
                  <span className="text-content-primary font-bold font-technical">₹{(data.group_a.recovered_paise / 100.0).toFixed(2)}</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Direct Channel Costs</span>
                  <span className="text-content-secondary font-bold font-technical">₹{(data.group_a.costs_paise / 100.0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border-subtle flex justify-between items-center text-xs">
                <span className="text-content-secondary font-sans">Net Value Created:</span>
                <span className="text-sm font-bold text-brand-jade font-technical">
                  ₹{(data.group_a.net_value_paise / 100.0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Group B */}
            <div className={`p-5 rounded-xl border space-y-4 ${
              data.winner === 'Group B' 
                ? 'bg-surface-elevated border-brand-brass shadow-sm' 
                : 'bg-surface-subtle border-border-subtle'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-sans text-content-tertiary block">Strategy Variant B</span>
                  <h4 className="text-sm font-bold text-content-primary font-display">{data.group_b.group_label}</h4>
                </div>
                {data.winner === 'Group B' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-brass-surface text-brand-brass border border-brand-brass-border flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Winner
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Attempts</span>
                  <span className="text-content-primary font-bold">{data.group_b.attempts}</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Recovery Rate</span>
                  <span className="text-brand-jade font-bold">{(data.group_b.recovery_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Gross Recovered</span>
                  <span className="text-content-primary font-bold font-technical">₹{(data.group_b.recovered_paise / 100.0).toFixed(2)}</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Direct Channel Costs</span>
                  <span className="text-content-secondary font-bold font-technical">₹{(data.group_b.costs_paise / 100.0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border-subtle flex justify-between items-center text-xs">
                <span className="text-content-secondary font-sans">Net Value Created:</span>
                <span className="text-sm font-bold text-brand-jade font-technical">
                  ₹{(data.group_b.net_value_paise / 100.0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-content-secondary text-xs font-sans border border-dashed border-border-muted rounded-xl flex flex-col items-center justify-center space-y-3">
          <Split className="w-7 h-7 text-content-tertiary" />
          <div className="max-w-sm">
            <span className="font-semibold text-content-primary block mb-0.5">No Active Trial Results</span>
            <span>Click &quot;Run Experiment&quot; to execute a randomized, controlled trial comparing recovery strategies across identical cohorts.</span>
          </div>
          <button
            type="button"
            onClick={handleRunExperiment}
            disabled={loading}
            className="px-4 py-2 bg-brand-jade hover:bg-brand-jade-deep text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
          >
            Launch Trial
          </button>
        </div>
      )}
    </div>
  );
}
