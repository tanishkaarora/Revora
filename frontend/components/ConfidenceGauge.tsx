// frontend/components/ConfidenceGauge.tsx
import React from 'react';
import { useAppStore } from '../lib/store';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { Activity } from 'lucide-react';

export default function ConfidenceGauge() {
  const cases = useAppStore((state) => state.cases);
  const activeCaseId = useAppStore((state) => state.activeCaseId);

  const activeCase = cases.find(c => c.id === activeCaseId);

  let confidenceValue = 0.0;
  let label = "Avg. Confidence";

  if (activeCase) {
    confidenceValue = activeCase.diagnosis_confidence;
    label = `Case: ${activeCase.id}`;
  } else if (cases.length > 0) {
    const totalConfidence = cases.reduce((acc, c) => acc + c.diagnosis_confidence, 0);
    confidenceValue = totalConfidence / cases.length;
  }

  const percentage = confidenceValue * 100;

  // Recharts RadialBar data format
  const chartData = [
    {
      name: 'Confidence',
      value: percentage,
      fill: percentage >= 80 ? '#10B981' : percentage >= 50 ? '#F59E0B' : '#EF4444'
    }
  ];

  return (
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-lg flex flex-col justify-between h-full min-h-[220px]">
      <div>
        <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-400 flex items-center gap-2 mb-2 border-b border-[#232630] pb-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          LLM Confidence Gauge
        </h3>

        <div className="h-[120px] relative mt-1 flex items-center justify-center">
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="75%"
                outerRadius="100%"
                barSize={8}
                data={chartData}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: '#1F2937' }}
                  dataKey="value"
                  cornerRadius={4}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center z-10 flex flex-col items-center">
            <span className="text-xl font-bold font-mono text-white">{percentage.toFixed(0)}%</span>
            <span className="text-[9px] text-gray-500 font-mono mt-0.5 truncate max-w-[120px]" title={label}>
              {label}
            </span>
          </div>
        </div>
      </div>

      <div className="text-[9px] text-gray-500 leading-tight text-center">
        Measures reliability scoring from the rule lookup table and LLM fallback engines.
      </div>
    </div>
  );
}
