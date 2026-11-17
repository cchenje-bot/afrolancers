import React, { useEffect, useState } from 'react';
import {
  Award,
  BadgeCheck,
  Bookmark,
  CalendarClock,
  Clock,
  Crown,
  Flame,
  Flag,
  Globe2,
  GraduationCap,
  MapPin,
  MessageSquare,
  Send,
  Star,
  Video,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import type { JobListing, PublicUser, ReviewItem } from '../types';
import { ResilientImage } from './ResilientImage';

interface FreelancerProfileModalProps {
  freelancerId: string;
  currentUser: PublicUser | null;
  clientJobs: JobListing[];
  isShortlisted: boolean;
  onClose: () => void;
  onToggleShortlist: (freelancerId: string) => void;
  onRequireAuth: (role: 'client' | 'freelancer') => void;
  onNotify: (msg: string) => void;
}

export const FreelancerProfileModal: React.FC<FreelancerProfileModalProps> = ({
  freelancerId,
  currentUser,
  clientJobs,
  isShortlisted,
  onClose,
  onToggleShortlist,
  onRequireAuth,
  onNotify,
}) => {
  const [freelancer, setFreelancer] = useState<PublicUser | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(clientJobs[0]?.id || '');
  const [inviteMsg, setInviteMsg] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [directMessage, setDirectMessage] = useState('');
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState('2026-11-22T10:00');
  const [interviewDuration, setInterviewDuration] = useState('30');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Misleading profile information');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getFreelancerById(freelancerId)
      .then((res) => {
        if (!active) return;
        setFreelancer(res.freelancer);
        setReviews(res.reviews);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [freelancerId]);

  useEffect(() => {
    if (clientJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(clientJobs[0].id);
    }
  }, [clientJobs, selectedJobId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth('client');
      return;
    }
    if (!selectedJobId) {
      onNotify('Please post an open job in your Client Dashboard before sending an invitation.');
      return;
    }
    try {
      await api.inviteFreelancer({
        freelancerId,
        jobId: selectedJobId,
        message: inviteMsg,
      });
      setInviteOpen(false);
      setInviteMsg('');
      onNotify(`Invitation sent to ${freelancer?.fullName}.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to send invitation.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth('client');
      return;
    }
    try {
      await api.sendMessage({
        recipientId: freelancerId,
        body: directMessage,
      });
      setMessageOpen(false);
      setDirectMessage('');
      onNotify(`Message sent to ${freelancer?.fullName}.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to send message.');
    }
  };

  const handleBookInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth('client');
      return;
    }
    try {
      await api.bookInterview({
        freelancerId,
        jobId: selectedJobId || undefined,
        scheduledAt: new Date(interviewDate).toISOString(),
        durationMinutes: Number(interviewDuration) || 30,
        meetingNotes: interviewNotes.trim() || 'Technical & cultural discovery interview',
      });
      setInterviewOpen(false);
      setInterviewNotes('');
      onNotify(`Interview request scheduled with ${freelancer?.fullName}.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to book interview.');
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth('client');
      return;
    }
    try {
      await api.submitReport({
        targetType: 'user',
        targetId: freelancerId,
        targetLabel: freelancer?.fullName || freelancerId,
        reason: reportReason,
        details: 'Submitted from freelancer profile modal.',
      });
      setReportOpen(false);
      onNotify('Report submitted to Afro-lancers.com moderation team.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to submit report.');
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] text-[#141715] dark:text-[#EDF2EE] rounded-lg focus:outline-none focus:border-[#075B35] dark:focus:border-[#34D399]';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#171D19] text-[#141715] dark:text-[#EDF2EE] w-full max-w-3xl rounded-2xl border border-[#E2E6E3] dark:border-[#2A352E] shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-[#E2E6E3] dark:border-[#2A352E] flex items-center justify-between">
          <span className="font-display text-sm font-bold">Freelancer Credentials &amp; Portfolio</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !freelancer ? (
          <div className="p-10 text-center text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
            Loading professional profile...
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
            {/* Profile Top Header */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <ResilientImage
                src={freelancer.photoUrl}
                alt={freelancer.fullName}
                fallbackLabel={freelancer.fullName}
                className="w-24 h-24 rounded-xl object-cover shrink-0 border border-[#E2E6E3] dark:border-[#2A352E]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#141715]/65 dark:text-[#B4C0B8] mb-1">
                  <span>{freelancer.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{freelancer.availability}</span>
                  {typeof freelancer.profileCompletionScore === 'number' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num text-[#075B35] dark:text-[#34D399] font-semibold">
                        {freelancer.profileCompletionScore}% Profile Score
                      </span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-bold">{freelancer.fullName}</h2>
                  {freelancer.identityVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#075B35] dark:text-[#34D399]">
                      <BadgeCheck className="w-4 h-4" />
                      ID Verified
                    </span>
                  )}
                  {freelancer.skillsVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#008C45] dark:text-[#4ADE80]">
                      <GraduationCap className="w-4 h-4" />
                      Skills Certified
                    </span>
                  )}
                  {freelancer.freelancerOfTheMonth && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#E52525]">
                      <Crown className="w-4 h-4" />
                      Freelancer of the Month
                    </span>
                  )}
                  {freelancer.risingTalent && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#075B35] dark:text-[#34D399]">
                      Rising Talent
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-[#075B35] dark:text-[#34D399] mt-0.5">
                  {freelancer.title}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-[#141715]/75 dark:text-[#B4C0B8]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {freelancer.city ? `${freelancer.city}, ` : ''}
                    {freelancer.country}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {freelancer.timezone || 'UTC+2'}
                  </span>
                  {(freelancer.languages || []).length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Globe2 className="w-3.5 h-3.5" />
                      {(freelancer.languages || []).join(', ')}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[#141715]/75 dark:text-[#B4C0B8]">
                  <span className="font-mono-num font-bold text-sm text-[#141715] dark:text-[#EDF2EE]">
                    ${freelancer.hourlyRate}/hr
                  </span>
                  {freelancer.ratingAverage ? (
                    <span className="inline-flex items-center gap-1 font-mono-num">
                      <Star className="w-3.5 h-3.5 fill-[#008C45] text-[#008C45] dark:fill-[#34D399] dark:text-[#34D399]" />
                      {freelancer.ratingAverage} ({freelancer.reviewCount} verified reviews)
                    </span>
                  ) : (
                    <span>Awaiting first verified review</span>
                  )}
                  <span className="font-mono-num">
                    {freelancer.completedProjectsCount || 0} completed projects
                  </span>
                  {freelancer.activityStreakWeeks && freelancer.activityStreakWeeks > 0 ? (
                    <span className="inline-flex items-center gap-1 font-mono-num text-[#E52525] font-semibold">
                      <Flame className="w-3.5 h-3.5" />
                      {freelancer.activityStreakWeeks}-week streak
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pb-5 border-b border-[#E2E6E3] dark:border-[#2A352E]">
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onRequireAuth('client');
                    return;
                  }
                  setInviteOpen(!inviteOpen);
                  setMessageOpen(false);
                  setInterviewOpen(false);
                }}
                className="px-4 py-2.5 bg-[#E52525] hover:bg-[#c81e1e] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
              >
                Hire / Invite to Job
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onRequireAuth('client');
                    return;
                  }
                  setInterviewOpen(!interviewOpen);
                  setInviteOpen(false);
                  setMessageOpen(false);
                }}
                className="px-4 py-2.5 bg-[#101010] dark:bg-[#1E2621] hover:bg-[#075B35] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <CalendarClock className="w-4 h-4 text-[#4ADE80]" />
                Book Interview
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onRequireAuth('client');
                    return;
                  }
                  setMessageOpen(!messageOpen);
                  setInviteOpen(false);
                  setInterviewOpen(false);
                }}
                className="px-4 py-2.5 bg-[#075B35] hover:bg-[#008C45] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                Message
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onRequireAuth('client');
                    return;
                  }
                  onToggleShortlist(freelancer.id);
                }}
                className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 ${
                  isShortlisted
                    ? 'border-[#075B35] dark:border-[#34D399] bg-[#075B35]/10 text-[#075B35] dark:text-[#34D399]'
                    : 'border-[#E2E6E3] dark:border-[#2A352E] hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                {isShortlisted ? 'Shortlisted' : 'Shortlist'}
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(!reportOpen)}
                className="ml-auto text-xs text-[#141715]/60 dark:text-[#B4C0B8] hover:text-[#E52525] inline-flex items-center gap-1"
              >
                <Flag className="w-3.5 h-3.5" />
                Report
              </button>
            </div>

            {/* Inline Invite Form */}
            {inviteOpen && (
              <form
                onSubmit={handleSendInvite}
                className="p-4 bg-[#F4F6F4] dark:bg-[#1E2621] rounded-xl border border-[#E2E6E3] dark:border-[#2A352E] space-y-3"
              >
                <p className="font-display text-sm font-bold">
                  Invite {freelancer.fullName} to a Project
                </p>
                {clientJobs.length === 0 ? (
                  <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8]">
                    You do not have any open jobs yet. Post a job in your Client Dashboard first.
                  </p>
                ) : (
                  <>
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className={inputClass}
                    >
                      {clientJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows={2}
                      value={inviteMsg}
                      onChange={(e) => setInviteMsg(e.target.value)}
                      placeholder="Add a brief project note..."
                      className={inputClass}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#E52525] text-white text-xs font-semibold rounded-lg"
                    >
                      Send Job Invitation
                    </button>
                  </>
                )}
              </form>
            )}

            {/* Inline Interview Booking Form */}
            {interviewOpen && (
              <form
                onSubmit={handleBookInterview}
                className="p-4 bg-[#F4F6F4] dark:bg-[#1E2621] rounded-xl border border-[#E2E6E3] dark:border-[#2A352E] space-y-3"
              >
                <p className="font-display text-sm font-bold">
                  Schedule Video Interview with {freelancer.fullName}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Proposed Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className={`${inputClass} font-mono-num`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Duration</label>
                    <select
                      value={interviewDuration}
                      onChange={(e) => setInterviewDuration(e.target.value)}
                      className={inputClass}
                    >
                      <option value="20">20 Minutes (Intro Screen)</option>
                      <option value="30">30 Minutes (Discovery Call)</option>
                      <option value="45">45 Minutes (Technical Review)</option>
                      <option value="60">60 Minutes (Architecture Deep Dive)</option>
                    </select>
                  </div>
                </div>
                {clientJobs.length > 0 && (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">General Consultation</option>
                    {clientJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        For Job: {j.title}
                      </option>
                    ))}
                  </select>
                )}
                <textarea
                  rows={2}
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  placeholder="Meeting agenda, call link, or discussion topics..."
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#075B35] text-white text-xs font-semibold rounded-lg"
                >
                  Confirm Interview Request
                </button>
              </form>
            )}

            {/* Inline Message Form */}
            {messageOpen && (
              <form
                onSubmit={handleSendMessage}
                className="p-4 bg-[#F4F6F4] dark:bg-[#1E2621] rounded-xl border border-[#E2E6E3] dark:border-[#2A352E] space-y-3"
              >
                <p className="font-display text-sm font-bold">
                  Direct Message to {freelancer.fullName}
                </p>
                <textarea
                  required
                  rows={3}
                  value={directMessage}
                  onChange={(e) => setDirectMessage(e.target.value)}
                  placeholder="Share your project scope, timeline, or questions..."
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#075B35] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Message
                </button>
              </form>
            )}

            {/* Inline Report Form */}
            {reportOpen && (
              <form
                onSubmit={handleReport}
                className="p-4 bg-[#E52525]/5 dark:bg-[#E52525]/10 rounded-xl border border-[#E52525]/25 space-y-3"
              >
                <p className="font-display text-sm font-bold">Report Profile</p>
                <input
                  type="text"
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#E52525] text-white text-xs font-semibold rounded-lg"
                >
                  Submit Report
                </button>
              </form>
            )}

            {/* 30-60s Video Introduction Player */}
            {freelancer.videoIntroUrl && (
              <div className="space-y-2">
                <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
                  Video Introduction (30–60s)
                </h3>
                <video
                  controls
                  preload="metadata"
                  src={freelancer.videoIntroUrl}
                  className="w-full rounded-xl max-h-72 bg-black border border-[#E2E6E3] dark:border-[#2A352E]"
                />
              </div>
            )}

            {/* Biography */}
            <div>
              <h3 className="font-display text-sm font-bold mb-2">Professional Biography</h3>
              <p className="text-sm text-[#141715]/85 dark:text-[#EDF2EE]/85 leading-relaxed">
                {freelancer.bio}
              </p>
            </div>

            {/* Achievements & Certified Skills */}
            {((freelancer.achievementBadges || []).length > 0 ||
              (freelancer.certifiedSkills || []).length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F4F6F4] dark:border-[#2A352E]">
                {(freelancer.achievementBadges || []).length > 0 && (
                  <div>
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#075B35] dark:text-[#34D399] mb-2 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      Platform Achievements
                    </h3>
                    <ul className="space-y-1 text-xs text-[#141715]/85 dark:text-[#EDF2EE]/85">
                      {(freelancer.achievementBadges || []).map((b) => (
                        <li key={b} className="font-medium">
                          • {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(freelancer.certifiedSkills || []).length > 0 && (
                  <div>
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#008C45] dark:text-[#4ADE80] mb-2 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Certified Skills
                    </h3>
                    <ul className="space-y-1 text-xs text-[#141715]/85 dark:text-[#EDF2EE]/85">
                      {(freelancer.certifiedSkills || []).map((s) => (
                        <li key={s} className="font-medium">
                          ✓ {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Skills */}
            <div>
              <h3 className="font-display text-sm font-bold mb-2">Core Skills</h3>
              <p className="text-sm font-medium text-[#141715]/85 dark:text-[#EDF2EE]/85 leading-relaxed">
                {(freelancer.skills || []).join(' · ')}
              </p>
            </div>

            {/* Portfolio */}
            <div>
              <h3 className="font-display text-sm font-bold mb-2">Portfolio</h3>
              {(freelancer.portfolioItems || []).length === 0 ? (
                <p className="text-xs text-[#141715]/60 dark:text-[#B4C0B8]">
                  No portfolio deliverables added yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(freelancer.portfolioItems || []).map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-[#E2E6E3] dark:border-[#2A352E] bg-[#F4F6F4]/55 dark:bg-[#1E2621]"
                    >
                      <p className="text-xs text-[#075B35] dark:text-[#34D399] font-medium">
                        {item.category}
                      </p>
                      <h4 className="font-display text-sm font-bold mt-1">{item.title}</h4>
                      <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] mt-1 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verified Client Reviews */}
            <div>
              <h3 className="font-display text-sm font-bold mb-2">Verified Client Reviews</h3>
              {reviews.length === 0 ? (
                <p className="text-xs text-[#141715]/60 dark:text-[#B4C0B8]">
                  No verified client reviews recorded on the platform yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-xl border border-[#E2E6E3] dark:border-[#2A352E] bg-white dark:bg-[#1E2621] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">
                          {rev.clientName} · {rev.companyName}
                        </span>
                        <span className="font-mono-num font-semibold text-[#075B35] dark:text-[#34D399]">
                          {rev.rating.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <p className="text-xs text-[#141715]/60 dark:text-[#B4C0B8]">
                        {rev.jobTitle}
                      </p>
                      <p className="text-sm text-[#141715]/85 dark:text-[#EDF2EE]/90 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
