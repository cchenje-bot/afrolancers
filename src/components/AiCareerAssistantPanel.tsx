import React, { useState } from 'react';
import {
  Briefcase,
  Calculator,
  Check,
  Copy,
  FileText,
  MessageSquare,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import type { AiCareerMode, JobListing, PublicUser } from '../types';

interface AiCareerAssistantPanelProps {
  user: PublicUser;
  availableJobs: JobListing[];
  onNotify: (msg: string) => void;
}

const MODE_OPTIONS: Array<{
  id: AiCareerMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'cv',
    label: 'CV & Executive Resume',
    desc: 'Generate an international-standard CV from your profile & portfolio.',
    icon: FileText,
  },
  {
    id: 'profile_review',
    label: 'Profile Optimization',
    desc: 'Audit your bio, headline, and skills to raise client conversion.',
    icon: UserCheck,
  },
  {
    id: 'proposal',
    label: 'Proposal Writer',
    desc: 'Draft a tailored, persuasive proposal for any open job brief.',
    icon: Briefcase,
  },
  {
    id: 'pricing',
    label: 'Project Pricing Advisor',
    desc: 'Calculate fixed, hourly, and milestone pricing after the 5% fee.',
    icon: Calculator,
  },
  {
    id: 'interview_prep',
    label: 'Interview Preparation',
    desc: 'Practice likely client questions with structured answer frameworks.',
    icon: MessageSquare,
  },
];

export const AiCareerAssistantPanel: React.FC<AiCareerAssistantPanelProps> = ({
  user,
  availableJobs,
  onNotify,
}) => {
  const [mode, setMode] = useState<AiCareerMode>('proposal');
  const [selectedJobId, setSelectedJobId] = useState<string>(availableJobs[0]?.id || '');
  const [targetRole, setTargetRole] = useState<string>(user.title || user.category || '');
  const [projectScope, setProjectScope] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.runAiCareerAssistant({
        mode,
        jobId: selectedJobId || undefined,
        targetRole,
        projectScope,
        notes,
      });
      setResult(res.content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate guidance.';
      setError(msg);
      onNotify(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify('Copy to clipboard unavailable.');
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-white dark:bg-[#1E2621] text-[#141715] dark:text-[#EDF2EE] placeholder:text-[#141715]/45 dark:placeholder:text-[#B4C0B8]/60 focus:outline-none focus:border-[#075B35] dark:focus:border-[#34D399]';

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl p-6 space-y-5">
        <div className="pb-4 border-b border-[#E2E6E3] dark:border-[#2A352E]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#075B35] dark:text-[#34D399] inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            AI Career Strategist
          </p>
          <h2 className="font-display text-lg font-bold mt-1">
            CV Builder, Proposals, Pricing &amp; Interview Coach
          </h2>
          <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-1">
            Tailors output directly from your verified Afro-lancers.com skills, portfolio items,
            rate, and selected job briefs.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  active
                    ? 'border-[#075B35] dark:border-[#34D399] bg-[#075B35]/[0.06] dark:bg-[#34D399]/[0.08]'
                    : 'border-[#E2E6E3] dark:border-[#2A352E] hover:border-[#075B35]/50'
                }`}
              >
                <Icon className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
                <p className="font-display text-xs font-bold mt-2">{opt.label}</p>
                <p className="text-[11px] text-[#141715]/65 dark:text-[#B4C0B8] mt-0.5 leading-snug">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Target Role / Specialty</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior React Fintech Architect"
                className={inputClass}
              />
            </div>

            {availableJobs.length > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Reference Job Brief (Optional)
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">No specific job selected</option>
                  {availableJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.companyName})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {(mode === 'pricing' || mode === 'proposal' || mode === 'interview_prep') && (
            <div>
              <label className="block text-xs font-semibold mb-1">
                Project Scope, Deliverables, or Timeline Context
              </label>
              <textarea
                rows={2}
                value={projectScope}
                onChange={(e) => setProjectScope(e.target.value)}
                placeholder="Describe expected deliverables, number of weeks, or client constraints..."
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">
              Additional Instructions (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Emphasize cross-border fintech compliance or French fluency"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#075B35] hover:bg-[#008C45] text-white text-xs font-bold rounded-lg inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            {loading
              ? 'Generating with AI Strategist...'
              : `Generate ${MODE_OPTIONS.find((m) => m.id === mode)?.label}`}
          </button>
        </form>

        {error && (
          <div className="p-3.5 rounded-lg bg-[#E52525]/10 border border-[#E52525]/35 text-xs text-[#E52525]">
            {error}
          </div>
        )}

        {result && (
          <div className="p-5 rounded-xl bg-[#F4F6F4] dark:bg-[#1E2621] border border-[#E2E6E3] dark:border-[#2A352E] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E6E3] dark:border-[#2A352E] pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#075B35] dark:text-[#34D399]">
                AI Career Output
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1 text-xs font-semibold border border-[#E2E6E3] dark:border-[#2A352E] bg-white dark:bg-[#171D19] rounded-lg inline-flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#008C45]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>
            <div className="text-sm text-[#141715]/90 dark:text-[#EDF2EE]/90 whitespace-pre-wrap leading-relaxed">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
