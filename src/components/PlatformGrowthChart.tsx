import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyGrowthPoint } from '../types';

interface PlatformGrowthChartProps {
  data: MonthlyGrowthPoint[];
  theme?: 'light' | 'dark';
}

export const PlatformGrowthChart: React.FC<PlatformGrowthChartProps> = ({
  data,
  theme = 'light',
}) => {
  const first = data[0]?.projectsCompleted ?? 0;
  const latest = data[data.length - 1]?.projectsCompleted ?? 0;
  const growthPct = first > 0 ? Math.round(((latest - first) / first) * 100) : 0;

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#2A352E' : '#E2E6E3';
  const tickFill = isDark ? '#B4C0B8' : '#141715';
  const lineColor = isDark ? '#34D399' : '#075B35';
  const dotStroke = isDark ? '#171D19' : '#FFFFFF';

  return (
    <div className="mt-6 bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 mb-5 border-b border-[#F4F6F4] dark:border-[#2A352E]">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-[#075B35] dark:text-[#34D399]">
            Platform Growth
          </p>
          <h3 className="font-display text-lg font-bold text-[#141715] dark:text-[#EDF2EE] mt-0.5">
            Projects Completed Over the Last 6 Months
          </h3>
          <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
            Monthly completion trajectory combining demonstration baseline milestones with live
            registry completions.
          </p>
        </div>
        <div className="flex items-baseline gap-4 shrink-0">
          <div className="text-right">
            <p className="font-mono-num text-2xl font-bold text-[#075B35] dark:text-[#34D399]">
              {latest}
            </p>
            <p className="text-[11px] text-[#141715]/65 dark:text-[#B4C0B8]">Current Month</p>
          </div>
          <div className="text-right pl-4 border-l border-[#E2E6E3] dark:border-[#2A352E]">
            <p className="font-mono-num text-2xl font-bold text-[#141715] dark:text-[#EDF2EE]">
              +{growthPct}%
            </p>
            <p className="text-[11px] text-[#141715]/65 dark:text-[#B4C0B8]">6-Month Trajectory</p>
          </div>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="afroGrowthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDark ? '#34D399' : '#008C45'} stopOpacity={0.24} />
                <stop offset="95%" stopColor={isDark ? '#34D399' : '#008C45'} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: tickFill, opacity: 0.78, fontSize: 12, fontFamily: 'JetBrains Mono' }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tick={{ fill: tickFill, opacity: 0.78, fontSize: 12, fontFamily: 'JetBrains Mono' }}
            />
            <Tooltip
              cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '4 4' }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const value = payload[0].value;
                return (
                  <div className="bg-[#101010] dark:bg-[#1E2621] text-white px-3.5 py-2.5 rounded-lg border border-[#075B35] dark:border-[#34D399] shadow-md text-xs">
                    <p className="text-white/75 font-medium">{label}</p>
                    <p className="font-mono-num font-bold text-sm text-[#4ADE80] mt-0.5">
                      {value} Projects Completed
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="projectsCompleted"
              stroke={lineColor}
              strokeWidth={2.5}
              fill="url(#afroGrowthFill)"
              activeDot={{ r: 5, fill: '#008C45', stroke: dotStroke, strokeWidth: 2 }}
              dot={{ r: 3.5, fill: lineColor, stroke: dotStroke, strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
