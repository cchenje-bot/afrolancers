import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  BellRing,
  Bookmark,
  Crown,
  Flag,
  Globe2,
  GraduationCap,
  MapPin,
  RotateCcw,
  Search,
  Star,
  Video,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  CATEGORY_NAMES,
  COUNTRIES,
  EXPERIENCE_LEVELS,
  JOB_TYPES,
  LANGUAGES,
  TIMEZONES,
} from '../lib/constants';
import type { JobListing, PublicUser } from '../types';
import { ResilientImage } from './ResilientImage';

interface SearchDirectoryProps {
  mode: 'hire' | 'find-work';
  initialQuery?: string;
  initialCategory?: string;
  initialCountry?: string;
  savedJobIds: string[];
  shortlistedIds: string[];
  currentUser: PublicUser | null;
  onModeChange: (mode: 'hire' | 'find-work') => void;
  onSelectFreelancer: (id: string) => void;
  onApplyJob: (job: JobListing) => void;
  onToggleSaveJob: (jobId: string) => void;
  onToggleShortlist: (freelancerId: string) => void;
  onUserUpdated: (user: PublicUser) => void;
  onNotify: (msg: string) => void;
}

export const SearchDirectory: React.FC<SearchDirectoryProps> = ({
  mode,
  initialQuery = '',
  initialCategory = '',
  initialCountry = '',
  savedJobIds,
  shortlistedIds,
  currentUser,
  onModeChange,
  onSelectFreelancer,
  onApplyJob,
  onToggleSaveJob,
  onToggleShortlist,
  onUserUpdated,
  onNotify,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [skillFilter, setSkillFilter] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [country, setCountry] = useState(initialCountry);

  // Work From Anywhere filters
  const [regionScope, setRegionScope] = useState<'all' | 'africa' | 'global'>('all');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');
  const [timezone, setTimezone] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Freelancer filters
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [minRating, setMinRating] = useState('');

  // Job filters
  const [jobType, setJobType] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);

  const [freelancers, setFreelancers] = useState<PublicUser[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAlert, setSavingAlert] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
    setCategory(initialCategory);
    if (initialCountry !== undefined) {
      setCountry(initialCountry);
    }
  }, [initialQuery, initialCategory, initialCountry]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (mode === 'hire') {
      api
        .searchFreelancers({
          q: query,
          skill: skillFilter,
          category,
          country,
          city,
          language,
          timezone,
          regionScope,
          verifiedOnly,
          experience,
          availability,
          maxRate: maxRate ? Number(maxRate) : undefined,
          minRating: minRating ? Number(minRating) : undefined,
        })
        .then((res) => {
          if (active) setFreelancers(res.freelancers);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      api
        .searchJobs({
          q: query,
          skill: skillFilter,
          category,
          country,
          jobType,
          minBudget: minBudget ? Number(minBudget) : undefined,
          remoteOnly,
        })
        .then((res) => {
          if (active) setJobs(res.jobs);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [
    mode,
    query,
    skillFilter,
    category,
    country,
    city,
    language,
    timezone,
    regionScope,
    verifiedOnly,
    experience,
    availability,
    maxRate,
    minRating,
    jobType,
    minBudget,
    remoteOnly,
  ]);

  const resetFilters = () => {
    setQuery('');
    setSkillFilter('');
    setCategory('');
    setCountry('');
    setRegionScope('all');
    setCity('');
    setLanguage('');
    setTimezone('');
    setVerifiedOnly(false);
    setExperience('');
    setAvailability('');
    setMaxRate('');
    setMinRating('');
    setJobType('');
    setMinBudget('');
    setRemoteOnly(false);
  };

  const handleSaveAsProjectAlert = async () => {
    if (!currentUser || currentUser.role !== 'freelancer') {
      onNotify('Sign in as a registered freelancer to configure live Project Alerts.');
      return;
    }
    setSavingAlert(true);
    try {
      const existing = currentUser.projectAlerts;
      const nextCategories = category
        ? Array.from(new Set([...(existing?.categories || []), category]))
        : existing?.categories || (currentUser.category ? [currentUser.category] : []);
      const combinedKeywords = [query.trim(), skillFilter.trim()]
        .filter(Boolean)
        .concat(existing?.keywords || []);
      const uniqueKeywords = Array.from(new Set(combinedKeywords));

      const res = await api.updateAlertPreferences({
        enabled: true,
        categories: nextCategories,
        keywords: uniqueKeywords,
        minBudget: minBudget ? Number(minBudget) : existing?.minBudget || 0,
        remoteOnly: remoteOnly || existing?.remoteOnly || false,
      });
      onUserUpdated(res.user);
      onNotify('Project Alert updated! You will be notified when matching projects are posted.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to save Project Alert.');
    } finally {
      setSavingAlert(false);
    }
  };

  const handleReportJob = async (job: JobListing) => {
    if (!currentUser) {
      onNotify('Please sign in to submit a moderation report.');
      return;
    }
    try {
      await api.submitReport({
        targetType: 'job',
        targetId: job.id,
        targetLabel: job.title,
        reason: 'Suspicious or inaccurate job brief',
        details: 'Reported from Jobs Directory.',
      });
      onNotify(`Reported "${job.title}" to administration.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to submit report.');
    }
  };

  const fieldClass =
    'w-full px-3 py-2 text-sm border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-white dark:bg-[#1E2621] text-[#141715] dark:text-[#EDF2EE] placeholder:text-[#141715]/45 dark:placeholder:text-[#B4C0B8]/60 focus:outline-none focus:border-[#075B35] dark:focus:border-[#34D399]';

  return (
    <div className="min-h-[75vh] bg-[#F4F6F4]/55 dark:bg-[#0F1411] py-10 transition-colors">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Directory Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#E2E6E3] dark:border-[#2A352E]">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#141715] dark:text-[#EDF2EE]">
              {mode === 'hire'
                ? 'Hire African & Global Freelancers'
                : 'Browse Open Freelance Jobs'}
            </h1>
            <p className="text-sm text-[#141715]/75 dark:text-[#B4C0B8] mt-1 leading-relaxed">
              {mode === 'hire'
                ? 'Work From Anywhere: filter professionals by country, city, language, time zone, verified credentials, and rate.'
                : 'Search open remote and contract opportunities across Africa and international organizations.'}
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg self-start">
            <button
              type="button"
              onClick={() => onModeChange('hire')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'hire'
                  ? 'bg-[#075B35] text-white'
                  : 'text-[#141715]/75 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white'
              }`}
            >
              Browse Talent
            </button>
            <button
              type="button"
              onClick={() => onModeChange('find-work')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'find-work'
                  ? 'bg-[#008C45] text-white'
                  : 'text-[#141715]/75 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white'
              }`}
            >
              Browse Jobs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-3 space-y-4 bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-5 self-start">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E3] dark:border-[#2A352E]">
              <h2 className="font-display text-sm font-bold text-[#141715] dark:text-[#EDF2EE]">
                Work From Anywhere Filters
              </h2>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-[#075B35] dark:text-[#34D399] hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Keyword Search</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#141715]/45 dark:text-[#B4C0B8] absolute left-3 top-3" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={mode === 'hire' ? 'Title, name, skill...' : 'Job title, company...'}
                  className={`${fieldClass} pl-8`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Specific Skill</label>
              <input
                type="text"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="e.g. TypeScript, IFRS, Figma"
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={fieldClass}
              >
                <option value="">All Categories</option>
                {CATEGORY_NAMES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={fieldClass}
              >
                <option value="">All Countries</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'hire' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1">Region Scope</label>
                  <select
                    value={regionScope}
                    onChange={(e) =>
                      setRegionScope(e.target.value as 'all' | 'africa' | 'global')
                    }
                    className={fieldClass}
                  >
                    <option value="all">Africa &amp; Global Diaspora</option>
                    <option value="africa">Africa Resident Talent</option>
                    <option value="global">Global &amp; International Hubs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Nairobi, Lagos, London"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Any Language</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Time Zone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Any Time Zone</option>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Experience Level</label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Any Level</option>
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Availability</label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Any Availability</option>
                    <option value="Available Now">Available Now</option>
                    <option value="Open to Offers">Open to Offers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Max Hourly Rate (USD)
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={maxRate}
                    onChange={(e) => setMaxRate(e.target.value)}
                    placeholder="e.g. 75"
                    className={`${fieldClass} font-mono-num`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Minimum Verified Rating
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">All Profiles</option>
                    <option value="4">4.0+ Verified Stars</option>
                    <option value="4.5">4.5+ Verified Stars</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 accent-[#075B35]"
                  />
                  Identity &amp; Skills Verified Only
                </label>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1">Job Type</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">All Job Types</option>
                    {JOB_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Minimum Budget (USD)
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    placeholder="e.g. 500"
                    className={`${fieldClass} font-mono-num`}
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs font-semibold pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remoteOnly}
                    onChange={(e) => setRemoteOnly(e.target.checked)}
                    className="w-4 h-4 accent-[#075B35]"
                  />
                  Remote Opportunities Only
                </label>

                {currentUser?.role === 'freelancer' && (
                  <div className="pt-3 border-t border-[#E2E6E3] dark:border-[#2A352E]">
                    <button
                      type="button"
                      disabled={savingAlert}
                      onClick={handleSaveAsProjectAlert}
                      className="w-full py-2.5 px-3 bg-[#075B35] hover:bg-[#008C45] text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      {savingAlert ? 'Saving Alert...' : 'Save Search as Project Alert'}
                    </button>
                  </div>
                )}
              </>
            )}
          </aside>

          {/* Results Grid */}
          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-52 bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : mode === 'hire' ? (
              freelancers.length === 0 ? (
                <div className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-10 text-center space-y-3">
                  <p className="font-display text-lg font-bold">
                    No freelancers match your current filters
                  </p>
                  <p className="text-sm text-[#141715]/70 dark:text-[#B4C0B8]">
                    Try clearing one or more filter constraints to broaden your talent search.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 bg-[#075B35] text-white text-xs font-semibold rounded-lg"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs font-medium text-[#141715]/70 dark:text-[#B4C0B8] font-mono-num">
                    Showing {freelancers.length} freelancer{freelancers.length === 1 ? '' : 's'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {freelancers.map((fl) => {
                      const shortlisted = shortlistedIds.includes(fl.id);
                      return (
                        <article
                          key={fl.id}
                          className={`bg-white dark:bg-[#171D19] rounded-xl p-6 transition-colors flex flex-col justify-between ${
                            fl.isFeaturedProfile
                              ? 'border-2 border-[#075B35] dark:border-[#34D399]'
                              : 'border border-[#E2E6E3] dark:border-[#2A352E] hover:border-[#075B35] dark:hover:border-[#34D399]'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3.5 min-w-0">
                                <ResilientImage
                                  src={fl.photoUrl}
                                  alt={fl.fullName}
                                  fallbackLabel={fl.fullName}
                                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#E2E6E3] dark:border-[#2A352E]"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h3 className="font-display text-base font-bold truncate">
                                      {fl.fullName}
                                    </h3>
                                    {fl.identityVerified && (
                                      <span title="Identity Verified">
                                        <BadgeCheck className="w-4 h-4 text-[#075B35] dark:text-[#34D399] shrink-0" />
                                      </span>
                                    )}
                                    {fl.skillsVerified && (
                                      <span title="Skills Certified">
                                        <GraduationCap className="w-4 h-4 text-[#008C45] dark:text-[#4ADE80] shrink-0" />
                                      </span>
                                    )}
                                    {fl.freelancerOfTheMonth && (
                                      <span title="Freelancer of the Month">
                                        <Crown className="w-4 h-4 text-[#E52525] shrink-0" />
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-medium text-[#075B35] dark:text-[#34D399] mt-0.5 truncate">
                                    {fl.title}
                                  </p>
                                  <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8] mt-1 flex flex-wrap items-center gap-1">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span>
                                      {fl.city ? `${fl.city}, ` : ''}
                                      {fl.country}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>{fl.timezone || 'UTC'}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{fl.availability}</span>
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onToggleShortlist(fl.id)}
                                aria-label="Shortlist freelancer"
                                className={`w-9 h-9 inline-flex items-center justify-center rounded-lg border shrink-0 ${
                                  shortlisted
                                    ? 'border-[#075B35] dark:border-[#34D399] bg-[#075B35]/10 text-[#075B35] dark:text-[#34D399]'
                                    : 'border-[#E2E6E3] dark:border-[#2A352E] text-[#141715]/55 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white'
                                }`}
                              >
                                <Bookmark className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-[#141715]/70 dark:text-[#B4C0B8]">
                              {fl.isFeaturedProfile && (
                                <span className="font-bold uppercase tracking-wider text-[#E52525]">
                                  Featured Specialist
                                </span>
                              )}
                              {fl.videoIntroUrl && (
                                <span className="inline-flex items-center gap-1 text-[#075B35] dark:text-[#34D399] font-semibold">
                                  <Video className="w-3 h-3" /> Video Intro
                                </span>
                              )}
                              {(fl.languages || []).length > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <Globe2 className="w-3 h-3" />
                                  {(fl.languages || []).slice(0, 2).join(', ')}
                                </span>
                              )}
                              {typeof fl.profileCompletionScore === 'number' && (
                                <span className="font-mono-num">
                                  Profile {fl.profileCompletionScore}%
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-[#141715]/80 dark:text-[#B4C0B8] mt-3 line-clamp-2 leading-relaxed">
                              {fl.bio}
                            </p>

                            <p className="mt-3 text-xs font-medium text-[#141715]/75 dark:text-[#EDF2EE]/80">
                              {(fl.skills || []).slice(0, 5).join(' · ')}
                            </p>
                          </div>

                          <div className="mt-5 pt-4 border-t border-[#F4F6F4] dark:border-[#2A352E] flex items-center justify-between gap-3">
                            <div className="text-xs">
                              <span className="font-mono-num font-bold text-sm">
                                ${fl.hourlyRate}/hr
                              </span>
                              <span className="mx-2 opacity-30">·</span>
                              {fl.ratingAverage ? (
                                <span className="inline-flex items-center gap-1 font-mono-num">
                                  <Star className="w-3.5 h-3.5 fill-[#008C45] text-[#008C45] dark:fill-[#34D399] dark:text-[#34D399]" />
                                  {fl.ratingAverage} ({fl.reviewCount})
                                </span>
                              ) : (
                                <span className="text-[#141715]/60 dark:text-[#B4C0B8]">
                                  New Profile
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSelectFreelancer(fl.id)}
                                className="px-3.5 py-2 text-xs font-semibold border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]"
                              >
                                Profile
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectFreelancer(fl.id)}
                                className="px-3.5 py-2 text-xs font-semibold bg-[#075B35] hover:bg-[#008C45] text-white rounded-lg"
                              >
                                Hire
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )
            ) : jobs.length === 0 ? (
              <div className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-10 text-center space-y-3">
                <p className="font-display text-lg font-bold">
                  No open jobs match your current filters
                </p>
                <p className="text-sm text-[#141715]/70 dark:text-[#B4C0B8]">
                  Adjust your category, budget, or job type filters to view more opportunities.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 bg-[#008C45] text-white text-xs font-semibold rounded-lg"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-medium text-[#141715]/70 dark:text-[#B4C0B8] font-mono-num">
                  Showing {jobs.length} open opportunity{jobs.length === 1 ? '' : 'ies'}
                </p>
                <div className="space-y-4">
                  {jobs.map((job) => {
                    const saved = savedJobIds.includes(job.id);
                    return (
                      <article
                        key={job.id}
                        className={`bg-white dark:bg-[#171D19] rounded-xl p-6 transition-colors ${
                          job.isFeatured
                            ? 'border-2 border-[#075B35] dark:border-[#34D399]'
                            : 'border border-[#E2E6E3] dark:border-[#2A352E] hover:border-[#075B35] dark:hover:border-[#34D399]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8] flex flex-wrap items-center gap-1.5">
                              {job.isFeatured && (
                                <span className="font-bold uppercase tracking-wider text-[#E52525]">
                                  Featured Brief ·
                                </span>
                              )}
                              <span>
                                {job.companyName} · {job.category} · {job.remoteStatus}
                              </span>
                            </p>
                            <h3 className="font-display text-lg font-bold mt-1">{job.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono-num text-sm font-bold text-[#075B35] dark:text-[#34D399]">
                              ${job.budgetMin.toLocaleString()}–${job.budgetMax.toLocaleString()}
                              {job.budgetType === 'hourly' ? '/hr' : ' fixed'}
                            </span>
                            <button
                              type="button"
                              onClick={() => onToggleSaveJob(job.id)}
                              aria-label="Save job"
                              className={`w-9 h-9 inline-flex items-center justify-center rounded-lg border ${
                                saved
                                  ? 'border-[#075B35] dark:border-[#34D399] bg-[#075B35]/10 text-[#075B35] dark:text-[#34D399]'
                                  : 'border-[#E2E6E3] dark:border-[#2A352E] text-[#141715]/55 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white'
                              }`}
                            >
                              <Bookmark className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-sm text-[#141715]/80 dark:text-[#B4C0B8] mt-3 leading-relaxed">
                          {job.description}
                        </p>

                        <p className="mt-3 text-xs font-medium text-[#141715]/75 dark:text-[#EDF2EE]/80">
                          Required: {job.skillsRequired.join(' · ')}
                        </p>

                        <div className="mt-5 pt-4 border-t border-[#F4F6F4] dark:border-[#2A352E] flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                            <span>{job.experienceLevel}</span>
                            <span aria-hidden="true">·</span>
                            <span>{job.jobType}</span>
                            <span aria-hidden="true">·</span>
                            <span>{job.country}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-num">Deadline {job.deadline}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleReportJob(job)}
                              className="text-xs text-[#141715]/55 dark:text-[#B4C0B8] hover:text-[#E52525] inline-flex items-center gap-1"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              Report
                            </button>
                            <button
                              type="button"
                              onClick={() => onApplyJob(job)}
                              className="px-4 py-2 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              Apply Now
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
