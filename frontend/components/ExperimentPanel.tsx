// frontend/components/ExperimentPanel.tsx
import React, { useState } from 'react';
import { Split, Trophy, CheckCircle2, TrendingUp, Sparkles, RefreshCw, BarChart2, ShieldCheck } from 'lucide-react';

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
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232630] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Split className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              A/B Strategy Experimentation Engine
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Controlled Trial
            </span>

          </div>

          <p className="text-xs text-gray-400">
            Deterministic split comparing intervention strategies (e.g. WhatsApp Nudge vs Alt Payment Link) on comparable failure cohorts.
          </p>
        </div>

        <button
          onClick={handleRunExperiment}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
        >
          <BarChart2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running Trial...' : 'Run A/B Experiment'}
        </button>
      </div>

      {/* Trial Results */}
      {data ? (
        <div className="space-y-6">
          {/* Winner Banner */}
          <div className="bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-transparent p-4 rounded-xl border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400 block">Experiment Verdict</span>
                <span className="text-sm font-bold text-white">
                  {data.winner === 'Group A' ? data.group_a.group_label : data.group_b.group_label} generated higher net yield!
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20">
              Sample N={data.sample_size} ({data.split_method})
            </span>
          </div>

          {/* Side by Side Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group A */}
            <div className={`p-5 rounded-xl border font-mono space-y-4 ${
              data.winner === 'Group A' 
                ? 'bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-950/30' 
                : 'bg-[#0A0B0F] border-[#1B1D25]'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Candidate Strategy</span>
                  <h4 className="text-sm font-bold text-white">{data.group_a.group_label}</h4>
                </div>
                {data.winner === 'Group A' && (
                  <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Winner
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#13151C] p-2.5 rounded border border-[#232630]">
                  <span className="text-[10px] text-gray-500 block uppercase">Attempts</span>
                  <span className="text-gray-200 font-bold">{data.group_a.attempts}</span>
                </div>
                <div className="bg-[#13151C] p-2.5 rounded border border-[#232630]">
                  <span className="text-[10px] text-gray-500 block uppercase">Recovery Rate</span>
                  <span className="text-emerald-400 font-bold">{(data.group_a.recovery_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-[#13151C] p-2.5 rounded border border-[#232630]">
                  <span className="text-[10px] text-gray-500 block uppercase">Gross Recovered</span>
                  <span className="text-white font-bold">₹{(data.group_a.recovered_paise / 100.0).toFixed(2)}</span>
                </div>
                <div className="bg-[#13151C] p-2.5 rounded border border-[#232630]">
                  <span className="text-[10px] text-gray-500 block uppercase">Total Costs</span>
                  <span className="text-red-400 font-bold">₹{(data.group_a.costs_paise / 100.0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1C1F2B] flex justify-between items-center text-xs">
                <span className="text-gray-400">Net Value Created:</span>
                <span className="text-sm font-extrabold text-emerald-400">
                  ₹{(data.group_a.net_value_paise / 100.0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Group B */}
            <div className={`p-5 rounded-xl border font-mono space-y-4 ${
              data.winner === 'Group B' 
                ? 'bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-950/30' 
                : 'bg-[#0A0B0F] border-[#1B1D25]'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Candidate Strategy</span>
                  <h4 className="text-sm font-bold text-white">{data.group_b.group_label}</h4>
                </div>
                {data.winner === 'Group B' && (
                  <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Winner
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#13151C] p-2.5 rounded border border-[#232630]">
                  <span className="text-[10px] text-gray-500 block uppercase">Attempts</span>
                  <span className="text-gray-200 font-bold">{data.group_b.attempts}</span>
                </div>
                <div className="bg-[#13151C] p-2.5 rounded border border-[#232630]">
                  <span className="text-[10px] text-gray-500 block uppercase">Recovery Rate</span>
                  <span className="text-emerald-400 font-bold">{(data.group_b.recovery_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-[#13151C] p-2.5 rounded border border-[#232630]">
                  <span className="text-[10px] text-gray-500 block uppercase">Gross Recovered</span>
                  <span className="text-white font-bold">₹{(data.group_b.recovered_paise / 100.0).toFixed(2)}</span>
                </div>
                <div className="bg-[#13151C] p-2.5 rounded border border-[#232630]">
                  <span className="text-[10px] text-gray-500 block uppercase">Total Costs</span>
                  <span className="text-red-400 font-bold">₹{(data.group_b.costs_paise / 100.0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1C1F2B] flex justify-between items-center text-xs">
                <span className="text-gray-400">Net Value Created:</span>
                <span className="text-sm font-extrabold text-emerald-400">
                  ₹{(data.group_b.net_value_paise / 100.0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500 text-xs font-mono border border-dashed border-[#232630] rounded-xl">
          Click &quot;Run A/B Experiment&quot; to execute a randomized, controlled trial comparing intervention channels.
        </div>
      )}
    </div>
  );
}
