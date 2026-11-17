import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { api } from '../lib/api';
import type { JobListing } from '../types';

interface ProposalModalProps {
  job: JobListing;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({ job, onClose, onSuccess }) => {
  const [proposedRate, setProposedRate] = useState(String(job.budgetMin));
  const [timeline, setTimeline] = useState('4 weeks');
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.submitProposal({
        jobId: job.id,
        proposedRate: Number(proposedRate),
        timeline,
        coverLetter,
      });
      onSuccess(`Proposal submitted for "${job.title}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit proposal.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2 text-sm border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-white dark:bg-[#1E2621] text-[#141715] dark:text-[#EDF2EE] placeholder:text-[#141715]/45 dark:placeholder:text-[#B4C0B8]/60 focus:outline-none focus:border-[#075B35] dark:focus:border-[#34D399]';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#171D19] text-[#141715] dark:text-[#EDF2EE] w-full max-w-lg rounded-2xl border border-[#E2E6E3] dark:border-[#2A352E] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#101010] text-white flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Submit Proposal</h2>
            <p className="text-xs text-white/75 truncate max-w-sm">{job.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close proposal modal"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[#E52525]/10 border border-[#E52525]/35 text-xs text-[#B91C1C] dark:text-[#FCA5A5]">
              {error}
            </div>
          )}

          <div className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] pb-3 border-b border-[#E2E6E3] dark:border-[#2A352E]">
            {job.companyName} · {job.category} · Budget{' '}
            <span className="font-mono-num font-semibold text-[#141715] dark:text-[#EDF2EE]">
              ${job.budgetMin}–${job.budgetMax}
              {job.budgetType === 'hourly' ? '/hr' : ' fixed'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Your Proposed Rate (USD) *
              </label>
              <input
                type="number"
                required
                min={5}
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
                className={`${inputClass} font-mono-num`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Estimated Timeline *</label>
              <input
                type="text"
                required
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="e.g. 3 weeks"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Cover Letter & Relevant Experience *
            </label>
            <textarea
              required
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Explain your approach, deliverables, and comparable past work..."
              className={inputClass}
            />
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
              className="px-5 py-2 bg-[#008C45] hover:bg-[#075B35] text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
