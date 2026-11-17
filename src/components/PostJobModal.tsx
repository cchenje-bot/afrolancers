import React, { useState } from 'react';
import { Briefcase, X } from 'lucide-react';
import { api } from '../lib/api';
import { CATEGORY_NAMES, COUNTRIES, EXPERIENCE_LEVELS, JOB_TYPES } from '../lib/constants';
import type { JobListing } from '../types';

interface PostJobModalProps {
  onClose: () => void;
  onSuccess: (job: JobListing, alertsDispatched?: number) => void;
  onPublishFeatured?: (job: JobListing, priceUsd: number) => void;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({
  onClose,
  onSuccess,
  onPublishFeatured,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [description, setDescription] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly'>('fixed');
  const [budgetMin, setBudgetMin] = useState('1500');
  const [budgetMax, setBudgetMax] = useState('3000');
  const [experienceLevel, setExperienceLevel] = useState('Senior');
  const [jobType, setJobType] = useState('Remote');
  const [remoteStatus, setRemoteStatus] = useState<'Remote' | 'Hybrid' | 'On-site'>('Remote');
  const [country, setCountry] = useState('Kenya');
  const [location, setLocation] = useState('Remote');
  const [skillsRequired, setSkillsRequired] = useState('');
  const [deadline, setDeadline] = useState('2026-12-30');
  const [listingTier, setListingTier] = useState<'basic' | 'featured'>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.postJob({
        title,
        category,
        description,
        budgetType,
        budgetMin: Number(budgetMin),
        budgetMax: Number(budgetMax),
        experienceLevel,
        jobType,
        remoteStatus,
        country,
        location,
        skillsRequired,
        deadline,
      });
      if (listingTier === 'featured' && onPublishFeatured) {
        onPublishFeatured(res.job, 29);
      } else {
        onSuccess(res.job, res.alertsDispatched);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post job.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2 text-sm border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-white dark:bg-[#1E2621] text-[#141715] dark:text-[#EDF2EE] placeholder:text-[#141715]/45 dark:placeholder:text-[#B4C0B8]/60 focus:outline-none focus:border-[#075B35] dark:focus:border-[#34D399]';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#171D19] text-[#141715] dark:text-[#EDF2EE] w-full max-w-2xl rounded-2xl border border-[#E2E6E3] dark:border-[#2A352E] shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-4 bg-[#101010] text-white flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Post a New Job Brief</h2>
            <p className="text-xs text-white/75">
              Publish transparent requirements — matching freelancers receive instant Project Alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close post job modal"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-[#E52525]/10 border border-[#E52525]/35 text-xs text-[#B91C1C] dark:text-[#FCA5A5]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">Job Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Cloud Infrastructure Engineer"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CATEGORY_NAMES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Job Type *</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className={inputClass}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Pricing</label>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as 'fixed' | 'hourly')}
                className={inputClass}
              >
                <option value="fixed">Fixed Price (USD)</option>
                <option value="hourly">Hourly Rate (USD/hr)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Min Budget *</label>
              <input
                type="number"
                required
                min={10}
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className={`${inputClass} font-mono-num`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Max Budget *</label>
              <input
                type="number"
                required
                min={10}
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className={`${inputClass} font-mono-num`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Experience</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className={inputClass}
              >
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Work Arrangement</label>
              <select
                value={remoteStatus}
                onChange={(e) => setRemoteStatus(e.target.value as 'Remote' | 'Hybrid' | 'On-site')}
                className={inputClass}
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Required Skills (comma-separated)
              </label>
              <input
                type="text"
                value={skillsRequired}
                onChange={(e) => setSkillsRequired(e.target.value)}
                placeholder="React, Financial Modeling, Copywriting"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Application Deadline *</label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={`${inputClass} font-mono-num`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Location Label</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Nairobi / Remote"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Project Description & Deliverables *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe scope, deliverables, communication cadence, and evaluation criteria..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Listing Visibility Tier</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setListingTier('basic')}
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  listingTier === 'basic'
                    ? 'border-[#075B35] dark:border-[#34D399] bg-[#075B35]/[0.05] dark:bg-[#34D399]/[0.08]'
                    : 'border-[#E2E6E3] dark:border-[#2A352E]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Standard Brief</span>
                  <span className="font-mono-num text-[#075B35] dark:text-[#34D399]">Free ($0)</span>
                </div>
                <p className="text-[11px] text-[#141715]/70 dark:text-[#B4C0B8] mt-1">
                  Published to directory with instant Project Alerts to matching freelancers.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setListingTier('featured')}
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  listingTier === 'featured'
                    ? 'border-[#E52525] bg-[#E52525]/[0.05]'
                    : 'border-[#E2E6E3] dark:border-[#2A352E]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Featured Job Boost</span>
                  <span className="font-mono-num text-[#E52525]">$29</span>
                </div>
                <p className="text-[11px] text-[#141715]/70 dark:text-[#B4C0B8] mt-1">
                  Pinned to top search results with Featured badge via Paynow / Card checkout.
                </p>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#E52525] hover:bg-[#c81e1e] text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Briefcase className="w-4 h-4" />
              {loading
                ? 'Publishing...'
                : listingTier === 'featured'
                  ? 'Publish & Boost Featured ($29)'
                  : 'Publish Job Brief'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
