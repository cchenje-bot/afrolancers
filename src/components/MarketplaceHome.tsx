import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  Calculator,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ClipboardList,
  Code2,
  Compass,
  Cpu,
  CreditCard,
  Database,
  FileText,
  GraduationCap,
  Headphones,
  HeartPulse,
  Lock,
  MapPin,
  Megaphone,
  MessageSquare,
  Mic,
  PenTool,
  Scale,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sprout,
  Star,
  TrendingUp,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { api } from '../lib/api';
import { POPULAR_SEARCHES } from '../lib/constants';
import type {
  CategoryItem,
  JobListing,
  PaymentGatewayInfo,
  PlatformStats,
  PublicUser,
  TalentHighlightsResponse,
  TestimonialItem,
} from '../types';
import type { AppView } from './Header';
import { PlatformGrowthChart } from './PlatformGrowthChart';
import { ResilientImage } from './ResilientImage';
import { TalentMapSection } from './TalentMapSection';
import { TopTalentLeaderboard } from './TopTalentLeaderboard';

interface MarketplaceHomeProps {
  stats: PlatformStats;
  categories: CategoryItem[];
  featuredFreelancers: PublicUser[];
  featuredJobs: JobListing[];
  testimonials: TestimonialItem[];
  savedJobIds: string[];
  theme: 'light' | 'dark';
  onSearch: (
    target: 'hire' | 'find-work',
    query: string,
    category?: string,
    country?: string
  ) => void;
  onNavigate: (view: AppView) => void;
  onSelectFreelancer: (id: string) => void;
  onApplyJob: (job: JobListing) => void;
  onToggleSaveJob: (jobId: string) => void;
  onOpenAuth: (mode: 'login' | 'register', role?: 'freelancer' | 'client') => void;
  onOpenPostJob: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2,
  PenTool,
  FileText,
  Megaphone,
  Calculator,
  CalendarCheck,
  Headphones,
  Camera,
  Compass,
  Briefcase,
  Database,
  TrendingUp,
  ClipboardList,
  GraduationCap,
  Wrench,
  Scale,
  Users,
  ShieldCheck,
  Cpu,
  Truck,
  HeartPulse,
  Sprout,
  Mic,
  ShoppingBag,
};

const TALENT_GROUPS = [
  { id: 'all', label: 'All Disciplines' },
  { id: 'tech', label: 'Engineering & AI' },
  { id: 'design', label: 'Design & Creative' },
  { id: 'finance', label: 'Finance & Advisory' },
  { id: 'growth', label: 'Growth & Operations' },
] as const;

export const MarketplaceHome: React.FC<MarketplaceHomeProps> = ({
  stats,
  categories,
  featuredFreelancers,
  featuredJobs,
  testimonials,
  savedJobIds,
  theme,
  onSearch,
  onNavigate,
  onSelectFreelancer,
  onApplyJob,
  onToggleSaveJob,
  onOpenAuth,
  onOpenPostJob,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTarget, setSearchTarget] = useState<'hire' | 'find-work'>('hire');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);

  const [talentGroup, setTalentGroup] = useState<(typeof TALENT_GROUPS)[number]['id']>('all');
  const [workflowRole, setWorkflowRole] = useState<'freelancer' | 'client'>('freelancer');

  // Interactive Escrow & Gateway Estimator state
  const [gateways, setGateways] = useState<PaymentGatewayInfo[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(5);
  const [estimateBudget, setEstimateBudget] = useState(3500);
  const [selectedGatewayPreview, setSelectedGatewayPreview] = useState<string>('paynow');
  const [highlights, setHighlights] = useState<TalentHighlightsResponse | null>(null);

  useEffect(() => {
    api
      .getPaymentGateways()
      .then((res) => {
        setGateways(res.gateways);
        setCommissionPercent(res.subscriptionSettings.commissionPercent);
      })
      .catch(() => {});
    api
      .getTalentHighlights()
      .then((res) => setHighlights(res))
      .catch(() => {});
  }, []);

  const filteredCategories = categories.filter((c) => {
    if (!categoryFilter.trim()) return true;
    const q = categoryFilter.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  });

  const visibleCategories =
    showAllCategories || categoryFilter.trim()
      ? filteredCategories
      : filteredCategories.slice(0, 9);

  const filteredTalent = featuredFreelancers.filter((fl) => {
    if (talentGroup === 'all') return true;
    const cat = (fl.category || '').toLowerCase();
    if (talentGroup === 'tech') {
      return cat.includes('software') || cat.includes('cyber') || cat.includes('ai');
    }
    if (talentGroup === 'design') {
      return cat.includes('design') || cat.includes('photo') || cat.includes('audio');
    }
    if (talentGroup === 'finance') {
      return cat.includes('accounting') || cat.includes('consulting') || cat.includes('legal');
    }
    return (
      cat.includes('marketing') ||
      cat.includes('virtual') ||
      cat.includes('sales') ||
      cat.includes('admin')
    );
  });

  const displayedTalent = (filteredTalent.length > 0 ? filteredTalent : featuredFreelancers).slice(
    0,
    4
  );

  const feeUsd = Number(((estimateBudget * commissionPercent) / 100).toFixed(2));
  const netPayoutUsd = Number((estimateBudget - feeUsd).toFixed(2));

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTarget, searchQuery);
  };

  return (
    <main className="bg-white dark:bg-[#0F1411] text-[#141715] dark:text-[#EDF2EE] transition-colors">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-[#101010] text-white border-b border-[#E2E6E3] dark:border-[#2A352E] min-h-[600px] lg:min-h-[670px] flex items-center">
        <div className="absolute inset-0">
          <ResilientImage
            src="/src/assets/images/hero_executive_duo_1794859968201.jpg"
            alt="Well-dressed Black African male and female executives collaborating at a modern office desk with laptops"
            fallbackLabel="Afro-lancers Executives"
            className="w-full h-full object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/62 to-black/88"
            aria-hidden="true"
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center flex flex-col items-center space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#4ADE80]">
              Afro-lancers.com · Africa’s Premier Freelancing Marketplace
            </p>
            <h1
              className="font-display font-extrabold tracking-tight text-white leading-[1.06] mx-auto"
              style={{
                fontSize: 'clamp(2.35rem, 4.2vw, 3.8rem)',
                textWrap: 'balance',
              }}
            >
              PREMIUM TALENT.
              <br />
              <span className="text-[#4ADE80]">THE WORLD OF OPPORTUNITIES.</span>
            </h1>
            <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl mx-auto">
              Discover vetted African freelancers across 24 specialized disciplines, collaborate with
              global organizations, and settle milestones securely via Paynow, Paystack,
              Flutterwave, or Stripe.
            </p>
          </div>

          {/* Search & Switcher */}
          <div className="w-full max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1 p-1 bg-black/55 backdrop-blur-xs rounded-lg border border-white/20">
              <button
                type="button"
                onClick={() => setSearchTarget('hire')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  searchTarget === 'hire'
                    ? 'bg-white text-[#101010]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Find Talent
              </button>
              <button
                type="button"
                onClick={() => setSearchTarget('find-work')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  searchTarget === 'find-work'
                    ? 'bg-white text-[#101010]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Find Jobs
              </button>
            </div>

            <form
              onSubmit={handleHeroSearch}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-white dark:bg-[#171D19] border border-white/25 dark:border-[#2A352E] rounded-xl shadow-2xl focus-within:border-[#008C45]"
            >
              <div className="flex items-center gap-2.5 flex-1 px-3 py-2">
                <Search className="w-4 h-4 text-[#141715]/55 dark:text-[#B4C0B8] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for skills, services or professionals..."
                  aria-label="Search for skills, services or professionals"
                  className="w-full text-sm text-[#141715] dark:text-[#EDF2EE] placeholder:text-[#141715]/50 dark:placeholder:text-[#B4C0B8]/70 focus:outline-none bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-[#101010] dark:bg-[#075B35] hover:bg-[#075B35] dark:hover:bg-[#008C45] text-white text-xs font-bold tracking-wide rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {searchTarget === 'hire' ? 'SEARCH TALENT' : 'SEARCH JOBS'}
              </button>
            </form>

            {/* Popular Searches */}
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-white/80">
              <span className="font-semibold text-white">Popular:</span>
              {POPULAR_SEARCHES.map((term, idx) => (
                <React.Fragment key={term}>
                  <button
                    type="button"
                    onClick={() => onSearch(searchTarget, term)}
                    className="hover:text-[#4ADE80] hover:underline transition-colors"
                  >
                    {term}
                  </button>
                  {idx < POPULAR_SEARCHES.length - 1 && (
                    <span aria-hidden="true" className="text-white/35">
                      ·
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('find-work')}
              className="px-7 py-3.5 bg-[#008C45] hover:bg-[#075B35] text-white text-sm font-bold tracking-wide rounded-lg transition-colors whitespace-nowrap shrink-0 text-center"
            >
              FIND FREELANCE WORK
            </button>
            <button
              type="button"
              onClick={() => onNavigate('hire')}
              className="px-7 py-3.5 bg-[#E52525] hover:bg-[#c81e1e] text-white text-sm font-bold tracking-wide rounded-lg transition-colors whitespace-nowrap shrink-0 text-center"
            >
              HIRE A FREELANCER
            </button>
          </div>

          <div className="space-y-1 pt-2 text-xs text-white/85">
            <p>Connecting Africa’s finest independent professionals with opportunities worldwide.</p>
            <p className="font-medium text-white/95">
              Paynow EcoCash · OneMoney · Paystack · Flutterwave · Stripe Escrow Protection
            </p>
          </div>
        </div>
      </section>

      {/* 2. TRUST AND LIVE STATISTICS STRIP */}
      <section className="bg-[#F4F6F4] dark:bg-[#121814] border-b border-[#E2E6E3] dark:border-[#2A352E] transition-colors">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#075B35] dark:text-[#34D399]">
              Live Marketplace Registry
            </h2>
            <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
              Real-time platform activity calculated directly from active marketplace records.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-5">
              <p className="font-mono-num text-3xl font-bold text-[#075B35] dark:text-[#34D399]">
                {stats.freelancersCount}
              </p>
              <p className="text-xs font-medium text-[#141715]/75 dark:text-[#B4C0B8] mt-1">
                Registered African Freelancers
              </p>
            </div>
            <div className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-5">
              <p className="font-mono-num text-3xl font-bold text-[#141715] dark:text-[#EDF2EE]">
                {stats.jobsPostedCount}
              </p>
              <p className="text-xs font-medium text-[#141715]/75 dark:text-[#B4C0B8] mt-1">
                Active Jobs Posted
              </p>
            </div>
            <div className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-5">
              <p className="font-mono-num text-3xl font-bold text-[#141715] dark:text-[#EDF2EE]">
                {stats.projectsCompletedCount}
              </p>
              <p className="text-xs font-medium text-[#141715]/75 dark:text-[#B4C0B8] mt-1">
                Completed Platform Projects
              </p>
            </div>
            <div className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-5">
              <p className="font-mono-num text-3xl font-bold text-[#075B35] dark:text-[#34D399]">
                {stats.countriesReachedCount}
              </p>
              <p className="text-xs font-medium text-[#141715]/75 dark:text-[#B4C0B8] mt-1">
                Countries Reached
              </p>
            </div>
          </div>

          {stats.monthlyGrowth && stats.monthlyGrowth.length > 0 && (
            <PlatformGrowthChart data={stats.monthlyGrowth} theme={theme} />
          )}
        </div>
      </section>

      {/* 3. SPECIALIZED FREELANCE CATEGORIES (INTERACTIVE EXPLORER) */}
      <section
        id="categories-section"
        className="py-16 border-b border-[#E2E6E3] dark:border-[#2A352E]"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#075B35] dark:text-[#34D399]">
                {categories.length} Specialized Disciplines
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141715] dark:text-[#EDF2EE] mt-1">
                Explore Freelance Categories
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#141715]/50 dark:text-[#B4C0B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  placeholder="Filter categories..."
                  aria-label="Filter freelance categories"
                  className="pl-8 pr-3 py-2 text-xs border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-[#F4F6F4]/60 dark:bg-[#171D19] text-[#141715] dark:text-[#EDF2EE] focus:outline-none focus:border-[#075B35] dark:focus:border-[#34D399]"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-sm font-semibold text-[#075B35] dark:text-[#34D399] hover:text-[#008C45] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {showAllCategories
                  ? 'Show Top 9 Disciplines'
                  : `View All ${categories.length} Categories`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleCategories.map((cat) => {
              const Icon = ICON_MAP[cat.iconKey] || Briefcase;
              return (
                <div
                  key={cat.id}
                  className="group p-6 bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl hover:border-[#075B35] dark:hover:border-[#34D399] transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#F4F6F4] dark:bg-[#1E2621] text-[#075B35] dark:text-[#34D399] flex items-center justify-center group-hover:bg-[#075B35] group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono-num text-[#141715]/65 dark:text-[#B4C0B8]">
                        {cat.freelancerCount > 0
                          ? `${cat.freelancerCount} specialist${cat.freelancerCount === 1 ? '' : 's'}`
                          : 'Open for talent'}
                      </span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[#141715] dark:text-[#EDF2EE] mt-4">
                      {cat.name}
                    </h3>
                    <p className="text-sm text-[#141715]/75 dark:text-[#B4C0B8] mt-1.5 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#F4F6F4] dark:border-[#2A352E] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onSearch('hire', '', cat.name)}
                      className="text-xs font-semibold text-[#075B35] dark:text-[#34D399] hover:underline inline-flex items-center gap-1"
                    >
                      Browse Talent <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSearch('find-work', '', cat.name)}
                      className="text-xs font-medium text-[#141715]/70 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white"
                    >
                      View Jobs
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. FEATURED AFRICAN FREELANCERS (WITH INTERACTIVE DISCIPLINE FILTER) */}
      <section className="py-16 bg-[#F4F6F4]/60 dark:bg-[#121814] border-b border-[#E2E6E3] dark:border-[#2A352E] transition-colors">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#075B35] dark:text-[#34D399]">
                Curated Talent Directory
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141715] dark:text-[#EDF2EE] mt-1">
                Featured African Freelancers
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {TALENT_GROUPS.map((grp) => (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setTalentGroup(grp.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    talentGroup === grp.id
                      ? 'bg-[#075B35] text-white border-[#075B35]'
                      : 'bg-white dark:bg-[#171D19] text-[#141715]/80 dark:text-[#EDF2EE]/80 border-[#E2E6E3] dark:border-[#2A352E] hover:border-[#075B35]'
                  }`}
                >
                  {grp.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onNavigate('hire')}
                className="ml-1 text-sm font-semibold text-[#075B35] dark:text-[#34D399] hover:text-[#008C45] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                Full Directory <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {displayedTalent.map((fl) => (
              <article
                key={fl.id}
                className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-5 flex flex-col justify-between hover:border-[#075B35] dark:hover:border-[#34D399] transition-colors"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <ResilientImage
                      src={fl.photoUrl}
                      alt={fl.fullName}
                      fallbackLabel={fl.fullName}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#E2E6E3] dark:border-[#2A352E]"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold text-[#141715] dark:text-[#EDF2EE] truncate">
                        {fl.fullName}
                      </h3>
                      <p className="text-xs font-medium text-[#075B35] dark:text-[#34D399] line-clamp-2 mt-0.5">
                        {fl.title}
                      </p>
                    </div>
                  </div>

                  {/* Unboxed Metadata */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {fl.country}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{fl.availability}</span>
                    {fl.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Showcase</span>
                      </>
                    )}
                  </div>

                  {/* Verified Rating & Rate */}
                  <div className="mt-3 pt-3 border-t border-[#F4F6F4] dark:border-[#2A352E] flex items-center justify-between text-xs">
                    <span className="font-mono-num font-bold text-sm text-[#141715] dark:text-[#EDF2EE]">
                      ${fl.hourlyRate}/hr
                    </span>
                    {fl.ratingAverage ? (
                      <span className="inline-flex items-center gap-1 font-mono-num text-[#141715] dark:text-[#EDF2EE]">
                        <Star className="w-3.5 h-3.5 fill-[#008C45] text-[#008C45] dark:fill-[#34D399] dark:text-[#34D399]" />
                        {fl.ratingAverage} ({fl.reviewCount})
                      </span>
                    ) : (
                      <span className="text-[#141715]/60 dark:text-[#B4C0B8]">New Profile</span>
                    )}
                  </div>

                  <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8] mt-1 font-mono-num">
                    {fl.completedProjectsCount || 0} completed projects
                  </p>

                  {/* Unboxed Skills Summary (Zero-Pill Rule) */}
                  <p className="mt-3 text-xs text-[#141715]/80 dark:text-[#EDF2EE]/85 leading-relaxed line-clamp-2">
                    {(fl.skills || []).slice(0, 3).join(' · ')}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#F4F6F4] dark:border-[#2A352E] grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectFreelancer(fl.id)}
                    className="py-2 px-2.5 text-xs font-semibold text-[#141715] dark:text-[#EDF2EE] border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621] transition-colors"
                  >
                    View Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectFreelancer(fl.id)}
                    className="py-2 px-2.5 text-xs font-semibold text-white bg-[#075B35] hover:bg-[#008C45] rounded-lg transition-colors"
                  >
                    Hire Talent
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4B. FREELANCER OF THE MONTH, TOP 10 & BUSINESS SPOTLIGHTS */}
      {highlights && (
        <TopTalentLeaderboard
          freelancerOfTheMonth={highlights.freelancerOfTheMonth}
          top10={highlights.top10Freelancers}
          ads={highlights.ads}
          onSelectFreelancer={onSelectFreelancer}
        />
      )}

      {/* 4C. AFRICAN & GLOBAL TALENT CORRIDOR MAP */}
      {highlights && highlights.mapHubs.length > 0 && (
        <TalentMapSection
          hubs={highlights.mapHubs}
          onExploreCountry={(targetMode, countryName) =>
            onSearch(targetMode, '', '', countryName)
          }
        />
      )}

      {/* 5. PAN-AFRICAN PAYMENT GATEWAYS & INTERACTIVE ESCROW ESTIMATOR */}
      <section
        id="payments-section"
        className="py-16 border-b border-[#E2E6E3] dark:border-[#2A352E] bg-white dark:bg-[#0F1411]"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Payment Gateways Showcase */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-[#075B35] dark:text-[#34D399]">
                  Pan-African &amp; Global Settlement Rails
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141715] dark:text-[#EDF2EE] mt-1">
                  Integrated Escrow &amp; Payment Gateways
                </h2>
                <p className="text-sm text-[#141715]/75 dark:text-[#B4C0B8] mt-2 leading-relaxed max-w-2xl">
                  Fund project milestones in minutes and release payouts with confidence. Supports
                  Paynow Zimbabwe (EcoCash, OneMoney, InnBucks, Visa/Mastercard), Paystack,
                  Flutterwave, and global Stripe cards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(gateways.length > 0
                  ? gateways
                  : [
                      {
                        id: 'paynow',
                        name: 'Paynow',
                        region: 'Zimbabwe & Southern Africa',
                        description:
                          'Instant EcoCash, OneMoney, InnBucks, Zimswitch, and Visa/Mastercard.',
                        methods: ['EcoCash', 'OneMoney', 'InnBucks', 'Cards'],
                        currencies: ['USD', 'ZiG'],
                        configured: false,
                        recommendedFor: 'Zimbabwe & SADC',
                      },
                      {
                        id: 'paystack',
                        name: 'Paystack',
                        region: 'West & East Africa',
                        description:
                          'Cards, EFT, bank transfers, and mobile wallets across Nigeria, Ghana, Kenya & SA.',
                        methods: ['Card', 'Bank Transfer', 'Mobile Money'],
                        currencies: ['USD', 'NGN', 'GHS', 'KES', 'ZAR'],
                        configured: false,
                        recommendedFor: 'Pan-African payouts',
                      },
                      {
                        id: 'flutterwave',
                        name: 'Flutterwave',
                        region: '30+ African Countries',
                        description:
                          'Cross-border mobile wallets including M-Pesa, MTN MoMo, Airtel Money & cards.',
                        methods: ['M-Pesa', 'MTN MoMo', 'Visa / Mastercard'],
                        currencies: ['USD', 'KES', 'NGN', 'UGX', 'ZAR'],
                        configured: false,
                        recommendedFor: 'Mobile money coverage',
                      },
                      {
                        id: 'stripe',
                        name: 'Stripe',
                        region: 'Global International Clients',
                        description:
                          'International corporate Visa, Mastercard, Amex, and global enterprise cards.',
                        methods: ['International Card', 'Apple Pay'],
                        currencies: ['USD', 'EUR', 'GBP'],
                        configured: false,
                        recommendedFor: 'Global clients',
                      },
                    ]
                ).map((gw) => {
                  const active = selectedGatewayPreview === gw.id;
                  return (
                    <button
                      key={gw.id}
                      type="button"
                      onClick={() => setSelectedGatewayPreview(gw.id)}
                      className={`p-5 rounded-xl border text-left transition-colors ${
                        active
                          ? 'border-[#075B35] dark:border-[#34D399] bg-[#F4F6F4]/70 dark:bg-[#171D19]'
                          : 'border-[#E2E6E3] dark:border-[#2A352E] bg-white dark:bg-[#171D19]/70 hover:border-[#075B35]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {gw.id === 'paynow' ? (
                            <Smartphone className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
                          )}
                          <span className="font-display text-base font-bold">{gw.name}</span>
                        </div>
                        <span className="text-[11px] font-mono-num text-[#075B35] dark:text-[#34D399] font-semibold">
                          {gw.currencies.join(' · ')}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#141715]/70 dark:text-[#B4C0B8] mt-1">
                        {gw.region}
                      </p>
                      <p className="text-xs text-[#141715]/80 dark:text-[#B4C0B8] mt-2 leading-relaxed">
                        {gw.description}
                      </p>
                      <p className="text-[11px] font-medium text-[#075B35] dark:text-[#34D399] mt-3">
                        {gw.methods.join(' · ')}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Interactive Escrow & Payout Estimator */}
            <div className="lg:col-span-5 bg-[#101010] dark:bg-[#171D19] text-white border border-[#2A352E] rounded-2xl p-7 space-y-5">
              <div className="pb-4 border-b border-white/15">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4ADE80]">
                  Transparent Economics
                </p>
                <h3 className="font-display text-xl font-bold mt-1">
                  Interactive Project Escrow Estimator
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="escrow-budget-range" className="text-white/80 font-medium">
                    Contract Budget (USD)
                  </label>
                  <span className="font-mono-num text-xl font-extrabold text-[#4ADE80]">
                    ${estimateBudget.toLocaleString()}
                  </span>
                </div>
                <input
                  id="escrow-budget-range"
                  type="range"
                  min={250}
                  max={25000}
                  step={250}
                  value={estimateBudget}
                  onChange={(e) => setEstimateBudget(Number(e.target.value))}
                  className="w-full accent-[#008C45] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono-num text-white/55">
                  <span>$250</span>
                  <span>$12,500</span>
                  <span>$25,000</span>
                </div>
              </div>

              <div className="divide-y divide-white/10 border-t border-b border-white/15 text-sm">
                <div className="py-3 flex items-center justify-between">
                  <span className="text-white/75">Client Escrow Deposit</span>
                  <span className="font-mono-num font-bold">${estimateBudget.toLocaleString()}</span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-white/75">
                    Platform Governance ({commissionPercent}%)
                  </span>
                  <span className="font-mono-num text-white/90">-${feeUsd.toLocaleString()}</span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-[#4ADE80]">Freelancer Net Release</span>
                  <span className="font-mono-num text-lg font-extrabold text-[#4ADE80]">
                    ${netPayoutUsd.toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">
                Selected settlement rail preview:{' '}
                <strong className="uppercase text-white">{selectedGatewayPreview}</strong>. Funds
                remain locked until project milestones are approved by the hiring client.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={onOpenPostJob}
                  className="py-3 px-4 bg-[#E52525] hover:bg-[#c81e1e] text-white text-xs font-bold rounded-lg transition-colors text-center"
                >
                  Post Funded Project
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register', 'freelancer')}
                  className="py-3 px-4 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-bold rounded-lg transition-colors text-center"
                >
                  Start Earning Globally
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FEATURED JOBS */}
      <section className="py-16 bg-[#F4F6F4]/60 dark:bg-[#121814] border-b border-[#E2E6E3] dark:border-[#2A352E] transition-colors">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#075B35] dark:text-[#34D399]">
                Active Project Briefs
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141715] dark:text-[#EDF2EE] mt-1">
                Featured Open Projects
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('find-work')}
              className="px-5 py-2.5 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-bold tracking-wide rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              BROWSE ALL JOBS
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {featuredJobs.slice(0, 4).map((job) => {
              const saved = savedJobIds.includes(job.id);
              return (
                <article
                  key={job.id}
                  className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-6 hover:border-[#075B35] dark:hover:border-[#34D399] transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8]">
                          {job.companyName} · {job.category}
                        </p>
                        <h3 className="font-display text-lg font-bold text-[#141715] dark:text-[#EDF2EE] mt-1">
                          {job.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleSaveJob(job.id)}
                        aria-label={saved ? 'Remove saved job' : 'Save job'}
                        className={`w-9 h-9 inline-flex items-center justify-center rounded-lg border transition-colors shrink-0 ${
                          saved
                            ? 'border-[#075B35] dark:border-[#34D399] bg-[#075B35]/10 text-[#075B35] dark:text-[#34D399]'
                            : 'border-[#E2E6E3] dark:border-[#2A352E] text-[#141715]/60 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white'
                        }`}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm text-[#141715]/80 dark:text-[#B4C0B8] mt-3 leading-relaxed line-clamp-2">
                      {job.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#141715]/75 dark:text-[#B4C0B8]">
                      <span className="font-mono-num font-bold text-[#075B35] dark:text-[#34D399]">
                        ${job.budgetMin.toLocaleString()}–${job.budgetMax.toLocaleString()}
                        {job.budgetType === 'hourly' ? '/hr' : ' fixed'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{job.experienceLevel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{job.jobType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{job.location}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">Deadline {job.deadline}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#F4F6F4] dark:border-[#2A352E] flex items-center justify-between gap-3">
                    <span className="text-xs text-[#141715]/65 dark:text-[#B4C0B8] font-mono-num">
                      {job.applicationCount || 0} proposals submitted
                    </span>
                    <button
                      type="button"
                      onClick={() => onApplyJob(job)}
                      className="px-4 py-2 bg-[#101010] dark:bg-[#075B35] hover:bg-[#075B35] dark:hover:bg-[#008C45] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Apply Now
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. INTERACTIVE HOW AFRO-LANCERS WORKS */}
      <section
        id="how-it-works-section"
        className="py-16 border-b border-[#E2E6E3] dark:border-[#2A352E]"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#075B35] dark:text-[#34D399]">
                Structured Marketplace Workflows
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141715] dark:text-[#EDF2EE] mt-1">
                How Afro-lancers.com Works
              </h2>
            </div>

            <div className="inline-flex p-1 bg-[#F4F6F4] dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg self-start">
              <button
                type="button"
                onClick={() => setWorkflowRole('freelancer')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                  workflowRole === 'freelancer'
                    ? 'bg-[#075B35] text-white'
                    : 'text-[#141715]/75 dark:text-[#B4C0B8]'
                }`}
              >
                For Freelancers
              </button>
              <button
                type="button"
                onClick={() => setWorkflowRole('client')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                  workflowRole === 'client'
                    ? 'bg-[#E52525] text-white'
                    : 'text-[#141715]/75 dark:text-[#B4C0B8]'
                }`}
              >
                For Clients
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 bg-[#F4F6F4]/70 dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-[#141715] dark:text-[#EDF2EE] pb-4 mb-6 border-b border-[#E2E6E3] dark:border-[#2A352E]">
                  {workflowRole === 'freelancer'
                    ? 'From Profile Registration to Protected Payouts'
                    : 'From Project Brief to Milestone Completion'}
                </h3>
                <ol className="space-y-5">
                  {(workflowRole === 'freelancer'
                    ? [
                        {
                          n: '01.',
                          t: 'Create Your Account',
                          d: 'Register with Email, Google, or Facebook and enable tailored Project Alerts for your specialty.',
                        },
                        {
                          n: '02.',
                          t: 'Publish Your Portfolio & Rates',
                          d: 'Showcase delivered case studies, hourly or fixed pricing, and availability status.',
                        },
                        {
                          n: '03.',
                          t: 'Submit Proposals & Accept Invites',
                          d: 'Receive real-time alerts when matching client briefs go live and apply directly.',
                        },
                        {
                          n: '04.',
                          t: 'Deliver Work & Settle Securely',
                          d: 'Work under client-funded Escrow contracts and receive payouts via Paynow, Paystack, or Flutterwave.',
                        },
                      ]
                    : [
                        {
                          n: '01.',
                          t: 'Open a Client Account',
                          d: 'Set up your company hiring profile in minutes via Email, Google, or Facebook.',
                        },
                        {
                          n: '02.',
                          t: 'Publish Your Project Brief',
                          d: 'Specify deliverables, budget range, and deadlines — matching freelancers are notified automatically.',
                        },
                        {
                          n: '03.',
                          t: 'Shortlist & Fund Escrow',
                          d: 'Compare proposals, message finalists, and lock project escrow via Paynow, Paystack, Flutterwave, or Stripe.',
                        },
                        {
                          n: '04.',
                          t: 'Approve & Leave Verified Reviews',
                          d: 'Release escrow payout upon completion and publish a verified rating to the talent directory.',
                        },
                      ]
                  ).map((step) => (
                    <li key={step.n} className="flex items-start gap-4">
                      <span
                        className={`font-mono-num text-sm font-bold pt-0.5 ${
                          workflowRole === 'freelancer'
                            ? 'text-[#075B35] dark:text-[#34D399]'
                            : 'text-[#E52525]'
                        }`}
                      >
                        {step.n}
                      </span>
                      <div>
                        <h4 className="font-display text-sm font-bold text-[#141715] dark:text-[#EDF2EE]">
                          {step.t}
                        </h4>
                        <p className="text-sm text-[#141715]/75 dark:text-[#B4C0B8] mt-0.5 leading-relaxed">
                          {step.d}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-8 pt-5 border-t border-[#E2E6E3] dark:border-[#2A352E] flex items-center justify-between gap-4">
                <span className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                  Ready to start?
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register', workflowRole)}
                  className={`px-5 py-2.5 text-white text-xs font-bold rounded-lg transition-colors ${
                    workflowRole === 'freelancer'
                      ? 'bg-[#075B35] hover:bg-[#008C45]'
                      : 'bg-[#E52525] hover:bg-[#c81e1e]'
                  }`}
                >
                  {workflowRole === 'freelancer'
                    ? 'Create Freelancer Account'
                    : 'Create Client Account'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-[#E2E6E3] dark:border-[#2A352E] min-h-[340px]">
              <ResilientImage
                src={
                  workflowRole === 'freelancer'
                    ? '/src/assets/images/promo_freelancer_studio_1794858346085.jpg'
                    : '/src/assets/images/promo_client_team_1794858344137.jpg'
                }
                alt={
                  workflowRole === 'freelancer'
                    ? 'African independent specialist working in modern creative studio'
                    : 'Executive leadership team reviewing freelance deliverables in boardroom'
                }
                fallbackLabel="Afro-lancers Workflow"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 8. CLIENT & FREELANCER PROMOTIONAL BANNERS */}
      <section className="py-16 bg-[#F4F6F4]/60 dark:bg-[#121814] border-b border-[#E2E6E3] dark:border-[#2A352E] transition-colors">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch rounded-2xl overflow-hidden border border-[#E2E6E3] dark:border-[#2A352E] bg-[#101010] text-white">
            <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center space-y-5">
              <p className="text-xs font-semibold tracking-wider uppercase text-[#4ADE80]">
                For Employers &amp; Organizations
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight">
                BUILD YOUR BUSINESS WITH AFRICAN TALENT.
              </h2>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-md">
                Hire across software engineering, finance, design, legal advisory, and operations
                with escrow-protected milestones.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenPostJob}
                  className="px-6 py-3 bg-[#E52525] hover:bg-[#c81e1e] text-white text-xs font-bold tracking-wide rounded-lg transition-colors"
                >
                  POST A JOB
                </button>
              </div>
            </div>
            <div className="lg:col-span-6 min-h-[260px]">
              <ResilientImage
                src="/src/assets/images/promo_client_team_1794858344137.jpg"
                alt="Executive business team collaborating in modern boardroom"
                fallbackLabel="Client Team"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch rounded-2xl overflow-hidden border border-[#E2E6E3] dark:border-[#2A352E] bg-[#075B35] text-white">
            <div className="lg:col-span-6 min-h-[260px] order-2 lg:order-1">
              <ResilientImage
                src="/src/assets/images/promo_freelancer_studio_1794858346085.jpg"
                alt="African female creative technologist smiling at laptop in bright studio"
                fallbackLabel="Freelancer Studio"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>
            <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center space-y-5 order-1 lg:order-2">
              <p className="text-xs font-semibold tracking-wider uppercase text-white/85">
                For Independent Professionals
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight">
                YOUR TALENT DESERVES A GLOBAL STAGE.
              </h2>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-md">
                Showcase your credentials, activate automated job alerts, and collect local or
                international payouts smoothly.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('register', 'freelancer')}
                  className="px-6 py-3 bg-white hover:bg-[#F4F6F4] text-[#075B35] text-xs font-bold tracking-wide rounded-lg transition-colors"
                >
                  JOIN AFRO-LANCERS
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. TESTIMONIALS */}
      <section
        id="testimonials-section"
        className="py-16 border-b border-[#E2E6E3] dark:border-[#2A352E]"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#075B35] dark:text-[#34D399]">
                Demonstration Showcase Stories
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141715] dark:text-[#EDF2EE] mt-1">
                Client &amp; Freelancer Perspectives
              </h2>
            </div>
            <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] max-w-sm leading-relaxed">
              Entries below are clearly marked demonstration content illustrating platform workflows
              until live client feedback accumulates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <blockquote
                key={t.id}
                className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#141715]/65 dark:text-[#B4C0B8] mb-3">
                    <span>
                      {t.perspective} · {t.country}
                    </span>
                    {t.verifiedRating ? (
                      <span className="font-mono-num font-semibold text-[#075B35] dark:text-[#34D399]">
                        {t.verifiedRating.toFixed(1)} / 5.0
                      </span>
                    ) : (
                      <span>Demo Content</span>
                    )}
                  </div>
                  <p className="text-sm text-[#141715]/90 dark:text-[#EDF2EE]/90 leading-relaxed">
                    “{t.quote}”
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F4F6F4] dark:border-[#2A352E] flex items-center gap-3">
                  <ResilientImage
                    src={t.photoUrl}
                    alt={t.name}
                    fallbackLabel={t.name}
                    className="w-11 h-11 rounded-lg object-cover border border-[#E2E6E3] dark:border-[#2A352E] shrink-0"
                  />
                  <div>
                    <p className="font-display text-sm font-bold text-[#141715] dark:text-[#EDF2EE]">
                      {t.name}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                      {t.role} · {t.companyOrSpecialty}
                    </p>
                  </div>
                </div>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* 10. TRUST, SAFETY AND SECURITY */}
      <section className="py-16 bg-[#F4F6F4]/60 dark:bg-[#121814] transition-colors">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold tracking-wider uppercase text-[#075B35] dark:text-[#34D399]">
              Platform Governance
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#141715] dark:text-[#EDF2EE] mt-1">
              Trust, Safety &amp; Payment Security
            </h2>
            <p className="text-sm text-[#141715]/75 dark:text-[#B4C0B8] mt-2 leading-relaxed">
              Afro-lancers.com enforces role-isolated account governance, server-signed gateway
              settlements, and milestone escrow controls across all 24 professional categories.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Lock,
                title: 'Milestone Escrow Protection',
                desc: 'Clients fund engagements upfront via Paynow, Paystack, Flutterwave, or Stripe, releasing payouts only once deliverables are approved.',
              },
              {
                icon: ShieldCheck,
                title: 'Profile & Account Governance',
                desc: 'Role-isolated freelancer, client, and administrator accounts with scrypt-hashed credentials and Google/Facebook OAuth.',
              },
              {
                icon: MessageSquare,
                title: 'Direct Platform Messaging',
                desc: 'Structured client-to-freelancer communication threads linked directly to active job briefs and proposals.',
              },
              {
                icon: FileText,
                title: 'Transparent Job Briefs',
                desc: 'Every listing declares clear scope, experience tier, budget range, work arrangement, and application deadline.',
              },
              {
                icon: CheckCircle2,
                title: 'Verified Post-Project Reviews',
                desc: 'Ratings are computed strictly from recorded project reviews submitted by hiring clients.',
              },
              {
                icon: Briefcase,
                title: 'Dispute & Moderation Reporting',
                desc: 'Users can flag misleading accounts or job listings for immediate review inside the Administrator Console.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-6 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl bg-white dark:bg-[#171D19]"
                >
                  <Icon className="w-5 h-5 text-[#075B35] dark:text-[#34D399]" />
                  <h3 className="font-display text-base font-bold text-[#141715] dark:text-[#EDF2EE] mt-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#141715]/75 dark:text-[#B4C0B8] mt-1.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
};
