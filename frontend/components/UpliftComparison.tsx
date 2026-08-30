// frontend/components/UpliftComparison.tsx
import React from 'react';
import { useAppStore } from '../lib/store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { ArrowUpRight, Award, Zap, Layers, Sparkles } from 'lucide-react';

export default function UpliftComparison() {
  const comparison = useAppStore((state) => state.comparison);

  const optimizedRupees = (comparison.optimized_recovered_paise || 0) / 100.0;
  const baselineRupees = (comparison.baseline_recovered_paise || 0) / 100.0;
  const netGainRupees = optimizedRupees - baselineRupees;
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
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-lg h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-[#232630] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Multi-Baseline Optimization Benchmark
            </h3>
            <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
              Benchmark
            </span>

          </div>
          <p className="text-xs text-gray-400 mt-1">
            Comparing PuLP MILP optimizer against 3 industry standard heuristic baselines under strict capacity constraints.
          </p>
        </div>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded font-mono font-medium">
          Budget Held Constant
        </span>
      </div>


      {/* 4 Strategy Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono">
        {/* Strategy 1: PuLP Optimized */}
        <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/40 relative">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-emerald-400 font-bold uppercase block">1. PuLP OPTIMIZER</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-xl font-extrabold text-emerald-400 mt-2 block">
            ₹{optimizedRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">
            {uplift >= 0 ? `+${uplift}%` : `${uplift}%`} vs FCFS
          </span>
        </div>

        {/* Strategy 2: FCFS */}
        <div className="bg-[#0A0B0F] p-3.5 rounded-xl border border-[#1B1D25]">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">2. FCFS NAIVE</span>
          <span className="text-xl font-bold text-gray-300 mt-2 block">
            ₹{baselineRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-gray-500 mt-1 block">
            Chronological FIFO
          </span>
        </div>

        {/* Strategy 3: Highest Amount */}
        <div className="bg-[#0A0B0F] p-3.5 rounded-xl border border-[#1B1D25]">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">3. HIGHEST AMOUNT</span>
          <span className="text-xl font-bold text-gray-300 mt-2 block">
            ₹{ha ? (ha.recovered_paise / 100.0).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
          </span>
          <span className="text-[10px] text-amber-400/80 mt-1 block">
            {ha ? `${ha.uplift_pct >= 0 ? '+' : ''}${ha.uplift_pct}% vs baseline` : 'Greedy high ticket'}
          </span>
        </div>

        {/* Strategy 4: Highest Probability */}
        <div className="bg-[#0A0B0F] p-3.5 rounded-xl border border-[#1B1D25]">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">4. HIGHEST PROB</span>
          <span className="text-xl font-bold text-gray-300 mt-2 block">
            ₹{hp ? (hp.recovered_paise / 100.0).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
          </span>
          <span className="text-[10px] text-sky-400/80 mt-1 block">
            {hp ? `${hp.uplift_pct >= 0 ? '+' : ''}${hp.uplift_pct}% vs baseline` : 'Greedy high win-rate'}
          </span>
        </div>

      </div>

      {/* Breakdown Chart */}
      <div className="flex-1 min-h-[240px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#232630" />
              <XAxis 
                dataKey="name" 
                stroke="#6B7280" 
                fontSize={9}
                tickLine={false}
              />
              <YAxis 
                stroke="#6B7280" 
                fontSize={9}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#13151C', border: '1px solid #232630', borderRadius: '8px' }}
                labelStyle={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '11px' }}
                formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, '']}
              />
              <Legend 
                wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                verticalAlign="bottom"
              />
              <Bar dataKey="FCFS" fill="#4B5563" radius={[4, 4, 0, 0]} />
              <Bar dataKey="HighestAmount" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="HighestProb" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Optimized" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-gray-600 font-mono">
            No comparison data available. Trigger a demo batch to compute live multi-baseline analytics.
          </div>
        )}
      </div>
    </div>
  );
}
