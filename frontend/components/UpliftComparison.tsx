'use client';

import React from 'react';
import { useAppStore } from '../lib/store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Zap, Award } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';

export default function UpliftComparison() {
  const comparison = useAppStore((state) => state.comparison);

  const optimizedRupees = (comparison.optimized_recovered_paise || 0) / 100.0;
  const baselineRupees = (comparison.baseline_recovered_paise || 0) / 100.0;
  const uplift = comparison.uplift_pct || 0.0;

  const strategies = (comparison as any).strategies || {};
  const fcfs = strategies.fcfs;
  const ha = strategies.highest_amount;
  const hp = strategies.highest_probability;

  // Format by_cause map into recharts-compatible array
  const chartData = Object.entries(comparison.by_cause || {}).map(([cause, data]: [string, any]) => ({
    name: cause.replace(/_/g, ' '),
    Optimized: (data.optimized || 0) / 100.0,
    FCFS: (data.fcfs || data.baseline || 0) / 100.0,
    HighestAmount: (data.highest_amount || 0) / 100.0,
    HighestProb: (data.highest_probability || 0) / 100.0,
  }));

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-content-primary flex items-center gap-2 font-display">
              <Zap className="w-4 h-4 text-brand-brass" />
              Multi-Strategy Optimization Benchmark
            </h3>
            <span className="text-[10px] font-medium text-brand-steel bg-brand-steel-surface px-2 py-0.5 rounded-full border border-brand-steel-border">
              Benchmark
            </span>
          </div>
          <p className="text-xs text-content-secondary mt-0.5">
            Comparing PuLP MILP optimization against 3 industry standard heuristics under identical capacity bounds.
          </p>
        </div>
        <span className="text-xs bg-brand-jade-surface text-brand-jade border border-brand-jade-border px-2.5 py-1 rounded-lg font-medium self-start sm:self-auto">
          Capacity Held Constant
        </span>
      </div>

      {/* 4 Strategy Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Strategy 1: PuLP Optimized */}
        <div className="bg-brand-jade-surface p-4 rounded-xl border border-brand-jade-border relative space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-brand-jade font-bold uppercase tracking-wider block">1. PuLP OPTIMIZER</span>
            <Award className="w-4 h-4 text-brand-jade" />
          </div>
          <span className="text-2xl font-bold text-brand-jade font-display block">
            <AnimatedNumber value={optimizedRupees} prefix="₹" />
          </span>
          <span className="text-[11px] text-brand-jade/90 block font-medium">
            {uplift >= 0 ? `+${uplift}%` : `${uplift}%`} vs FCFS
          </span>
        </div>

        {/* Strategy 2: FCFS */}
        <div className="bg-surface-subtle p-4 rounded-xl border border-border-subtle space-y-1">
          <span className="text-[10px] text-content-tertiary font-bold uppercase tracking-wider block">2. FCFS (FIFO)</span>
          <span className="text-2xl font-bold text-content-secondary font-display block">
            <AnimatedNumber value={baselineRupees} prefix="₹" />
          </span>
          <span className="text-[11px] text-content-tertiary block">
            Chronological Dispatch
          </span>
        </div>

        {/* Strategy 3: Highest Amount */}
        <div className="bg-surface-subtle p-4 rounded-xl border border-border-subtle space-y-1">
          <span className="text-[10px] text-content-tertiary font-bold uppercase tracking-wider block">3. HIGHEST AMOUNT</span>
          <span className="text-2xl font-bold text-content-secondary font-display block">
            <AnimatedNumber value={ha ? ha.recovered_paise / 100.0 : 0} prefix="₹" />
          </span>
          <span className="text-[11px] text-brand-brass block font-medium">
            {ha ? `${ha.uplift_pct >= 0 ? '+' : ''}${ha.uplift_pct}% vs baseline` : 'Greedy high ticket'}
          </span>
        </div>

        {/* Strategy 4: Highest Probability */}
        <div className="bg-surface-subtle p-4 rounded-xl border border-border-subtle space-y-1">
          <span className="text-[10px] text-content-tertiary font-bold uppercase tracking-wider block">4. HIGHEST PROB</span>
          <span className="text-2xl font-bold text-content-secondary font-display block">
            <AnimatedNumber value={hp ? hp.recovered_paise / 100.0 : 0} prefix="₹" />
          </span>
          <span className="text-[11px] text-brand-steel block font-medium">
            {hp ? `${hp.uplift_pct >= 0 ? '+' : ''}${hp.uplift_pct}% vs baseline` : 'Greedy high win-rate'}
          </span>
        </div>
      </div>

      {/* Breakdown Chart */}
      <div className="min-h-[260px] h-[280px] w-full pt-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis 
                dataKey="name" 
                stroke="var(--text-tertiary)" 
                fontSize={10}
                tickLine={false}
              />
              <YAxis 
                stroke="var(--text-tertiary)" 
                fontSize={10}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-surface)', 
                  borderColor: 'var(--border-subtle)', 
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-card)'
                }}
                labelStyle={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '11px' }}
                formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, '']}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                verticalAlign="bottom"
              />
              <Bar dataKey="FCFS" fill="#64748B" radius={[4, 4, 0, 0]} name="FCFS Heuristic" />
              <Bar dataKey="HighestAmount" fill="#B59A62" radius={[4, 4, 0, 0]} name="Highest Amount" />
              <Bar dataKey="HighestProb" fill="#466A8A" radius={[4, 4, 0, 0]} name="Highest Probability" />
              <Bar dataKey="Optimized" fill="#0D9488" radius={[4, 4, 0, 0]} name="Revora Optimization" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-content-tertiary font-sans">
            No comparison data available. Ingest a demo batch to compute live multi-strategy analytics.
          </div>
        )}
      </div>
    </div>
  );
}
