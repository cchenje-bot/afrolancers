import React, { useState } from 'react';
import { ArrowRight, Globe2, MapPin } from 'lucide-react';
import type { TalentMapHub } from '../types';

interface TalentMapSectionProps {
  hubs: TalentMapHub[];
  onExploreCountry: (target: 'hire' | 'find-work', country: string) => void;
}

export const TalentMapSection: React.FC<TalentMapSectionProps> = ({
  hubs,
  onExploreCountry,
}) => {
  const [regionFilter, setRegionFilter] = useState<'all' | 'Africa' | 'Global'>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('Ghana');

  const visibleHubs = hubs.filter((h) =>
    regionFilter === 'all' ? true : h.region === regionFilter
  );

  const selectedHub =
    visibleHubs.find((h) => h.country === selectedCountry) ||
    visibleHubs.find((h) => h.freelancersCount > 0 || h.openJobsCount > 0) ||
    visibleHubs[0];

  const africanTalentTotal = hubs
    .filter((h) => h.region === 'Africa')
    .reduce((sum, h) => sum + h.freelancersCount, 0);
  const globalTalentTotal = hubs
    .filter((h) => h.region === 'Global')
    .reduce((sum, h) => sum + h.freelancersCount, 0);
  const totalOpenRoles = hubs.reduce((sum, h) => sum + h.openJobsCount, 0);

  return (
    <section className="py-16 bg-white dark:bg-[#0F1411] border-b border-[#E2E6E3] dark:border-[#2A352E] transition-colors">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-[#075B35] dark:text-[#34D399] inline-flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" />
              Work From Anywhere Network
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141715] dark:text-[#EDF2EE] mt-1">
              African &amp; Global Talent Opportunity Map
            </h2>
            <p className="text-sm text-[#141715]/75 dark:text-[#B4C0B8] mt-1.5 max-w-2xl leading-relaxed">
              Explore active professionals and live remote opportunities across African innovation
              hubs and international diaspora &amp; client markets worldwide.
            </p>
          </div>

          <div className="inline-flex p-1 bg-[#F4F6F4] dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg self-start">
            {(
              [
                { id: 'all', label: 'All Global Hubs' },
                { id: 'Africa', label: 'African Hubs' },
                { id: 'Global', label: 'International Hubs' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRegionFilter(opt.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  regionFilter === opt.id
                    ? 'bg-[#075B35] text-white'
                    : 'text-[#141715]/75 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Interactive SVG Projection */}
          <div className="lg:col-span-8 bg-[#F4F6F4]/70 dark:bg-[#121814] border border-[#E2E6E3] dark:border-[#2A352E] rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <svg
              viewBox="0 0 1000 500"
              className="w-full h-auto select-none"
              role="img"
              aria-label="Interactive map showing African and Global freelance talent hubs"
            >
              {/* Subtle Latitude / Longitude Grid */}
              <g stroke="currentColor" className="text-[#075B35]/10 dark:text-[#34D399]/10" strokeWidth="1">
                <line x1="0" y1="125" x2="1000" y2="125" />
                <line x1="0" y1="250" x2="1000" y2="250" />
                <line x1="0" y1="375" x2="1000" y2="375" />
                <line x1="250" y1="0" x2="250" y2="500" />
                <line x1="500" y1="0" x2="500" y2="500" />
                <line x1="750" y1="0" x2="750" y2="500" />
              </g>

              {/* Simplified Stylized Continental Silhouettes */}
              <g className="fill-[#DDE3DF] dark:fill-[#1F2923] stroke-[#C7D0CA] dark:stroke-[#2D3B32]" strokeWidth="1.2">
                {/* North America */}
                <path d="M90,65 L285,55 L325,115 L295,180 L235,215 L195,210 L150,165 L110,130 Z" />
                {/* South America */}
                <path d="M275,245 L350,260 L385,320 L355,405 L310,455 L285,390 L265,305 Z" />
                {/* Europe */}
                <path d="M435,65 L560,55 L585,115 L540,155 L460,150 L440,115 Z" />
                {/* Africa (Centered & Emphasized) */}
                <path
                  d="M445,175 L545,175 L575,205 L615,255 L605,305 L565,365 L545,415 L510,415 L490,340 L445,285 L415,245 L425,195 Z"
                  className="fill-[#075B35]/18 dark:fill-[#34D399]/16 stroke-[#075B35]/45 dark:stroke-[#34D399]/45"
                  strokeWidth="1.8"
                />
                {/* Middle East & Asia */}
                <path d="M585,115 L775,90 L860,145 L830,240 L745,270 L685,260 L620,235 L585,185 Z" />
                {/* Australia */}
                <path d="M785,335 L895,330 L915,400 L840,420 L785,385 Z" />
              </g>

              {/* Hub Connections from Africa Core to Global Corridors */}
              {visibleHubs
                .filter((h) => h.region === 'Global')
                .map((h) => (
                  <line
                    key={`corridor-${h.country}`}
                    x1={515}
                    y1={280}
                    x2={h.x}
                    y2={h.y}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-[#075B35]/20 dark:text-[#34D399]/25"
                    strokeWidth="1"
                  />
                ))}

              {/* Interactive Hub Markers */}
              {visibleHubs.map((hub) => {
                const isSelected = selectedHub?.country === hub.country;
                const hasActivity = hub.freelancersCount > 0 || hub.openJobsCount > 0;
                const radius = isSelected ? 10 : hasActivity ? 7.5 : 5.5;
                return (
                  <g
                    key={hub.country}
                    className="cursor-pointer"
                    onClick={() => setSelectedCountry(hub.country)}
                  >
                    {isSelected && (
                      <circle
                        cx={hub.x}
                        cy={hub.y}
                        r={17}
                        className="fill-[#008C45]/20 dark:fill-[#34D399]/20"
                      />
                    )}
                    <circle
                      cx={hub.x}
                      cy={hub.y}
                      r={radius}
                      className={
                        isSelected
                          ? 'fill-[#E52525] stroke-white'
                          : hub.region === 'Africa'
                            ? 'fill-[#075B35] dark:fill-[#34D399] stroke-white dark:stroke-[#101010]'
                            : 'fill-[#101010] dark:fill-[#94A3B8] stroke-white dark:stroke-[#101010]'
                      }
                      strokeWidth="2"
                    />
                    <text
                      x={hub.x}
                      y={hub.y - 13}
                      textAnchor="middle"
                      className={`text-[10px] font-semibold pointer-events-none ${
                        isSelected
                          ? 'fill-[#141715] dark:fill-white font-bold'
                          : 'fill-[#141715]/75 dark:fill-[#B4C0B8]'
                      }`}
                    >
                      {hub.hubCity}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="mt-3 pt-3 border-t border-[#E2E6E3] dark:border-[#2A352E] flex flex-wrap items-center justify-between gap-4 text-xs text-[#141715]/75 dark:text-[#B4C0B8]">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#075B35] dark:bg-[#34D399]" />
                  African Hub ({africanTalentTotal} active)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#101010] dark:bg-[#94A3B8]" />
                  Global / Diaspora Hub ({globalTalentTotal} active)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E52525]" />
                  Selected Location
                </span>
              </div>
              <span className="font-mono-num font-semibold text-[#075B35] dark:text-[#34D399]">
                {totalOpenRoles} open regional &amp; remote roles
              </span>
            </div>
          </div>

          {/* Right: Selected Country / Hub Breakdown + Quick List */}
          <div className="lg:col-span-4 bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-2xl p-6 flex flex-col justify-between space-y-5">
            {selectedHub ? (
              <div className="space-y-4">
                <div className="pb-4 border-b border-[#E2E6E3] dark:border-[#2A352E]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#075B35] dark:text-[#34D399]">
                    {selectedHub.region} Corridor · {selectedHub.timezone}
                  </p>
                  <h3 className="font-display text-xl font-bold mt-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#E52525]" />
                    {selectedHub.hubCity}, {selectedHub.country}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F4F6F4] dark:bg-[#1E2621] border border-[#E2E6E3] dark:border-[#2A352E]">
                    <p className="font-mono-num text-2xl font-bold text-[#075B35] dark:text-[#34D399]">
                      {selectedHub.freelancersCount}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Available Freelancers
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F4F6F4] dark:bg-[#1E2621] border border-[#E2E6E3] dark:border-[#2A352E]">
                    <p className="font-mono-num text-2xl font-bold text-[#141715] dark:text-[#EDF2EE]">
                      {selectedHub.openJobsCount}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Open Opportunities
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#141715]/60 dark:text-[#B4C0B8]">
                    Active Specialties
                  </p>
                  <p className="text-xs text-[#141715]/85 dark:text-[#EDF2EE]/90 mt-1.5 leading-relaxed">
                    {selectedHub.topCategories.length > 0
                      ? selectedHub.topCategories.join(' · ')
                      : 'Software Development · Finance · Digital Operations'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => onExploreCountry('hire', selectedHub.country)}
                    className="py-2.5 px-3 bg-[#075B35] hover:bg-[#008C45] text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1 transition-colors"
                  >
                    Hire Here <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onExploreCountry('find-work', selectedHub.country)}
                    className="py-2.5 px-3 border border-[#E2E6E3] dark:border-[#2A352E] hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621] text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1 transition-colors"
                  >
                    Jobs Here
                  </button>
                </div>
              </div>
            ) : null}

            <div className="pt-4 border-t border-[#E2E6E3] dark:border-[#2A352E]">
              <p className="text-xs font-semibold mb-2.5 text-[#141715]/75 dark:text-[#B4C0B8]">
                Quick Select Hub
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {visibleHubs.map((hub) => (
                  <button
                    key={hub.country}
                    type="button"
                    onClick={() => setSelectedCountry(hub.country)}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors flex items-center justify-between ${
                      selectedHub?.country === hub.country
                        ? 'bg-[#075B35] text-white font-semibold'
                        : 'hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621] text-[#141715]/80 dark:text-[#B4C0B8]'
                    }`}
                  >
                    <span className="truncate">{hub.country}</span>
                    <span className="font-mono-num text-[11px] opacity-80 ml-1">
                      {hub.freelancersCount + hub.openJobsCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
