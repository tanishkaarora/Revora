'use client';

import React from 'react';
import { useAppStore } from '../lib/store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertCircle } from 'lucide-react';

const COLORS: Record<string, string> = {
  insufficient_balance: '#D97706', // amber
  bank_timeout: '#466A8A',         // steel blue
  wrong_otp: '#0D9488',            // jade
  expired_mandate: '#B59A62',      // champagne brass
  card_declined: '#991B1B',        // muted burgundy
  unknown: '#64748B'               // slate gray
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
    color: COLORS[cause] || COLORS.unknown
  }));

  return (
    <div className="surface-card rounded-2xl p-5 flex flex-col justify-between h-full min-h-[220px]">
      <div>
        <div className="flex justify-between items-center mb-2 border-b border-border-subtle pb-2">
          <h3 className="text-xs font-semibold tracking-wide uppercase text-content-primary flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-brand-steel" />
            Failure Causes Diagnosis
          </h3>
          <span className="text-[10px] text-content-tertiary bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle font-medium">
            {cases.length} Total
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
                  innerRadius={36}
                  outerRadius={52}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="var(--bg-surface)"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-surface)', 
                    borderColor: 'var(--border-subtle)', 
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-card)'
                  }}
                  itemStyle={{ fontSize: '11px', color: 'var(--text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[11px] text-content-tertiary">
              No data. Ingest a batch first.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px] font-sans text-content-secondary mt-2 pt-2 border-t border-border-subtle">
        {chartData.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: d.color }}></span>
            <span className="truncate capitalize">{d.name} ({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
