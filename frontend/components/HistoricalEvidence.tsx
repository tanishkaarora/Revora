// frontend/components/HistoricalEvidence.tsx
import React, { useEffect, useState } from 'react';
import { Database, BarChart3, ShieldCheck, Sparkles, RefreshCw, Layers } from 'lucide-react';

interface HistoricalRecord {
  cause: string;
  action: string;
  attempts: number;
  recovered: number;
  recovery_rate: number;
  ci_lower: number;
  ci_upper: number;
}

export default function HistoricalEvidence() {
  const [data, setData] = useState<HistoricalRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCause, setSelectedCause] = useState<string>('all');

  useEffect(() => {
    async function loadEvidence() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8000/results/historical-evidence');
        if (res.ok) {
          const json = await res.json();
          setData(json.aggregates || []);
        }
      } catch (err) {
        console.error('Failed to load historical evidence:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvidence();
  }, []);

  const causes = ['all', ...Array.from(new Set(data.map(d => d.cause)))];
  const filteredData = selectedCause === 'all' ? data : data.filter(d => d.cause === selectedCause);

  return (
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-6 shadow-xl space-y-6">
      {/* Header with mandatory synthetic demo badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232630] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Historical Evidence & Prior Calibration
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Synthetic Demo Data
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Per-action, per-cause empirical statistics from N=1,800 synthetic historical attempts with 95% Wilson Score confidence intervals.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={selectedCause}
            onChange={(e) => setSelectedCause(e.target.value)}
            className="bg-[#0A0B0F] border border-[#232630] text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
          >
            {causes.map(c => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Failure Causes' : c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table of Evidence */}
      {loading ? (
        <div className="py-12 flex items-center justify-center text-gray-500 gap-2 text-xs font-mono">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Loading historical evidence benchmarks...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#232630] text-gray-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Failure Cause</th>
                <th className="py-2.5 px-3">Intervention Action</th>
                <th className="py-2.5 px-3 text-right">Attempts</th>
                <th className="py-2.5 px-3 text-right">Recovered</th>
                <th className="py-2.5 px-3 text-right">Recovery Rate</th>
                <th className="py-2.5 px-3 text-right">95% Conf. Interval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1F2B]">
              {filteredData.map((row, idx) => {
                const ratePct = (row.recovery_rate * 100).toFixed(1);
                const ciLowPct = (row.ci_lower * 100).toFixed(1);
                const ciHighPct = (row.ci_upper * 100).toFixed(1);

                return (
                  <tr key={`${row.cause}-${row.action}-${idx}`} className="hover:bg-[#1A1D27]/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-gray-200 capitalize">
                      {row.cause.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-indigo-300">
                      {row.action.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-400">
                      {row.attempts}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                      {row.recovered}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${ratePct}%` }}
                          />
                        </div>
                        <span className="text-white font-bold">{ratePct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-400">
                      [{ciLowPct}%, {ciHighPct}%]
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
