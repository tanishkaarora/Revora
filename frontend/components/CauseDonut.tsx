// frontend/components/CauseDonut.tsx
import React from 'react';
import { useAppStore } from '../lib/store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertCircle } from 'lucide-react';

const COLORS = {
  insufficient_balance: '#F59E0B', // amber
  bank_timeout: '#38BDF8',         // sky
  wrong_otp: '#A78BFA',            // purple
  expired_mandate: '#FBBF24',      // yellow
  card_declined: '#EF4444',        // red
  unknown: '#9CA3AF'               // gray
};

export default function CauseDonut() {
  const cases = useAppStore((state) => state.cases);

  // Group and count causes
  const counts: Record<string, number> = {};
  cases.forEach((c) => {
    counts[c.cause] = (counts[c.cause] || 0) + 1;
  });

  const chartData = Object.entries(counts).map(([cause, count]) => ({
    name: cause.replace(/_/g, ' '),
    value: count,
    color: COLORS[cause as keyof typeof COLORS] || COLORS.unknown
  }));

  return (
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-lg flex flex-col justify-between h-full min-h-[220px]">
      <div>
        <div className="flex justify-between items-center mb-2 border-b border-[#232630] pb-2">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-purple-400" />
            Failure Root Causes
          </h3>
          <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
            Diagnosis
          </span>

        </div>


        <div className="h-[120px] relative mt-1">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#13151C', border: '1px solid #232630', borderRadius: '6px' }}
                  itemStyle={{ fontSize: '10px', color: '#F3F4F6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[10px] text-gray-600">
              No data. Ingest a batch first.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 text-[8px] font-mono text-gray-400 mt-2">
        {chartData.map((d, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: d.color }}></span>
            <span className="truncate capitalize">{d.name} ({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
