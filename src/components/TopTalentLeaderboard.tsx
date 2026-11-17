import React from 'react';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  ExternalLink,
  Flame,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Star,
  Trophy,
} from 'lucide-react';
import type { AdCampaign, PublicUser } from '../types';
import { ResilientImage } from './ResilientImage';

interface TopTalentLeaderboardProps {
  freelancerOfTheMonth: PublicUser | null;
  top10: PublicUser[];
  ads: AdCampaign[];
  onSelectFreelancer: (id: string) => void;
}

export const TopTalentLeaderboard: React.FC<TopTalentLeaderboardProps> = ({
  freelancerOfTheMonth,
  top10,
  ads,
  onSelectFreelancer,
}) => {
  return (
    <section className="py-16 bg-[#F4F6F4]/60 dark:bg-[#121814] border-b border-[#E2E6E3] dark:border-[#2A352E] transition-colors">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-[#075B35] dark:text-[#34D399] inline-flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              Excellence &amp; Recognition
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141715] dark:text-[#EDF2EE] mt-1">
              Freelancer of the Month &amp; Top 10 Leaderboard
            </h2>
          </div>
          <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] max-w-md leading-relaxed">
            Ranked by verified identity &amp; skills certification, client review scores, project
            completion reliability, and weekly consistency streaks.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Freelancer of the Month Spotlight */}
          {freelancerOfTheMonth && (
            <div className="lg:col-span-5 bg-[#101010] dark:bg-[#171D19] text-white border border-[#2A352E] rounded-2xl p-7 space-y-5">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/15">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4ADE80]">
                  <Award className="w-4 h-4" />
                  Freelancer of the Month
                </span>
                <span className="font-mono-num text-xs text-white/75">
                  {freelancerOfTheMonth.profileCompletionScore || 95}% Profile Score
                </span>
              </div>

              <div className="flex items-start gap-4">
                <ResilientImage
                  src={freelancerOfTheMonth.photoUrl}
                  alt={freelancerOfTheMonth.fullName}
                  fallbackLabel={freelancerOfTheMonth.fullName}
                  className="w-20 h-20 rounded-xl object-cover shrink-0 border border-white/20"
                />
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-bold">
                    {freelancerOfTheMonth.fullName}
                  </h3>
                  <p className="text-xs font-medium text-[#4ADE80] mt-0.5">
                    {freelancerOfTheMonth.title}
                  </p>
                  <p className="text-xs text-white/75 mt-1.5 inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {freelancerOfTheMonth.city ? `${freelancerOfTheMonth.city}, ` : ''}
                    {freelancerOfTheMonth.country}
                  </p>
                </div>
              </div>

              <p className="text-sm text-white/85 leading-relaxed">
                {freelancerOfTheMonth.bio}
              </p>

              {/* Verification & Gamification Indicators (Zero-Pill Clean Inline Layout) */}
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/15 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#4ADE80] shrink-0" />
                  <span>
                    {freelancerOfTheMonth.identityVerified ? 'Identity Verified' : 'Verified Member'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#4ADE80] shrink-0" />
                  <span>
                    {freelancerOfTheMonth.skillsVerified ? 'Skills Certified' : 'Active Specialist'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono-num">
                  <Flame className="w-4 h-4 text-[#E52525] shrink-0" />
                  <span>{freelancerOfTheMonth.activityStreakWeeks || 12}-Week Streak</span>
                </div>
                <div className="flex items-center gap-2 font-mono-num">
                  <Star className="w-4 h-4 text-[#4ADE80] shrink-0" />
                  <span>
                    {freelancerOfTheMonth.ratingAverage
                      ? `${freelancerOfTheMonth.ratingAverage} Rating`
                      : '5.0 Benchmark'}
                  </span>
                </div>
              </div>

              {(freelancerOfTheMonth.achievementBadges || []).length > 0 && (
                <p className="text-xs text-white/80">
                  <strong className="text-white">Achievements:</strong>{' '}
                  {freelancerOfTheMonth.achievementBadges?.join(' · ')}
                </p>
              )}

              <button
                type="button"
                onClick={() => onSelectFreelancer(freelancerOfTheMonth.id)}
                className="w-full py-3 px-4 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-bold rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
              >
                Inspect Profile &amp; Book Interview
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Right: Top 10 African & Global Freelancers Ranked List */}
          <div className="lg:col-span-7 bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-[#E2E6E3] dark:border-[#2A352E]">
              <h3 className="font-display text-base font-bold">
                Top Ranked Professionals ({top10.length})
              </h3>
              <span className="text-xs text-[#075B35] dark:text-[#34D399] font-semibold">
                Verified Merit Ranking
              </span>
            </div>

            <div className="divide-y divide-[#F4F6F4] dark:divide-[#2A352E]">
              {top10.map((fl, idx) => (
                <div
                  key={fl.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="font-mono-num text-sm font-extrabold w-6 text-center text-[#075B35] dark:text-[#34D399] shrink-0">
                      #{idx + 1}
                    </span>
                    <ResilientImage
                      src={fl.photoUrl}
                      alt={fl.fullName}
                      fallbackLabel={fl.fullName}
                      className="w-11 h-11 rounded-lg object-cover shrink-0 border border-[#E2E6E3] dark:border-[#2A352E]"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectFreelancer(fl.id)}
                          className="font-display text-sm font-bold hover:text-[#075B35] dark:hover:text-[#34D399] hover:underline truncate text-left"
                        >
                          {fl.fullName}
                        </button>
                        {fl.identityVerified && (
                          <span title="Identity Verified">
                            <BadgeCheck className="w-3.5 h-3.5 text-[#008C45] dark:text-[#34D399] shrink-0" />
                          </span>
                        )}
                        {fl.skillsVerified && (
                          <span title="Skills Certified">
                            <GraduationCap className="w-3.5 h-3.5 text-[#075B35] dark:text-[#34D399] shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] truncate">
                        {fl.title} · {fl.city ? `${fl.city}, ` : ''}
                        {fl.country}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0 pl-9 sm:pl-0">
                    <span className="font-mono-num text-[#141715]/75 dark:text-[#B4C0B8] inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#E52525]" />
                      {fl.activityStreakWeeks || 1}w
                    </span>
                    <span className="font-mono-num font-bold text-[#141715] dark:text-[#EDF2EE]">
                      ${fl.hourlyRate}/hr
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectFreelancer(fl.id)}
                      className="px-3 py-1.5 border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg font-semibold hover:border-[#075B35] dark:hover:border-[#34D399] transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Business Sponsor Spotlights (Marketplace Advertising Slots) */}
        {ads.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#141715]/55 dark:text-[#B4C0B8]">
                Sponsored Business Solutions
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ads.slice(0, 2).map((ad) => (
                <div
                  key={ad.id}
                  className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#075B35] dark:text-[#34D399]">
                      {ad.advertiserName} · {ad.category}
                    </p>
                    <h4 className="font-display text-sm font-bold mt-1">{ad.title}</h4>
                    <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] mt-1 leading-relaxed">
                      {ad.summary}
                    </p>
                  </div>
                  <a
                    href={ad.targetUrl || '#'}
                    onClick={(e) => {
                      if (ad.targetUrl.startsWith('#')) {
                        e.preventDefault();
                        document
                          .getElementById(ad.targetUrl.slice(1))
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="px-4 py-2 bg-[#101010] dark:bg-[#075B35] hover:bg-[#075B35] dark:hover:bg-[#008C45] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                  >
                    {ad.ctaLabel}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
