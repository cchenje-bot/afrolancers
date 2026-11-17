import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  Bell,
  BellRing,
  Briefcase,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  Crown,
  Download,
  FileSpreadsheet,
  Flame,
  GraduationCap,
  Layers,
  Lock,
  Megaphone,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import {
  CATEGORY_NAMES,
  COUNTRIES,
  EXPERIENCE_LEVELS,
  LANGUAGES,
  PRESET_PORTRAITS,
  TIMEZONES,
} from '../lib/constants';
import type {
  ActivityLogItem,
  AdCampaign,
  AvailabilityStatus,
  CategoryItem,
  EscrowContract,
  ExperienceLevel,
  FreelancerEarningsResponse,
  InterviewBooking,
  JobInvitation,
  JobListing,
  MessageAttachment,
  MessageItem,
  NotificationItem,
  PaymentGatewayInfo,
  PaymentTransaction,
  PlatformStats,
  PortfolioItem,
  ProjectAlertPreferences,
  ProjectTask,
  Proposal,
  PublicUser,
  RecommendedJob,
  ReportItem,
  SubscriptionSettings,
  TeamMember,
} from '../types';
import { AiCareerAssistantPanel } from './AiCareerAssistantPanel';
import type { PaymentModalContext } from './PaymentModal';
import { ResilientImage } from './ResilientImage';

interface DashboardViewProps {
  user: PublicUser;
  notifications: NotificationItem[];
  onUserUpdated: (u: PublicUser) => void;
  onOpenPostJob: () => void;
  onApplyJob: (job: JobListing) => void;
  onSelectFreelancer: (id: string) => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onOpenPayment: (ctx: PaymentModalContext) => void;
  onNotify: (msg: string) => void;
  refreshSignal: number;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  notifications,
  onUserUpdated,
  onOpenPostJob,
  onApplyJob,
  onSelectFreelancer,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenPayment,
  onNotify,
  refreshSignal,
}) => {
  const defaultTab =
    user.role === 'admin'
      ? 'admin-overview'
      : user.role === 'client'
        ? 'client-jobs'
        : 'fl-proposals';
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    setTab(
      user.role === 'admin'
        ? 'admin-overview'
        : user.role === 'client'
          ? 'client-jobs'
          : 'fl-proposals'
    );
  }, [user.role]);

  // Shared messaging state (with file attachment & negotiation quote)
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [contacts, setContacts] = useState<PublicUser[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [quoteComposerOpen, setQuoteComposerOpen] = useState(false);
  const [quoteAmountUsd, setQuoteAmountUsd] = useState('');
  const [quoteTimeline, setQuoteTimeline] = useState('4 weeks');

  // Shared interviews & project tasks state
  const [interviews, setInterviews] = useState<InterviewBooking[]>([]);
  const [selectedTaskProposalId, setSelectedTaskProposalId] = useState('');
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('2026-12-15');

  // Freelancer state
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [myInvitations, setMyInvitations] = useState<JobInvitation[]>([]);
  const [savedJobs, setSavedJobs] = useState<JobListing[]>([]);
  const [matchingJobs, setMatchingJobs] = useState<JobListing[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [allOpenJobs, setAllOpenJobs] = useState<JobListing[]>([]);
  const [earningsData, setEarningsData] = useState<FreelancerEarningsResponse | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [alertPrefs, setAlertPrefs] = useState<ProjectAlertPreferences>(
    user.projectAlerts || {
      enabled: true,
      categories: user.category ? [user.category] : [],
      keywords: (user.skills || []).slice(0, 4),
      minBudget: 0,
      remoteOnly: false,
    }
  );
  const [alertKeywordsText, setAlertKeywordsText] = useState(
    (user.projectAlerts?.keywords || (user.skills || []).slice(0, 4)).join(', ')
  );
  const [savingAlerts, setSavingAlerts] = useState(false);

  const [profForm, setProfForm] = useState({
    fullName: user.fullName,
    phone: user.phone || '',
    country: user.country,
    city: user.city || '',
    timezone: user.timezone || TIMEZONES[0],
    languages: user.languages || ['English'],
    title: user.title || '',
    category: user.category || CATEGORY_NAMES[0],
    skills: (user.skills || []).join(', '),
    experienceLevel: user.experienceLevel || 'Senior',
    hourlyRate: String(user.hourlyRate || 45),
    availability: user.availability || 'Available Now',
    portfolioUrl: user.portfolioUrl || '',
    photoUrl: user.photoUrl || '',
    videoIntroUrl: user.videoIntroUrl || '',
    bio: user.bio || '',
  });
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(user.portfolioItems || []);
  const [newPfTitle, setNewPfTitle] = useState('');
  const [newPfSummary, setNewPfSummary] = useState('');

  useEffect(() => {
    if (user.projectAlerts) {
      setAlertPrefs(user.projectAlerts);
      setAlertKeywordsText(user.projectAlerts.keywords.join(', '));
    }
  }, [user.projectAlerts]);

  // Client state
  const [clientJobs, setClientJobs] = useState<JobListing[]>([]);
  const [clientProposals, setClientProposals] = useState<Proposal[]>([]);
  const [shortlistedFreelancers, setShortlistedFreelancers] = useState<PublicUser[]>([]);
  const [pastFreelancers, setPastFreelancers] = useState<
    Array<{
      freelancer: PublicUser;
      lastJobTitle: string;
      lastRate: number;
      completedDate: string;
    }>
  >([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamRole, setNewTeamRole] = useState<TeamMember['role']>('Hiring Manager');
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdSummary, setNewAdSummary] = useState('');
  const [newAdCta, setNewAdCta] = useState('Learn More');
  const [newAdUrl, setNewAdUrl] = useState('https://afro-lancers.com');

  const [reviewDraft, setReviewDraft] = useState<{
    freelancerId: string;
    freelancerName: string;
    jobId: string;
    rating: number;
    comment: string;
  } | null>(null);

  // Admin state
  const [adminStats, setAdminStats] = useState<PlatformStats | null>(null);
  const [adminUsers, setAdminUsers] = useState<PublicUser[]>([]);
  const [adminJobs, setAdminJobs] = useState<JobListing[]>([]);
  const [adminProposals, setAdminProposals] = useState<Proposal[]>([]);
  const [adminCategories, setAdminCategories] = useState<CategoryItem[]>([]);
  const [adminReports, setAdminReports] = useState<ReportItem[]>([]);
  const [adminActivity, setAdminActivity] = useState<ActivityLogItem[]>([]);
  const [adminAds, setAdminAds] = useState<AdCampaign[]>([]);
  const [subSettings, setSubSettings] = useState<SubscriptionSettings>({
    commissionPercent: 5,
    freelancerProMonthlyUsd: 19,
    clientEnterpriseMonthlyUsd: 79,
    featuredJobUsd: 29,
    featuredProfileUsd: 25,
  });
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Payment, Milestones & Escrow Dispute state
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [escrows, setEscrows] = useState<EscrowContract[]>([]);
  const [gateways, setGateways] = useState<PaymentGatewayInfo[]>([]);
  const [releasingEscrowId, setReleasingEscrowId] = useState<string | null>(null);
  const [disputeDraft, setDisputeDraft] = useState<{
    escrowId: string;
    reason: string;
    details: string;
  } | null>(null);

  const loadTasksForProposal = async (proposalId: string) => {
    if (!proposalId) {
      setProjectTasks([]);
      return;
    }
    try {
      const res = await api.getProjectTasks(proposalId);
      setProjectTasks(res.tasks);
    } catch {
      setProjectTasks([]);
    }
  };

  const loadData = async () => {
    try {
      const [msgRes, payRes, intRes] = await Promise.all([
        api.getMessages(),
        api.getPaymentHistory(),
        api.getInterviews(),
      ]);
      setMessages(msgRes.messages);
      setContacts(msgRes.contacts);
      if (!selectedContactId && msgRes.contacts.length > 0) {
        setSelectedContactId(msgRes.contacts[0].id);
      }
      setTransactions(payRes.transactions);
      setEscrows(payRes.escrows);
      setGateways(payRes.gateways);
      setSubSettings(payRes.subscriptionSettings);
      setInterviews(intRes.interviews);

      if (user.role === 'freelancer') {
        const [propRes, savedRes, alertRes, recRes, earnRes, jobsRes] = await Promise.all([
          api.getMyProposalsAndInvitations(),
          api.getSavedJobs(),
          api.getAlertMatches(),
          api.getRecommendedJobs(),
          api.getFreelancerEarnings(),
          api.searchJobs({}),
        ]);
        setMyProposals(propRes.proposals);
        setMyInvitations(propRes.invitations);
        setSavedJobs(savedRes.jobs);
        setMatchingJobs(alertRes.matchingJobs);
        setRecommendedJobs(recRes.recommendedJobs);
        setEarningsData(earnRes);
        setAllOpenJobs(jobsRes.jobs);

        const activeProp = propRes.proposals.find(
          (p) => p.status === 'hired' || p.status === 'completed'
        );
        if (activeProp && !selectedTaskProposalId) {
          setSelectedTaskProposalId(activeProp.id);
          loadTasksForProposal(activeProp.id);
        } else if (selectedTaskProposalId) {
          loadTasksForProposal(selectedTaskProposalId);
        }
      } else if (user.role === 'client') {
        const [jobsRes, shortRes, pastRes, teamRes, adsRes] = await Promise.all([
          api.getClientJobs(),
          api.getShortlist(),
          api.getPastFreelancers(),
          api.getTeamMembers(),
          api.getAds(),
        ]);
        setClientJobs(jobsRes.jobs);
        setClientProposals(jobsRes.proposals);
        setShortlistedFreelancers(shortRes.freelancers);
        setPastFreelancers(pastRes.pastFreelancers);
        setTeamMembers(teamRes.teamMembers);
        setAds(adsRes.ads);

        const activeProp = jobsRes.proposals.find(
          (p) => p.status === 'hired' || p.status === 'completed'
        );
        if (activeProp && !selectedTaskProposalId) {
          setSelectedTaskProposalId(activeProp.id);
          loadTasksForProposal(activeProp.id);
        } else if (selectedTaskProposalId) {
          loadTasksForProposal(selectedTaskProposalId);
        }
      } else if (user.role === 'admin') {
        const adm = await api.getAdminOverview();
        setAdminStats(adm.stats);
        setAdminUsers(adm.users);
        setAdminJobs(adm.jobs);
        setAdminProposals(adm.proposals);
        setAdminCategories(adm.categories);
        setAdminReports(adm.reports);
        setAdminActivity(adm.activityLog);
        setSubSettings(adm.subscriptionSettings);
        if (adm.gateways) setGateways(adm.gateways);
        if (adm.transactions) setTransactions(adm.transactions);
        if (adm.escrows) setEscrows(adm.escrows);
        if (adm.ads) setAdminAds(adm.ads);
      }
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id, user.role, refreshSignal]);

  const handleSaveAlertPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAlerts(true);
    try {
      const parsedKeywords = alertKeywordsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await api.updateAlertPreferences({
        ...alertPrefs,
        keywords: parsedKeywords,
      });
      onUserUpdated(res.user);
      const alertRes = await api.getAlertMatches();
      setMatchingJobs(alertRes.matchingJobs);
      onNotify('Project Alert preferences updated.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to save alert settings.');
    } finally {
      setSavingAlerts(false);
    }
  };

  const toggleAlertCategory = (catName: string) => {
    setAlertPrefs((prev) => ({
      ...prev,
      categories: prev.categories.includes(catName)
        ? prev.categories.filter((c) => c !== catName)
        : [...prev.categories, catName],
    }));
  };

  const handleUploadMessageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 9.5 * 1024 * 1024) {
      onNotify('Attachment exceeds 9.5MB limit.');
      return;
    }
    setUploadingAttachment(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await api.uploadFile(file.name, dataUrl);
      setPendingAttachment(uploaded);
      onNotify(`Attached "${uploaded.name}".`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'File upload failed.');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleUploadIntroVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      onNotify('Video file must be under 10MB (30–60s MP4/WebM recommended).');
      return;
    }
    setUploadingVideo(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await api.uploadFile(file.name, dataUrl);
      setProfForm((prev) => ({ ...prev, videoIntroUrl: uploaded.url }));
      onNotify('Video introduction uploaded. Click Save Profile Changes to publish.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Video upload failed.');
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) return;
    const hasQuote = quoteComposerOpen && Number(quoteAmountUsd) > 0;
    if (!newMessageText.trim() && !pendingAttachment && !hasQuote) return;

    try {
      await api.sendMessage({
        recipientId: selectedContactId,
        body: newMessageText.trim(),
        attachment: pendingAttachment || undefined,
        quote: hasQuote
          ? {
              amountUsd: Number(quoteAmountUsd),
              timeline: quoteTimeline.trim() || '4 weeks',
            }
          : undefined,
      });
      setNewMessageText('');
      setPendingAttachment(null);
      setQuoteComposerOpen(false);
      setQuoteAmountUsd('');
      await loadData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Message failed.');
    }
  };

  const handleRespondQuote = async (msgId: string, status: 'accepted' | 'declined') => {
    try {
      await api.respondMessageQuote(msgId, status);
      onNotify(`Negotiation quote ${status}.`);
      await loadData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to respond to quote.');
    }
  };

  const toggleLanguage = (lang: string) => {
    setProfForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateProfile({
        ...profForm,
        skills: profForm.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        hourlyRate: Number(profForm.hourlyRate),
        portfolioItems,
      });
      onUserUpdated(res.user);
      onNotify('Profile, Work From Anywhere settings, and portfolio saved.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to save profile.');
    }
  };

  const handleAddPortfolioItem = () => {
    if (!newPfTitle.trim()) return;
    setPortfolioItems((prev) => [
      ...prev,
      {
        id: `pf-${Date.now()}`,
        title: newPfTitle.trim(),
        summary: newPfSummary.trim() || 'Delivered project milestone.',
        category: profForm.category,
      },
    ]);
    setNewPfTitle('');
    setNewPfSummary('');
  };

  const handleRespondInvitation = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await api.respondInvitation(id, status);
      onNotify(`Invitation ${status}.`);
      await loadData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to respond.');
    }
  };

  const handleUpdateProposal = async (id: string, status: Proposal['status']) => {
    try {
      await api.updateProposalStatus(id, status);
      onNotify(`Proposal marked as ${status}.`);
      await loadData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Action failed.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewDraft) return;
    try {
      await api.submitReview({
        freelancerId: reviewDraft.freelancerId,
        jobId: reviewDraft.jobId,
        rating: reviewDraft.rating,
        comment: reviewDraft.comment,
      });
      onNotify(`Verified review submitted for ${reviewDraft.freelancerName}.`);
      setReviewDraft(null);
      await loadData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to submit review.');
    }
  };

  const handleReleaseEscrow = async (escrowId: string) => {
    setReleasingEscrowId(escrowId);
    try {
      await api.releaseEscrow(escrowId);
      onNotify('Full escrow payout released to freelancer.');
      await loadData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to release escrow.');
    } finally {
      setReleasingEscrowId(null);
    }
  };

  const handleReleaseMilestone = async (escrowId: string, milestoneId: string) => {
    setReleasingEscrowId(milestoneId);
    try {
      await api.releaseEscrowMilestone(escrowId, milestoneId);
      onNotify('Milestone payout released cleanly.');
      await loadData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to release milestone.');
    } finally {
      setReleasingEscrowId(null);
    }
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeDraft) return;
    try {
      await api.openEscrowDispute(
        disputeDraft.escrowId,
        disputeDraft.reason,
        disputeDraft.details
      );
      setDisputeDraft(null);
      onNotify('Escrow dispute filed for administrator resolution.');
      await loadData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to open dispute.');
    }
  };

  const handleAddProjectTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskProposalId || !newTaskTitle.trim()) return;
    try {
      await api.createProjectTask(selectedTaskProposalId, {
        title: newTaskTitle.trim(),
        assigneeName: newTaskAssignee.trim() || user.fullName,
        dueDate: newTaskDueDate,
      });
      setNewTaskTitle('');
      await loadTasksForProposal(selectedTaskProposalId);
      onNotify('Project task created.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to create task.');
    }
  };

  const handleCycleTaskStatus = async (task: ProjectTask) => {
    const next: ProjectTask['status'] =
      task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    try {
      await api.updateProjectTask(task.id, next);
      await loadTasksForProposal(task.proposalId);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to update task.');
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamEmail.trim()) return;
    try {
      const res = await api.addTeamMember({
        name: newTeamName.trim(),
        email: newTeamEmail.trim(),
        role: newTeamRole,
      });
      setTeamMembers(res.teamMembers);
      setNewTeamName('');
      setNewTeamEmail('');
      onNotify('Team member invited to company hiring workspace.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to add team member.');
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim() || !newAdSummary.trim()) return;
    try {
      await api.createAdCampaign({
        title: newAdTitle.trim(),
        summary: newAdSummary.trim(),
        ctaLabel: newAdCta.trim() || 'Learn More',
        targetUrl: newAdUrl.trim() || 'https://afro-lancers.com',
        category: user.businessCategory || CATEGORY_NAMES[0],
        placement: 'home',
        budgetUsd: 99,
      });
      setNewAdTitle('');
      setNewAdSummary('');
      onNotify('Sponsored Business Ad published to marketplace highlights!');
      await loadData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to create campaign.');
    }
  };

  const handleExportReport = () => {
    window.open('/api/admin/export', '_blank');
  };

  const conversationMessages = messages.filter(
    (m) =>
      (m.senderId === user.id && m.recipientId === selectedContactId) ||
      (m.senderId === selectedContactId && m.recipientId === user.id)
  );

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const activeEscrowsCount = escrows.filter(
    (e) => e.status === 'funded' || e.status === 'disputed'
  ).length;
  const pendingInterviewsCount = interviews.filter((i) => i.status === 'pending').length;
  const disputedEscrowsCount = escrows.filter((e) => e.status === 'disputed').length;

  const trackableProposals = (user.role === 'client' ? clientProposals : myProposals).filter(
    (p) => p.status === 'hired' || p.status === 'completed'
  );

  const navButtons =
    user.role === 'admin'
      ? [
          { id: 'admin-overview', label: 'Analytics & Reports', icon: FileSpreadsheet },
          { id: 'admin-users', label: 'Users & Verification', icon: Users },
          { id: 'admin-jobs', label: 'Jobs & Proposals', icon: Briefcase },
          { id: 'payments', label: 'Gateways & Escrow', icon: CreditCard, badge: activeEscrowsCount },
          { id: 'admin-categories', label: 'Categories', icon: Layers },
          {
            id: 'admin-moderation',
            label: 'Disputes, Ads & Plans',
            icon: Shield,
            badge: disputedEscrowsCount,
          },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount },
        ]
      : user.role === 'client'
        ? [
            { id: 'client-jobs', label: 'Jobs & Proposals', icon: Briefcase },
            {
              id: 'client-collab',
              label: 'Interviews, Team & Ads',
              icon: CalendarClock,
              badge: pendingInterviewsCount,
            },
            { id: 'payments', label: 'Escrow & Payments', icon: CreditCard, badge: activeEscrowsCount },
            { id: 'client-shortlist', label: 'Shortlist & Hire Again', icon: UserCheck },
            { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount },
            { id: 'messages', label: 'Messages & Quotes', icon: MessageSquare },
          ]
        : [
            { id: 'fl-proposals', label: 'Smart Matches & Proposals', icon: Briefcase },
            { id: 'fl-earnings', label: 'Earnings & Reviews', icon: TrendingUp },
            { id: 'fl-ai', label: 'AI Career Assistant', icon: Sparkles },
            {
              id: 'fl-workspace',
              label: 'Interviews & Tasks',
              icon: CalendarClock,
              badge: pendingInterviewsCount,
            },
            { id: 'payments', label: 'Escrow & Billing', icon: CreditCard, badge: activeEscrowsCount },
            { id: 'fl-alerts', label: 'Project Alerts', icon: BellRing, badge: unreadNotifsCount },
            { id: 'fl-saved', label: 'Saved Jobs', icon: Star },
            { id: 'fl-profile', label: 'Profile, Video & Portfolio', icon: UserCheck },
            { id: 'messages', label: 'Messages & Quotes', icon: MessageSquare },
          ];

  const cardClass =
    'bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl';
  const inputClass =
    'w-full px-3 py-2 text-sm border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-white dark:bg-[#1E2621] text-[#141715] dark:text-[#EDF2EE] placeholder:text-[#141715]/45 dark:placeholder:text-[#B4C0B8]/60 focus:outline-none focus:border-[#075B35] dark:focus:border-[#34D399]';

  const renderNotificationsList = () => (
    <div className={`${cardClass} p-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#E2E6E3] dark:border-[#2A352E]">
        <div>
          <h2 className="font-display text-base font-bold">Notifications Feed</h2>
          <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
            Live project alerts, interviews, milestones, quotes, and direct messages.
          </p>
        </div>
        {unreadNotifsCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllNotificationsRead}
            className="text-xs font-semibold text-[#075B35] dark:text-[#34D399] hover:underline inline-flex items-center gap-1 self-start"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all {unreadNotifsCount} read
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">No notifications yet.</p>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                n.read
                  ? 'border-[#E2E6E3] dark:border-[#2A352E]'
                  : 'border-[#075B35]/35 dark:border-[#34D399]/35 bg-[#075B35]/[0.04] dark:bg-[#34D399]/[0.06]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-semibold">
                  <span
                    className={
                      n.type === 'alert'
                        ? 'text-[#008C45] dark:text-[#34D399]'
                        : 'text-[#141715]/65 dark:text-[#B4C0B8]'
                    }
                  >
                    {n.type === 'alert' ? 'Project Alert' : n.type}
                  </span>
                  <span className="text-[#141715]/40 dark:text-[#B4C0B8]/50">·</span>
                  <span className="font-mono-num text-[#141715]/55 dark:text-[#B4C0B8]">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-bold mt-0.5">{n.title}</p>
                <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] mt-1 leading-relaxed">
                  {n.body}
                </p>
              </div>
              {!n.read && (
                <button
                  type="button"
                  onClick={() => onMarkNotificationRead(n.id)}
                  className="px-3 py-1.5 text-xs font-semibold border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621] shrink-0 self-start sm:self-center"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderInterviewsAndTasks = () => (
    <div className="space-y-6">
      {/* Interviews */}
      <div className={`${cardClass} p-6`}>
        <h2 className="font-display text-base font-bold mb-4 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
          Scheduled Interviews ({interviews.length})
        </h2>
        {interviews.length === 0 ? (
          <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
            {user.role === 'client'
              ? 'No interviews booked yet. Open any freelancer profile and click Book Interview.'
              : 'No interview invitations yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {interviews.map((iv) => (
              <div
                key={iv.id}
                className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-semibold uppercase text-[#075B35] dark:text-[#34D399]">
                    {iv.status} · {iv.durationMinutes} mins
                  </p>
                  <h3 className="font-display text-sm font-bold mt-0.5">
                    {user.role === 'client' ? iv.freelancerName : iv.clientName}
                    {iv.jobTitle ? ` · ${iv.jobTitle}` : ''}
                  </h3>
                  <p className="text-xs font-mono-num text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                    {new Date(iv.scheduledAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] mt-1">
                    {iv.meetingNotes}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {user.role === 'freelancer' && iv.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.respondInterview(iv.id, 'confirmed');
                          onNotify('Interview confirmed!');
                          loadData();
                        }}
                        className="px-3 py-1.5 bg-[#008C45] text-white text-xs font-semibold rounded-lg"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.respondInterview(iv.id, 'declined');
                          onNotify('Interview declined.');
                          loadData();
                        }}
                        className="px-3 py-1.5 border border-[#E2E6E3] dark:border-[#2A352E] text-xs font-semibold rounded-lg"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {user.role === 'client' &&
                    (iv.status === 'pending' || iv.status === 'confirmed') && (
                      <button
                        type="button"
                        onClick={async () => {
                          await api.respondInterview(iv.id, 'completed');
                          onNotify('Interview marked completed.');
                          loadData();
                        }}
                        className="px-3 py-1.5 bg-[#075B35] text-white text-xs font-semibold rounded-lg"
                      >
                        Mark Completed
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Management Tasks */}
      <div className={`${cardClass} p-6 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E6E3] dark:border-[#2A352E]">
          <div>
            <h2 className="font-display text-base font-bold">Project Deliverables &amp; Task Board</h2>
            <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
              Track milestones, deliverables, and progress across hired contracts.
            </p>
          </div>
          {trackableProposals.length > 0 && (
            <select
              value={selectedTaskProposalId}
              onChange={(e) => {
                setSelectedTaskProposalId(e.target.value);
                loadTasksForProposal(e.target.value);
              }}
              className="px-3 py-1.5 text-xs border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-white dark:bg-[#1E2621]"
            >
              {trackableProposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.jobTitle} ({user.role === 'client' ? p.freelancerName : p.status})
                </option>
              ))}
            </select>
          )}
        </div>

        {trackableProposals.length === 0 ? (
          <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
            Once a proposal is hired, project tasks and milestone deliverables appear here.
          </p>
        ) : (
          <>
            <form onSubmit={handleAddProjectTask} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New deliverable or task..."
                className={`sm:col-span-2 ${inputClass}`}
              />
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className={`${inputClass} font-mono-num`}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#075B35] hover:bg-[#008C45] text-white text-xs font-semibold rounded-lg"
              >
                Add Task
              </button>
            </form>

            {projectTasks.length === 0 ? (
              <p className="text-xs text-[#141715]/60 dark:text-[#B4C0B8]">
                No tasks added to this contract yet.
              </p>
            ) : (
              <div className="space-y-2">
                {projectTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          t.status === 'done' ? 'line-through opacity-65' : ''
                        }`}
                      >
                        {t.title}
                      </p>
                      <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8] font-mono-num">
                        Assignee: {t.assigneeName} · Due {t.dueDate}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCycleTaskStatus(t)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
                        t.status === 'done'
                          ? 'bg-[#008C45] text-white border-[#008C45]'
                          : t.status === 'in_progress'
                            ? 'border-[#075B35] text-[#075B35] dark:border-[#34D399] dark:text-[#34D399]'
                            : 'border-[#E2E6E3] dark:border-[#2A352E]'
                      }`}
                    >
                      {t.status.replace('_', ' ')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[80vh] bg-[#F4F6F4]/60 dark:bg-[#0F1411] text-[#141715] dark:text-[#EDF2EE] py-8 transition-colors">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Workspace Header */}
        <div
          className={`${cardClass} p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#075B35] dark:text-[#34D399]">
              {user.role === 'admin'
                ? 'Administrator Governance Console'
                : user.role === 'client'
                  ? 'Client & Employer Workspace'
                  : 'Freelancer Workspace'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <h1 className="font-display text-2xl font-bold">Welcome, {user.fullName}</h1>
              {user.identityVerified && (
                <BadgeCheck className="w-5 h-5 text-[#075B35] dark:text-[#34D399]" />
              )}
              {user.freelancerOfTheMonth && <Crown className="w-5 h-5 text-[#E52525]" />}
            </div>
            <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
              {user.role === 'client' && user.companyName ? `${user.companyName} · ` : ''}
              {user.city ? `${user.city}, ` : ''}
              {user.country} · Plan: {user.subscriptionTier.toUpperCase()}
              {typeof user.profileCompletionScore === 'number'
                ? ` · Profile ${user.profileCompletionScore}%`
                : ''}
              {user.activityStreakWeeks ? ` · ${user.activityStreakWeeks}w Streak` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user.role === 'freelancer' && !user.isFeaturedProfile && (
              <button
                type="button"
                onClick={() =>
                  onOpenPayment({
                    purpose: 'featured_profile',
                    title: 'Boost Featured Freelancer Profile',
                    subtitle: 'Pin your profile to top directory searches & showcase highlights',
                    amountUsd: subSettings.featuredProfileUsd || 25,
                  })
                }
                className="px-4 py-2.5 bg-[#075B35] hover:bg-[#008C45] text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Crown className="w-4 h-4" />
                Feature Profile (${subSettings.featuredProfileUsd || 25})
              </button>
            )}
            {user.role === 'client' && (
              <button
                type="button"
                onClick={onOpenPostJob}
                className="px-4 py-2.5 bg-[#E52525] hover:bg-[#c81e1e] text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Post a New Job
              </button>
            )}
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={handleExportReport}
                className="px-4 py-2.5 bg-[#101010] dark:bg-[#075B35] hover:bg-[#075B35] dark:hover:bg-[#008C45] text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                Export Business Report
              </button>
            )}
          </div>
        </div>

        {/* Workspace Layout: Sidebar Tabs + Main Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <nav className={`${cardClass} p-2 space-y-1`}>
              {navButtons.map((btn) => {
                const Icon = btn.icon;
                const active = tab === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setTab(btn.id)}
                    className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between gap-2 transition-colors text-left ${
                      active
                        ? 'bg-[#075B35] text-white'
                        : 'text-[#141715]/80 dark:text-[#EDF2EE]/80 hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621] hover:text-[#141715] dark:hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{btn.label}</span>
                    </span>
                    {typeof btn.badge === 'number' && btn.badge > 0 && (
                      <span
                        className={`px-1.5 py-0.5 text-[11px] font-mono-num font-bold rounded ${
                          active ? 'bg-white text-[#075B35]' : 'bg-[#E52525] text-white'
                        }`}
                      >
                        {btn.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="lg:col-span-9 space-y-6">
            {/* FREELANCER: SMART JOB MATCHES, PROPOSALS & INVITATIONS */}
            {user.role === 'freelancer' && tab === 'fl-proposals' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold">{recommendedJobs.length}</p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Smart Job Matches
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold text-[#075B35] dark:text-[#34D399]">
                      {myProposals.length}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Proposals Submitted
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold">{myInvitations.length}</p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Job Invitations
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold text-[#075B35] dark:text-[#34D399]">
                      {user.activityStreakWeeks || 1}w
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Activity Streak
                    </p>
                  </div>
                </div>

                {/* Smart Job Matching Feed */}
                <div className={`${cardClass} p-6`}>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E6E3] dark:border-[#2A352E]">
                    <div>
                      <h2 className="font-display text-base font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
                        Smart Job Matching Recommendations
                      </h2>
                      <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                        Ranked automatically by your skills, experience level, location, and portfolio.
                      </p>
                    </div>
                  </div>
                  {recommendedJobs.length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      Complete your skills and portfolio items to unlock personalized matches.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recommendedJobs.slice(0, 5).map((job) => (
                        <div
                          key={job.id}
                          className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono-num font-bold text-[#075B35] dark:text-[#34D399]">
                                {job.matchScore}% Match
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#141715]/70 dark:text-[#B4C0B8]">
                                {job.matchReasons.join(' · ')}
                              </span>
                            </div>
                            <h3 className="font-display text-sm font-bold mt-1">{job.title}</h3>
                            <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] font-mono-num mt-0.5">
                              {job.companyName} · ${job.budgetMin.toLocaleString()}–$
                              {job.budgetMax.toLocaleString()} · {job.country}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onApplyJob(job)}
                            className="px-4 py-2 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-semibold rounded-lg shrink-0"
                          >
                            Apply Now
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invitations */}
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">Client Job Invitations</h2>
                  {myInvitations.length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      No direct invitations yet. Keep your skills and portfolio up to date.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {myInvitations.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs text-[#075B35] dark:text-[#34D399] font-semibold">
                              {inv.companyName} · {inv.status.toUpperCase()}
                            </p>
                            <h3 className="font-display text-sm font-bold mt-0.5">{inv.jobTitle}</h3>
                            <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] mt-1">
                              {inv.message}
                            </p>
                          </div>
                          {inv.status === 'pending' && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRespondInvitation(inv.id, 'accepted')}
                                className="px-3.5 py-1.5 bg-[#008C45] text-white text-xs font-semibold rounded-lg"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRespondInvitation(inv.id, 'declined')}
                                className="px-3.5 py-1.5 border border-[#E2E6E3] dark:border-[#2A352E] text-xs font-semibold rounded-lg"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submitted Proposals */}
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">Submitted Proposals</h2>
                  {myProposals.length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      You have not submitted any job proposals yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#E2E6E3] dark:border-[#2A352E] text-xs text-[#141715]/65 dark:text-[#B4C0B8]">
                            <th className="py-2.5 pr-4">Project</th>
                            <th className="py-2.5 px-4 text-right">Proposed Rate</th>
                            <th className="py-2.5 px-4">Timeline</th>
                            <th className="py-2.5 pl-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myProposals.map((p) => (
                            <tr
                              key={p.id}
                              className="border-b border-[#F4F6F4] dark:border-[#2A352E] last:border-b-0"
                            >
                              <td className="py-3 pr-4 font-medium">{p.jobTitle}</td>
                              <td className="py-3 px-4 text-right font-mono-num">
                                ${p.proposedRate.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-xs text-[#141715]/75 dark:text-[#B4C0B8]">
                                {p.timeline}
                              </td>
                              <td className="py-3 pl-4 text-xs font-semibold uppercase text-[#075B35] dark:text-[#34D399]">
                                {p.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* FREELANCER: EARNINGS & CLIENT REVIEWS */}
            {user.role === 'freelancer' && tab === 'fl-earnings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold text-[#075B35] dark:text-[#34D399]">
                      ${(earningsData?.totalEarnedUsd || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Total Net Earnings
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold">
                      ${(earningsData?.pendingEscrowUsd || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Pending in Escrow
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold text-[#075B35] dark:text-[#34D399]">
                      {earningsData?.acceptanceRatePercent || 0}%
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Proposal Hire Rate
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold">
                      {earningsData?.averageReviewRating ? `${earningsData.averageReviewRating} / 5` : 'New'}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      {earningsData?.reviewsCount || 0} Verified Reviews
                    </p>
                  </div>
                </div>

                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-1">
                    Monthly Earnings Breakdown (USD)
                  </h2>
                  <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mb-4">
                    Net settled milestone payouts over the past 6 months.
                  </p>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={earningsData?.monthlySeries || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6E3" opacity={0.4} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="earnedUsd" name="Net Payout ($)" fill="#075B35" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">Verified Client Reviews</h2>
                  {(earningsData?.recentReviews || []).length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      Complete an escrow contract to receive verified client reviews.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(earningsData?.recentReviews || []).map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold">
                              {rev.clientName} · {rev.companyName}
                            </span>
                            <span className="font-mono-num font-bold text-[#075B35] dark:text-[#34D399]">
                              {rev.rating.toFixed(1)} / 5.0
                            </span>
                          </div>
                          <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8]">{rev.jobTitle}</p>
                          <p className="text-sm leading-relaxed">{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FREELANCER: AI CAREER ASSISTANT */}
            {user.role === 'freelancer' && tab === 'fl-ai' && (
              <AiCareerAssistantPanel
                user={user}
                availableJobs={allOpenJobs}
                onNotify={onNotify}
              />
            )}

            {/* FREELANCER: INTERVIEWS & PROJECT TASKS */}
            {user.role === 'freelancer' && tab === 'fl-workspace' && renderInterviewsAndTasks()}

            {/* FREELANCER: PROJECT ALERTS & LIVE NOTIFICATIONS */}
            {user.role === 'freelancer' && tab === 'fl-alerts' && (
              <div className="space-y-6">
                <form onSubmit={handleSaveAlertPrefs} className={`${cardClass} p-6 space-y-5`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E6E3] dark:border-[#2A352E]">
                    <div>
                      <h2 className="font-display text-base font-bold flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
                        Project Alerts Configuration
                      </h2>
                      <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                        Get instant alerts whenever clients publish projects matching your
                        categories, keywords, or budget preferences.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={alertPrefs.enabled}
                        onChange={(e) =>
                          setAlertPrefs({ ...alertPrefs, enabled: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#075B35]"
                      />
                      Alerts Active
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-2">
                      Alert Categories ({alertPrefs.categories.length} selected)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-3 border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-[#F4F6F4]/50 dark:bg-[#121814]">
                      {CATEGORY_NAMES.map((cat) => {
                        const checked = alertPrefs.categories.includes(cat);
                        return (
                          <label
                            key={cat}
                            className="flex items-center gap-2 text-xs cursor-pointer py-1"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAlertCategory(cat)}
                              className="w-3.5 h-3.5 accent-[#075B35] shrink-0"
                            />
                            <span className="truncate">{cat}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Skill &amp; Topic Keywords (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={alertKeywordsText}
                        onChange={(e) => setAlertKeywordsText(e.target.value)}
                        placeholder="React, IFRS, Cybersecurity, Agritech"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Minimum Budget (USD)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={alertPrefs.minBudget}
                        onChange={(e) =>
                          setAlertPrefs({ ...alertPrefs, minBudget: Number(e.target.value) || 0 })
                        }
                        className={`${inputClass} font-mono-num`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alertPrefs.remoteOnly}
                        onChange={(e) =>
                          setAlertPrefs({ ...alertPrefs, remoteOnly: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#075B35]"
                      />
                      Only alert for Remote opportunities
                    </label>
                    <button
                      type="submit"
                      disabled={savingAlerts}
                      className="px-5 py-2.5 bg-[#075B35] hover:bg-[#008C45] text-white text-xs font-semibold rounded-lg disabled:opacity-60"
                    >
                      {savingAlerts ? 'Saving...' : 'Save Alert Preferences'}
                    </button>
                  </div>
                </form>

                {/* Matching Projects Feed */}
                <div className={`${cardClass} p-6`}>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E6E3] dark:border-[#2A352E]">
                    <h2 className="font-display text-base font-bold">
                      Matching Open Projects ({matchingJobs.length})
                    </h2>
                    <span className="text-xs text-[#075B35] dark:text-[#34D399] font-medium">
                      Live Registry Match
                    </span>
                  </div>
                  {matchingJobs.length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      No current open jobs match those exact alert filters yet. Add broader
                      categories or keywords above to capture more projects.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {matchingJobs.map((job) => (
                        <div
                          key={job.id}
                          className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8]">
                              {job.companyName} · {job.category} · {job.remoteStatus}
                            </p>
                            <h3 className="font-display text-sm font-bold mt-0.5">{job.title}</h3>
                            <p className="text-xs font-mono-num text-[#075B35] dark:text-[#34D399] mt-1">
                              ${job.budgetMin.toLocaleString()}–${job.budgetMax.toLocaleString()}
                              {job.budgetType === 'hourly' ? '/hr' : ' fixed'} · Deadline{' '}
                              {job.deadline}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onApplyJob(job)}
                            className="px-4 py-2 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-semibold rounded-lg shrink-0"
                          >
                            Apply Now
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {renderNotificationsList()}
              </div>
            )}

            {/* SHARED: NOTIFICATIONS TAB */}
            {tab === 'notifications' && renderNotificationsList()}

            {/* FREELANCER: SAVED JOBS */}
            {user.role === 'freelancer' && tab === 'fl-saved' && (
              <div className={`${cardClass} p-6`}>
                <h2 className="font-display text-base font-bold mb-4">Saved Opportunities</h2>
                {savedJobs.length === 0 ? (
                  <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                    No saved jobs yet. Bookmark opportunities in Find Work to track them here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {savedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8]">
                            {job.companyName} · {job.category}
                          </p>
                          <h3 className="font-display text-sm font-bold mt-0.5">{job.title}</h3>
                          <p className="text-xs font-mono-num text-[#075B35] dark:text-[#34D399] mt-1">
                            ${job.budgetMin}–${job.budgetMax}
                            {job.budgetType === 'hourly' ? '/hr' : ' fixed'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onApplyJob(job)}
                          className="px-4 py-2 bg-[#008C45] text-white text-xs font-semibold rounded-lg shrink-0"
                        >
                          Apply Now
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FREELANCER: PROFILE, VIDEO INTRO & PORTFOLIO EDITOR */}
            {user.role === 'freelancer' && tab === 'fl-profile' && (
              <form onSubmit={handleSaveProfile} className={`${cardClass} p-6 space-y-5`}>
                {/* Gamification & Profile Completion Summary */}
                <div className="p-4 rounded-xl bg-[#F4F6F4] dark:bg-[#1E2621] border border-[#E2E6E3] dark:border-[#2A352E] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#075B35] dark:text-[#34D399]">
                        Profile Strength &amp; Verification Status
                      </p>
                      <p className="font-mono-num text-xl font-extrabold mt-0.5">
                        {user.profileCompletionScore || 0}% Complete
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 text-[#E52525] font-mono-num">
                        <Flame className="w-4 h-4" />
                        {user.activityStreakWeeks || 1}-week streak
                      </span>
                      {user.identityVerified && (
                        <span className="inline-flex items-center gap-1 text-[#075B35] dark:text-[#34D399]">
                          <BadgeCheck className="w-4 h-4" /> ID Verified
                        </span>
                      )}
                      {user.skillsVerified && (
                        <span className="inline-flex items-center gap-1 text-[#008C45] dark:text-[#4ADE80]">
                          <GraduationCap className="w-4 h-4" /> Skills Certified
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E2E6E3] dark:bg-[#2A352E] overflow-hidden">
                    <div
                      className="h-full bg-[#075B35] dark:bg-[#34D399] transition-all"
                      style={{ width: `${user.profileCompletionScore || 0}%` }}
                    />
                  </div>
                  {(user.achievementBadges || []).length > 0 && (
                    <p className="text-xs text-[#141715]/80 dark:text-[#B4C0B8] flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#075B35] dark:text-[#34D399]" />
                      Achievements: {(user.achievementBadges || []).join(' · ')}
                    </p>
                  )}
                </div>

                <h2 className="font-display text-base font-bold">
                  Work From Anywhere &amp; Professional Profile
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profForm.fullName}
                      onChange={(e) => setProfForm({ ...profForm, fullName: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Professional Title</label>
                    <input
                      type="text"
                      required
                      value={profForm.title}
                      onChange={(e) => setProfForm({ ...profForm, title: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Category</label>
                    <select
                      value={profForm.category}
                      onChange={(e) => setProfForm({ ...profForm, category: e.target.value })}
                      className={inputClass}
                    >
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
                      value={profForm.country}
                      onChange={(e) => setProfForm({ ...profForm, country: e.target.value })}
                      className={inputClass}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">City</label>
                    <input
                      type="text"
                      value={profForm.city}
                      onChange={(e) => setProfForm({ ...profForm, city: e.target.value })}
                      placeholder="e.g. Nairobi, Harare, London"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Time Zone</label>
                    <select
                      value={profForm.timezone}
                      onChange={(e) => setProfForm({ ...profForm, timezone: e.target.value })}
                      className={inputClass}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Hourly Rate (USD)</label>
                    <input
                      type="number"
                      min={5}
                      value={profForm.hourlyRate}
                      onChange={(e) => setProfForm({ ...profForm, hourlyRate: e.target.value })}
                      className={`${inputClass} font-mono-num`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Availability</label>
                    <select
                      value={profForm.availability}
                      onChange={(e) =>
                        setProfForm({
                          ...profForm,
                          availability: e.target.value as AvailabilityStatus,
                        })
                      }
                      className={inputClass}
                    >
                      <option value="Available Now">Available Now</option>
                      <option value="Open to Offers">Open to Offers</option>
                      <option value="Booked">Booked</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Experience Level</label>
                    <select
                      value={profForm.experienceLevel}
                      onChange={(e) =>
                        setProfForm({
                          ...profForm,
                          experienceLevel: e.target.value as ExperienceLevel,
                        })
                      }
                      className={inputClass}
                    >
                      {EXPERIENCE_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Profile Photograph</label>
                    <select
                      value={profForm.photoUrl}
                      onChange={(e) => setProfForm({ ...profForm, photoUrl: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Initials Monogram</option>
                      {PRESET_PORTRAITS.map((p) => (
                        <option key={p.url} value={p.url}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Working Languages ({profForm.languages.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => {
                      const active = profForm.languages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                            active
                              ? 'bg-[#075B35] text-white border-[#075B35]'
                              : 'border-[#E2E6E3] dark:border-[#2A352E]'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={profForm.skills}
                    onChange={(e) => setProfForm({ ...profForm, skills: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Professional Biography</label>
                  <textarea
                    rows={3}
                    value={profForm.bio}
                    onChange={(e) => setProfForm({ ...profForm, bio: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {/* 30-60s Video Intro Uploader */}
                <div className="pt-4 border-t border-[#E2E6E3] dark:border-[#2A352E] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
                        30–60 Second Video Introduction
                      </h3>
                      <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                        Introduce yourself and showcase communication fluency directly to international clients.
                      </p>
                    </div>
                    <label className="px-3.5 py-2 bg-[#101010] dark:bg-[#1E2621] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 text-[#4ADE80]" />
                      {uploadingVideo ? 'Uploading Video...' : 'Upload MP4 / WebM'}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleUploadIntroVideo}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={profForm.videoIntroUrl}
                    onChange={(e) => setProfForm({ ...profForm, videoIntroUrl: e.target.value })}
                    placeholder="Or paste hosted MP4/WebM video URL (e.g. /uploads/intro.mp4)"
                    className={inputClass}
                  />
                  {profForm.videoIntroUrl && (
                    <video
                      controls
                      preload="metadata"
                      src={profForm.videoIntroUrl}
                      className="w-full max-w-md rounded-xl max-h-56 bg-black border border-[#E2E6E3] dark:border-[#2A352E]"
                    />
                  )}
                </div>

                {/* Portfolio Items Builder */}
                <div className="pt-4 border-t border-[#E2E6E3] dark:border-[#2A352E] space-y-3">
                  <h3 className="font-display text-sm font-bold">Portfolio Case Studies</h3>
                  {portfolioItems.map((pf) => (
                    <div
                      key={pf.id}
                      className="p-3 border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs font-bold">{pf.title}</p>
                        <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                          {pf.summary}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPortfolioItems((prev) => prev.filter((item) => item.id !== pf.id))
                        }
                        className="text-xs text-[#E52525] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newPfTitle}
                      onChange={(e) => setNewPfTitle(e.target.value)}
                      placeholder="Project title"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={newPfSummary}
                      onChange={(e) => setNewPfSummary(e.target.value)}
                      placeholder="Outcome summary"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={handleAddPortfolioItem}
                      className="px-3 py-2 text-xs font-semibold bg-[#101010] dark:bg-[#075B35] text-white rounded-lg"
                    >
                      Add Portfolio Entry
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#008C45] hover:bg-[#075B35] text-white text-sm font-semibold rounded-lg"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </form>
            )}

            {/* CLIENT: JOBS & PROPOSALS */}
            {user.role === 'client' && tab === 'client-jobs' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold">{clientJobs.length}</p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Posted Jobs
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold text-[#075B35] dark:text-[#34D399]">
                      {clientProposals.length}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Proposals Received
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold">
                      {shortlistedFreelancers.length}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Shortlisted Talent
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold text-[#075B35] dark:text-[#34D399]">
                      {teamMembers.length}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Hiring Team Members
                    </p>
                  </div>
                </div>

                {/* Posted Jobs */}
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">Your Posted Job Briefs</h2>
                  {clientJobs.length === 0 ? (
                    <div className="py-4 text-sm text-[#141715]/70 dark:text-[#B4C0B8] space-y-2">
                      <p>You have not posted any projects yet.</p>
                      <button
                        type="button"
                        onClick={onOpenPostJob}
                        className="px-4 py-2 bg-[#E52525] text-white text-xs font-semibold rounded-lg"
                      >
                        Post Your First Job
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clientJobs.map((j) => (
                        <div
                          key={j.id}
                          className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs text-[#075B35] dark:text-[#34D399] font-semibold uppercase">
                              {j.isFeatured ? 'Featured · ' : ''}
                              {j.status.replace('_', ' ')} · {j.category}
                            </p>
                            <h3 className="font-display text-sm font-bold mt-0.5">{j.title}</h3>
                            <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] font-mono-num mt-0.5">
                              ${j.budgetMin}–${j.budgetMax}{' '}
                              {j.budgetType === 'hourly' ? '/hr' : 'fixed'} · Deadline {j.deadline}
                            </p>
                          </div>
                          {j.status === 'open' && (
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {!j.isFeatured && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenPayment({
                                      purpose: 'featured_job',
                                      title: `Promote Featured Job Brief`,
                                      subtitle: `Pin "${j.title}" to top directory search & alerts`,
                                      amountUsd: subSettings.featuredJobUsd || 29,
                                      jobId: j.id,
                                    })
                                  }
                                  className="px-3 py-1.5 bg-[#075B35] text-white text-xs font-semibold rounded-lg"
                                >
                                  Boost Featured (${subSettings.featuredJobUsd || 29})
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.updateJob(j.id, { status: 'closed' });
                                  onNotify('Job listing closed.');
                                  loadData();
                                }}
                                className="px-3 py-1.5 border border-[#E2E6E3] dark:border-[#2A352E] text-xs font-medium rounded-lg hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]"
                              >
                                Close Listing
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Incoming Proposals */}
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">
                    Incoming Freelancer Proposals
                  </h2>
                  {clientProposals.length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      No proposals submitted yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {clientProposals.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <ResilientImage
                                src={p.freelancerPhoto}
                                alt={p.freelancerName}
                                fallbackLabel={p.freelancerName}
                                className="w-11 h-11 rounded-lg object-cover border border-[#E2E6E3] dark:border-[#2A352E]"
                              />
                              <div>
                                <button
                                  type="button"
                                  onClick={() => onSelectFreelancer(p.freelancerId)}
                                  className="font-display text-sm font-bold hover:text-[#075B35] dark:hover:text-[#34D399] hover:underline"
                                >
                                  {p.freelancerName}
                                </button>
                                <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                                  {p.freelancerTitle} · {p.freelancerCountry}
                                </p>
                              </div>
                            </div>
                            <div className="text-xs font-mono-num">
                              <span className="font-bold">${p.proposedRate.toLocaleString()}</span> ·{' '}
                              {p.timeline} ·{' '}
                              <span className="font-semibold uppercase text-[#075B35] dark:text-[#34D399]">
                                {p.status}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs font-medium text-[#141715]/65 dark:text-[#B4C0B8]">
                            Project: {p.jobTitle}
                          </p>
                          <p className="text-sm text-[#141715]/85 dark:text-[#EDF2EE]/90 leading-relaxed">
                            {p.coverLetter}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F4F6F4] dark:border-[#2A352E]">
                            <button
                              type="button"
                              onClick={() => handleUpdateProposal(p.id, 'shortlisted')}
                              className="px-3 py-1.5 text-xs font-semibold border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]"
                            >
                              Shortlist
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateProposal(p.id, 'hired')}
                              className="px-3 py-1.5 text-xs font-semibold bg-[#008C45] text-white rounded-lg"
                            >
                              Hire Freelancer
                            </button>
                            {!escrows.some(
                              (e) =>
                                e.proposalId === p.id &&
                                (e.status === 'funded' ||
                                  e.status === 'released' ||
                                  e.status === 'disputed')
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenPayment({
                                    purpose: 'escrow',
                                    title: `Fund Project Escrow · ${p.freelancerName}`,
                                    subtitle: `Project: ${p.jobTitle}`,
                                    amountUsd: p.proposedRate,
                                    proposalId: p.id,
                                  })
                                }
                                className="px-3 py-1.5 text-xs font-semibold bg-[#101010] dark:bg-[#1E2621] text-white rounded-lg inline-flex items-center gap-1"
                              >
                                <Lock className="w-3 h-3 text-[#4ADE80]" />
                                Fund Escrow (Paynow / Card)
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 text-xs font-semibold text-[#075B35] dark:text-[#34D399]">
                                Escrow Secured
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleUpdateProposal(p.id, 'completed')}
                              className="px-3 py-1.5 text-xs font-semibold bg-[#075B35] text-white rounded-lg"
                            >
                              Mark Completed
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateProposal(p.id, 'declined')}
                              className="px-3 py-1.5 text-xs font-semibold text-[#E52525] border border-[#E52525]/35 rounded-lg"
                            >
                              Decline
                            </button>
                            {(p.status === 'hired' || p.status === 'completed') && (
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewDraft({
                                    freelancerId: p.freelancerId,
                                    freelancerName: p.freelancerName,
                                    jobId: p.jobId,
                                    rating: 5,
                                    comment: '',
                                  })
                                }
                                className="ml-auto px-3 py-1.5 text-xs font-semibold bg-[#101010] dark:bg-[#1E2621] text-white rounded-lg inline-flex items-center gap-1"
                              >
                                <Star className="w-3.5 h-3.5" />
                                Leave Verified Review
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Review Form */}
                  {reviewDraft && (
                    <form
                      onSubmit={handleSubmitReview}
                      className="mt-5 p-5 bg-[#F4F6F4] dark:bg-[#1E2621] rounded-xl border border-[#E2E6E3] dark:border-[#2A352E] space-y-3"
                    >
                      <h3 className="font-display text-sm font-bold">
                        Submit Verified Review for {reviewDraft.freelancerName}
                      </h3>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold">Rating (1–5):</label>
                        <select
                          value={reviewDraft.rating}
                          onChange={(e) =>
                            setReviewDraft({ ...reviewDraft, rating: Number(e.target.value) })
                          }
                          className="px-3 py-1.5 text-sm bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg"
                        >
                          {[5, 4, 3, 2, 1].map((r) => (
                            <option key={r} value={r}>
                              {r} Stars
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        required
                        rows={3}
                        value={reviewDraft.comment}
                        onChange={(e) =>
                          setReviewDraft({ ...reviewDraft, comment: e.target.value })
                        }
                        placeholder="Share specific feedback on quality, reliability, and communication..."
                        className={inputClass}
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#075B35] text-white text-xs font-semibold rounded-lg"
                        >
                          Publish Verified Review
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewDraft(null)}
                          className="px-4 py-2 border border-[#E2E6E3] dark:border-[#2A352E] bg-white dark:bg-[#171D19] text-xs font-medium rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}

            {/* CLIENT: INTERVIEWS, PROJECT TASKS, TEAM ACCOUNTS & BUSINESS ADS */}
            {user.role === 'client' && tab === 'client-collab' && (
              <div className="space-y-6">
                {renderInterviewsAndTasks()}

                {/* Team Accounts */}
                <div className={`${cardClass} p-6 space-y-4`}>
                  <h2 className="font-display text-base font-bold flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
                    Organization Team Accounts ({teamMembers.length})
                  </h2>
                  <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                    Collaborate across multiple hiring managers, finance approvers, and project leads.
                  </p>
                  <form onSubmit={handleAddTeamMember} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      required
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Colleague Name"
                      className={inputClass}
                    />
                    <input
                      type="email"
                      required
                      value={newTeamEmail}
                      onChange={(e) => setNewTeamEmail(e.target.value)}
                      placeholder="work@company.com"
                      className={inputClass}
                    />
                    <select
                      value={newTeamRole}
                      onChange={(e) => setNewTeamRole(e.target.value as TeamMember['role'])}
                      className={inputClass}
                    >
                      <option value="Hiring Manager">Hiring Manager</option>
                      <option value="Finance Approver">Finance Approver</option>
                      <option value="Reviewer">Reviewer</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#075B35] text-white text-xs font-semibold rounded-lg"
                    >
                      Add Team Member
                    </button>
                  </form>

                  {teamMembers.length > 0 && (
                    <div className="divide-y divide-[#F4F6F4] dark:divide-[#2A352E]">
                      {teamMembers.map((tm) => (
                        <div key={tm.id} className="py-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold">{tm.name}</p>
                            <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                              {tm.email} · {tm.role}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await api.removeTeamMember(tm.id);
                              setTeamMembers(res.teamMembers);
                              onNotify('Team member removed.');
                            }}
                            className="p-2 text-[#E52525] hover:bg-[#E52525]/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Business Advertising */}
                <div className={`${cardClass} p-6 space-y-4`}>
                  <h2 className="font-display text-base font-bold flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#E52525]" />
                    Business Advertising &amp; Partner Spotlights
                  </h2>
                  <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                    Promote relevant enterprise services, fintech APIs, or B2B tools to African freelancers and employers.
                  </p>
                  <form onSubmit={handleCreateAd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={newAdTitle}
                      onChange={(e) => setNewAdTitle(e.target.value)}
                      placeholder="Campaign Headline (e.g. Zero-Fee Corporate FX)"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={newAdCta}
                      onChange={(e) => setNewAdCta(e.target.value)}
                      placeholder="CTA Label (e.g. Open Account)"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      required
                      value={newAdSummary}
                      onChange={(e) => setNewAdSummary(e.target.value)}
                      placeholder="Concise value proposition..."
                      className={`sm:col-span-2 ${inputClass}`}
                    />
                    <input
                      type="url"
                      value={newAdUrl}
                      onChange={(e) => setNewAdUrl(e.target.value)}
                      placeholder="https://company.com"
                      className={inputClass}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#E52525] text-white text-xs font-bold rounded-lg"
                    >
                      Launch Business Spotlight ($99)
                    </button>
                  </form>

                  {ads.filter((a) => a.advertiserId === user.id).length > 0 && (
                    <div className="pt-2 space-y-2">
                      {ads
                        .filter((a) => a.advertiserId === user.id)
                        .map((ad) => (
                          <div
                            key={ad.id}
                            className="p-3.5 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="text-xs font-bold uppercase text-[#075B35] dark:text-[#34D399]">
                                {ad.status} · {ad.placement}
                              </p>
                              <p className="text-sm font-bold">{ad.title}</p>
                            </div>
                            <span className="font-mono-num text-xs font-bold">
                              ${ad.budgetUsd}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SHARED: ESCROW, MILESTONES, DISPUTES & PAYMENT GATEWAYS */}
            {tab === 'payments' && (
              <div className="space-y-6">
                {/* Summary KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={`${cardClass} p-5`}>
                    <p className="font-mono-num text-2xl font-bold text-[#075B35] dark:text-[#34D399]">
                      $
                      {escrows
                        .filter((e) => e.status === 'funded')
                        .reduce((acc, e) => acc + e.grossAmountUsd, 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Protected in Active Escrow
                    </p>
                  </div>
                  <div className={`${cardClass} p-5`}>
                    <p className="font-mono-num text-2xl font-bold">
                      $
                      {escrows
                        .filter((e) => e.status === 'released')
                        .reduce(
                          (acc, e) =>
                            acc + (user.role === 'freelancer' ? e.netPayoutUsd : e.grossAmountUsd),
                          0
                        )
                        .toLocaleString()}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      {user.role === 'freelancer'
                        ? 'Released Net Payouts'
                        : 'Released Escrow Volume'}
                    </p>
                  </div>
                  <div className={`${cardClass} p-5 flex items-center justify-between gap-3`}>
                    <div>
                      <p className="font-display text-lg font-bold uppercase text-[#075B35] dark:text-[#34D399]">
                        {user.subscriptionTier}
                      </p>
                      <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                        Membership · {subSettings.commissionPercent}% Commission
                      </p>
                    </div>
                    {user.role !== 'admin' &&
                      ((user.role === 'freelancer' && user.subscriptionTier === 'standard') ||
                        (user.role === 'client' && user.subscriptionTier !== 'enterprise')) && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenPayment({
                              purpose: 'subscription',
                              title:
                                user.role === 'client'
                                  ? 'Upgrade to Client Enterprise'
                                  : 'Upgrade to Freelancer Pro',
                              subtitle:
                                user.role === 'client'
                                  ? 'Priority hiring tools, team accounts, and dedicated invoicing.'
                                  : 'Featured directory ranking, Pro badge, and priority proposals.',
                              amountUsd:
                                user.role === 'client'
                                  ? subSettings.clientEnterpriseMonthlyUsd
                                  : subSettings.freelancerProMonthlyUsd,
                              targetTier: user.role === 'client' ? 'enterprise' : 'pro',
                            })
                          }
                          className="px-3.5 py-2 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-semibold rounded-lg shrink-0"
                        >
                          Upgrade
                        </button>
                      )}
                  </div>
                </div>

                {/* Supported Payment Gateways Status */}
                <div className={`${cardClass} p-6 space-y-4`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E6E3] dark:border-[#2A352E]">
                    <div>
                      <h2 className="font-display text-base font-bold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
                        Integrated Payment Gateways
                      </h2>
                      <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                        Paynow (EcoCash, OneMoney, InnBucks &amp; Cards), Paystack, Flutterwave, and
                        Stripe server-signed rails.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono-num text-[#141715]/60 dark:text-[#B4C0B8]">
                      Webhook: /api/payments/paynow/result
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {gateways.map((gw) => (
                      <div
                        key={gw.id}
                        className="p-4 rounded-xl border border-[#E2E6E3] dark:border-[#2A352E] bg-[#F4F6F4]/50 dark:bg-[#1E2621]/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-bold">{gw.name}</span>
                          <span
                            className={`text-[11px] font-semibold uppercase ${
                              gw.configured
                                ? 'text-[#008C45] dark:text-[#34D399]'
                                : 'text-[#141715]/60 dark:text-[#B4C0B8]'
                            }`}
                          >
                            {gw.configured ? 'Live API Active' : 'Sandbox Evaluation'}
                          </span>
                        </div>
                        <p className="text-xs text-[#075B35] dark:text-[#34D399] font-medium">
                          {gw.region} · {gw.currencies.join(', ')}
                        </p>
                        <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] leading-relaxed">
                          {gw.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Escrow Contracts with Milestones & Dispute Resolution */}
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">
                    Project Escrow Contracts &amp; Milestones ({escrows.length})
                  </h2>
                  {escrows.length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      {user.role === 'client'
                        ? 'No escrow contracts yet. Open Jobs & Proposals and click "Fund Escrow" on any freelancer proposal.'
                        : 'No project escrow contracts assigned yet.'}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {escrows.map((esc) => (
                        <div
                          key={esc.id}
                          className="p-4 rounded-xl border border-[#E2E6E3] dark:border-[#2A352E] space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p
                                className={`text-xs font-semibold uppercase ${
                                  esc.status === 'disputed'
                                    ? 'text-[#E52525]'
                                    : 'text-[#075B35] dark:text-[#34D399]'
                                }`}
                              >
                                {esc.gateway} · {esc.status}
                                {esc.isSandbox ? ' (Sandbox)' : ''}
                              </p>
                              <h3 className="font-display text-sm font-bold mt-0.5">{esc.jobTitle}</h3>
                              <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] mt-0.5 font-mono-num">
                                Client: {esc.clientName} · Freelancer: {esc.freelancerName} · Gross $
                                {esc.grossAmountUsd.toLocaleString()} · Net Payout $
                                {esc.netPayoutUsd.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {(user.role === 'client' || user.role === 'admin') &&
                                esc.status === 'funded' && (
                                  <button
                                    type="button"
                                    disabled={releasingEscrowId === esc.id}
                                    onClick={() => handleReleaseEscrow(esc.id)}
                                    className="px-3.5 py-2 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-semibold rounded-lg disabled:opacity-60"
                                  >
                                    {releasingEscrowId === esc.id
                                      ? 'Releasing...'
                                      : 'Release Full Escrow'}
                                  </button>
                                )}
                              {esc.status === 'funded' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDisputeDraft({
                                      escrowId: esc.id,
                                      reason: 'Deliverable scope disagreement',
                                      details: '',
                                    })
                                  }
                                  className="px-3 py-2 border border-[#E52525]/45 text-[#E52525] text-xs font-semibold rounded-lg inline-flex items-center gap-1"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Open Dispute
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Milestone Breakdown */}
                          {esc.milestones && esc.milestones.length > 0 && (
                            <div className="pt-3 border-t border-[#F4F6F4] dark:border-[#2A352E] space-y-2">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-[#141715]/60 dark:text-[#B4C0B8]">
                                Contract Milestones
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {esc.milestones.map((ms) => (
                                  <div
                                    key={ms.id}
                                    className="p-3 rounded-lg bg-[#F4F6F4]/65 dark:bg-[#1E2621] border border-[#E2E6E3] dark:border-[#2A352E] flex items-center justify-between gap-2"
                                  >
                                    <div>
                                      <p className="text-xs font-bold">{ms.title}</p>
                                      <p className="text-[11px] font-mono-num text-[#141715]/70 dark:text-[#B4C0B8]">
                                        ${ms.amountUsd.toLocaleString()} · {ms.status.toUpperCase()}
                                      </p>
                                    </div>
                                    {(user.role === 'client' || user.role === 'admin') &&
                                      esc.status === 'funded' &&
                                      ms.status === 'funded' && (
                                        <button
                                          type="button"
                                          disabled={releasingEscrowId === ms.id}
                                          onClick={() => handleReleaseMilestone(esc.id, ms.id)}
                                          className="px-2.5 py-1 bg-[#075B35] text-white text-[11px] font-semibold rounded"
                                        >
                                          Release
                                        </button>
                                      )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Active Dispute Summary */}
                          {esc.dispute && (
                            <div className="p-3 rounded-lg bg-[#E52525]/10 border border-[#E52525]/35 text-xs space-y-1">
                              <p className="font-bold text-[#E52525]">
                                Dispute ({esc.dispute.status.toUpperCase()}) · Raised by{' '}
                                {esc.dispute.raisedByName}: {esc.dispute.reason}
                              </p>
                              {esc.dispute.details && <p>{esc.dispute.details}</p>}
                              {esc.dispute.resolutionNote && (
                                <p className="font-semibold text-[#075B35] dark:text-[#34D399]">
                                  Resolution: {esc.dispute.resolutionNote}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Dispute Modal Form */}
                  {disputeDraft && (
                    <form
                      onSubmit={handleSubmitDispute}
                      className="mt-4 p-4 rounded-xl border border-[#E52525]/40 bg-[#E52525]/5 space-y-3"
                    >
                      <h3 className="font-display text-sm font-bold text-[#E52525]">
                        File Structured Escrow Dispute
                      </h3>
                      <input
                        type="text"
                        required
                        value={disputeDraft.reason}
                        onChange={(e) =>
                          setDisputeDraft({ ...disputeDraft, reason: e.target.value })
                        }
                        placeholder="Dispute reason"
                        className={inputClass}
                      />
                      <textarea
                        rows={2}
                        required
                        value={disputeDraft.details}
                        onChange={(e) =>
                          setDisputeDraft({ ...disputeDraft, details: e.target.value })
                        }
                        placeholder="Summarize timeline, deliverables, and requested resolution..."
                        className={inputClass}
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#E52525] text-white text-xs font-semibold rounded-lg"
                        >
                          Submit Dispute to Mediation
                        </button>
                        <button
                          type="button"
                          onClick={() => setDisputeDraft(null)}
                          className="px-4 py-2 border border-[#E2E6E3] dark:border-[#2A352E] text-xs font-medium rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Transactions Ledger */}
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">
                    Payment Transaction Ledger ({transactions.length})
                  </h2>
                  {transactions.length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      No payment transactions recorded yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E2E6E3] dark:border-[#2A352E] text-[#141715]/65 dark:text-[#B4C0B8]">
                            <th className="py-2.5 pr-3">Reference</th>
                            <th className="py-2.5 px-3">Gateway / Channel</th>
                            <th className="py-2.5 px-3">Purpose</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 pl-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx) => (
                            <tr
                              key={tx.id}
                              className="border-b border-[#F4F6F4] dark:border-[#2A352E] last:border-b-0"
                            >
                              <td className="py-3 pr-3 font-mono-num font-semibold">
                                {tx.reference}
                              </td>
                              <td className="py-3 px-3 uppercase">
                                {tx.gateway} · {tx.paymentMethod}
                              </td>
                              <td className="py-3 px-3">
                                {tx.jobTitle ||
                                  (tx.targetTier
                                    ? `${tx.targetTier.toUpperCase()} Membership`
                                    : tx.purpose.replace('_', ' '))}
                              </td>
                              <td className="py-3 px-3 text-right font-mono-num font-bold">
                                ${tx.amountUsd.toLocaleString()} {tx.currency}
                              </td>
                              <td className="py-3 pl-3 uppercase font-semibold text-[#075B35] dark:text-[#34D399]">
                                {tx.status}
                                {tx.isSandbox ? ' · Sandbox' : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CLIENT: SHORTLIST & HIRE AGAIN */}
            {user.role === 'client' && tab === 'client-shortlist' && (
              <div className="space-y-6">
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#075B35] dark:text-[#34D399]" />
                    Hire Again — Previous Freelancers ({pastFreelancers.length})
                  </h2>
                  {pastFreelancers.length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      Freelancers you have previously hired or worked with appear here for instant re-hiring.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {pastFreelancers.map((item) => (
                        <div
                          key={item.freelancer.id}
                          className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ResilientImage
                              src={item.freelancer.photoUrl}
                              alt={item.freelancer.fullName}
                              fallbackLabel={item.freelancer.fullName}
                              className="w-12 h-12 rounded-lg object-cover border border-[#E2E6E3] dark:border-[#2A352E] shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-display text-sm font-bold truncate">
                                {item.freelancer.fullName}
                              </p>
                              <p className="text-xs text-[#075B35] dark:text-[#34D399] truncate">
                                {item.lastJobTitle}
                              </p>
                              <p className="text-xs font-mono-num text-[#141715]/70 dark:text-[#B4C0B8]">
                                Last rate ${item.lastRate.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectFreelancer(item.freelancer.id)}
                            className="px-3 py-1.5 bg-[#E52525] text-white text-xs font-semibold rounded-lg shrink-0"
                          >
                            Hire Again
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">
                    Shortlisted African &amp; Global Freelancers
                  </h2>
                  {shortlistedFreelancers.length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      No freelancers shortlisted yet. Browse Hire Freelancers to save candidates here.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {shortlistedFreelancers.map((fl) => (
                        <div
                          key={fl.id}
                          className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <ResilientImage
                              src={fl.photoUrl}
                              alt={fl.fullName}
                              fallbackLabel={fl.fullName}
                              className="w-12 h-12 rounded-lg object-cover border border-[#E2E6E3] dark:border-[#2A352E]"
                            />
                            <div>
                              <p className="font-display text-sm font-bold">{fl.fullName}</p>
                              <p className="text-xs text-[#075B35] dark:text-[#34D399]">
                                {fl.title}
                              </p>
                              <p className="text-xs font-mono-num text-[#141715]/70 dark:text-[#B4C0B8]">
                                ${fl.hourlyRate}/hr · {fl.country}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectFreelancer(fl.id)}
                            className="px-3 py-1.5 bg-[#075B35] text-white text-xs font-semibold rounded-lg shrink-0"
                          >
                            View / Invite
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SHARED: DIRECT MESSAGING WITH FILE ATTACHMENTS & PRICE QUOTES */}
            {tab === 'messages' && (
              <div
                className={`${cardClass} overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[500px]`}
              >
                <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#E2E6E3] dark:border-[#2A352E] p-4 space-y-2">
                  <h2 className="font-display text-sm font-bold pb-2 border-b border-[#E2E6E3] dark:border-[#2A352E]">
                    Contacts
                  </h2>
                  <div className="space-y-1 max-h-[420px] overflow-y-auto">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedContactId(c.id)}
                        className={`w-full p-2.5 rounded-lg text-left transition-colors ${
                          selectedContactId === c.id
                            ? 'bg-[#075B35] text-white'
                            : 'hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]'
                        }`}
                      >
                        <p className="text-xs font-bold truncate">{c.fullName}</p>
                        <p
                          className={`text-[11px] truncate ${
                            selectedContactId === c.id
                              ? 'text-white/80'
                              : 'text-[#141715]/65 dark:text-[#B4C0B8]'
                          }`}
                        >
                          {c.role === 'client' ? c.companyName : c.title || c.category}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-8 flex flex-col justify-between p-4">
                  <div className="space-y-3 overflow-y-auto max-h-96 pr-1">
                    {conversationMessages.length === 0 ? (
                      <p className="text-sm text-[#141715]/60 dark:text-[#B4C0B8] py-8 text-center">
                        No messages with this contact yet. Send a message, attach files, or propose a price quote below.
                      </p>
                    ) : (
                      conversationMessages.map((m) => {
                        const mine = m.senderId === user.id;
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[82%] px-4 py-2.5 rounded-xl text-sm leading-relaxed space-y-2 ${
                                mine
                                  ? 'bg-[#075B35] text-white'
                                  : 'bg-[#F4F6F4] dark:bg-[#1E2621] border border-[#E2E6E3] dark:border-[#2A352E]'
                              }`}
                            >
                              <p>{m.body}</p>

                              {m.attachment && (
                                <a
                                  href={m.attachment.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`block p-2 rounded-lg text-xs font-semibold underline ${
                                    mine ? 'bg-black/20 text-white' : 'bg-white dark:bg-[#171D19]'
                                  }`}
                                >
                                  📎 {m.attachment.name} (
                                  {Math.max(1, Math.round(m.attachment.sizeBytes / 1024))} KB)
                                </a>
                              )}

                              {m.quote && (
                                <div
                                  className={`p-2.5 rounded-lg text-xs space-y-1.5 ${
                                    mine
                                      ? 'bg-black/20 text-white'
                                      : 'bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E]'
                                  }`}
                                >
                                  <p className="font-mono-num font-bold">
                                    Price Quote: ${m.quote.amountUsd.toLocaleString()} ·{' '}
                                    {m.quote.timeline}
                                  </p>
                                  <p className="uppercase font-semibold text-[11px]">
                                    Status: {m.quote.status}
                                  </p>
                                  {!mine && m.quote.status === 'proposed' && (
                                    <div className="flex gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleRespondQuote(m.id, 'accepted')}
                                        className="px-2.5 py-1 bg-[#008C45] text-white font-semibold rounded"
                                      >
                                        Accept Quote
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRespondQuote(m.id, 'declined')}
                                        className="px-2.5 py-1 bg-[#E52525] text-white font-semibold rounded"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] text-[#141715]/55 dark:text-[#B4C0B8] mt-1">
                              {m.senderName} ·{' '}
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form
                    onSubmit={handleSendMessage}
                    className="pt-4 mt-4 border-t border-[#E2E6E3] dark:border-[#2A352E] space-y-2.5"
                  >
                    {pendingAttachment && (
                      <div className="px-3 py-1.5 rounded-lg bg-[#F4F6F4] dark:bg-[#1E2621] text-xs flex items-center justify-between">
                        <span>Attached: {pendingAttachment.name}</span>
                        <button
                          type="button"
                          onClick={() => setPendingAttachment(null)}
                          className="text-[#E52525] font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {quoteComposerOpen && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg bg-[#F4F6F4] dark:bg-[#1E2621] border border-[#E2E6E3] dark:border-[#2A352E]">
                        <input
                          type="number"
                          min={10}
                          value={quoteAmountUsd}
                          onChange={(e) => setQuoteAmountUsd(e.target.value)}
                          placeholder="Negotiated Rate (USD)"
                          className={`${inputClass} font-mono-num`}
                        />
                        <input
                          type="text"
                          value={quoteTimeline}
                          onChange={(e) => setQuoteTimeline(e.target.value)}
                          placeholder="Timeline (e.g. 3 weeks)"
                          className={inputClass}
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-2.5 border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1 hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]">
                        <Paperclip className="w-3.5 h-3.5" />
                        {uploadingAttachment ? 'Uploading...' : 'File'}
                        <input
                          type="file"
                          onChange={handleUploadMessageFile}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setQuoteComposerOpen(!quoteComposerOpen)}
                        className={`px-3 py-2.5 border rounded-lg text-xs font-semibold ${
                          quoteComposerOpen
                            ? 'border-[#075B35] bg-[#075B35]/10 text-[#075B35] dark:text-[#34D399]'
                            : 'border-[#E2E6E3] dark:border-[#2A352E]'
                        }`}
                      >
                        Price Quote
                      </button>
                      <input
                        type="text"
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        placeholder="Write a message or negotiate scope..."
                        className={`flex-1 min-w-[160px] ${inputClass}`}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ADMIN: ANALYTICS & ACTIVITY */}
            {user.role === 'admin' && tab === 'admin-overview' && adminStats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold text-[#075B35] dark:text-[#34D399]">
                      {adminStats.freelancersCount}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Active Freelancers
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold">
                      {adminUsers.filter((u) => u.role === 'client').length}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Registered Clients
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold">{adminJobs.length}</p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Total Jobs
                    </p>
                  </div>
                  <div className={`${cardClass} p-4`}>
                    <p className="font-mono-num text-2xl font-bold text-[#E52525]">
                      {adminReports.filter((r) => r.status === 'open').length + disputedEscrowsCount}
                    </p>
                    <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                      Open Reports &amp; Disputes
                    </p>
                  </div>
                </div>

                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">
                    Platform Activity Audit Log
                  </h2>
                  <div className="space-y-2.5 max-h-80 overflow-y-auto">
                    {adminActivity.map((act) => (
                      <div
                        key={act.id}
                        className="py-2 border-b border-[#F4F6F4] dark:border-[#2A352E] flex items-center justify-between gap-4 text-xs"
                      >
                        <div>
                          <span className="font-semibold">{act.actorName}</span>{' '}
                          <span className="text-[#141715]/75 dark:text-[#B4C0B8]">
                            {act.action}:
                          </span>{' '}
                          <span className="font-medium text-[#075B35] dark:text-[#34D399]">
                            {act.target}
                          </span>
                        </div>
                        <span className="font-mono-num text-[#141715]/55 dark:text-[#B4C0B8] shrink-0">
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ADMIN: USERS, VERIFICATION & GAMIFICATION RECOGNITION */}
            {user.role === 'admin' && tab === 'admin-users' && (
              <div className={`${cardClass} p-6`}>
                <h2 className="font-display text-base font-bold mb-4">
                  Manage Freelancers, Verification Badges &amp; Recognition
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E6E3] dark:border-[#2A352E] text-[#141715]/65 dark:text-[#B4C0B8]">
                        <th className="py-2.5 pr-3">Account</th>
                        <th className="py-2.5 px-3">Role / Country</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 pl-3 text-right">Governance &amp; Badges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers
                        .filter((u) => u.role !== 'admin')
                        .map((u) => (
                          <tr
                            key={u.id}
                            className="border-b border-[#F4F6F4] dark:border-[#2A352E]"
                          >
                            <td className="py-3 pr-3">
                              <p className="font-semibold">{u.fullName}</p>
                              <p className="text-[#141715]/60 dark:text-[#B4C0B8]">
                                {u.email} · {u.subscriptionTier.toUpperCase()}
                              </p>
                            </td>
                            <td className="py-3 px-3 uppercase">
                              {u.role} · {u.country}
                            </td>
                            <td className="py-3 px-3 font-semibold">
                              <span
                                className={
                                  u.status === 'active'
                                    ? 'text-[#008C45] dark:text-[#34D399]'
                                    : 'text-[#E52525]'
                                }
                              >
                                {u.status}
                              </span>
                            </td>
                            <td className="py-3 pl-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.adminUpdateUser(u.id, {
                                    identityVerified: !u.identityVerified,
                                    verifiedProfile: !u.identityVerified,
                                  });
                                  loadData();
                                }}
                                className={`px-2 py-1 border rounded ${
                                  u.identityVerified
                                    ? 'bg-[#075B35] text-white border-[#075B35]'
                                    : 'border-[#E2E6E3] dark:border-[#2A352E]'
                                }`}
                              >
                                ID
                              </button>
                              {u.role === 'freelancer' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.adminUpdateUser(u.id, {
                                        skillsVerified: !u.skillsVerified,
                                      });
                                      loadData();
                                    }}
                                    className={`px-2 py-1 border rounded ${
                                      u.skillsVerified
                                        ? 'bg-[#008C45] text-white border-[#008C45]'
                                        : 'border-[#E2E6E3] dark:border-[#2A352E]'
                                    }`}
                                  >
                                    Skills
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.adminUpdateUser(u.id, {
                                        isFeaturedProfile: !u.isFeaturedProfile,
                                      });
                                      loadData();
                                    }}
                                    className={`px-2 py-1 border rounded ${
                                      u.isFeaturedProfile
                                        ? 'bg-[#101010] text-white border-[#101010]'
                                        : 'border-[#E2E6E3] dark:border-[#2A352E]'
                                    }`}
                                  >
                                    Featured
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.adminUpdateUser(u.id, {
                                        freelancerOfTheMonth: !u.freelancerOfTheMonth,
                                      });
                                      loadData();
                                    }}
                                    className={`px-2 py-1 border rounded ${
                                      u.freelancerOfTheMonth
                                        ? 'bg-[#E52525] text-white border-[#E52525]'
                                        : 'border-[#E2E6E3] dark:border-[#2A352E]'
                                    }`}
                                  >
                                    FOTM
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.adminUpdateUser(u.id, {
                                    status: u.status === 'active' ? 'suspended' : 'active',
                                  });
                                  loadData();
                                }}
                                className="px-2 py-1 border border-[#E2E6E3] dark:border-[#2A352E] rounded"
                              >
                                {u.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ADMIN: JOBS & PROPOSALS */}
            {user.role === 'admin' && tab === 'admin-jobs' && (
              <div className="space-y-6">
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">Moderate Job Listings</h2>
                  <div className="space-y-3">
                    {adminJobs.map((j) => (
                      <div
                        key={j.id}
                        className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8]">
                            {j.isFeatured ? 'FEATURED · ' : ''}
                            {j.companyName} · {j.category} ·{' '}
                            <span className="font-semibold uppercase text-[#075B35] dark:text-[#34D399]">
                              {j.status}
                            </span>
                          </p>
                          <h3 className="font-display text-sm font-bold mt-0.5">{j.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await api.adminUpdateJob(j.id, { isFeatured: !j.isFeatured });
                              loadData();
                            }}
                            className="px-3 py-1.5 text-xs font-semibold border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg"
                          >
                            {j.isFeatured ? 'Unfeature' : 'Feature'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.adminUpdateJob(j.id, { status: 'open' });
                              loadData();
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#008C45] text-white rounded-lg"
                          >
                            Approve / Open
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.adminUpdateJob(j.id, { status: 'closed' });
                              loadData();
                            }}
                            className="px-3 py-1.5 text-xs font-semibold border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">
                    All Platform Applications &amp; Proposals ({adminProposals.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E2E6E3] dark:border-[#2A352E] text-[#141715]/65 dark:text-[#B4C0B8]">
                          <th className="py-2 pr-3">Freelancer</th>
                          <th className="py-2 px-3">Project</th>
                          <th className="py-2 px-3 text-right">Rate</th>
                          <th className="py-2 pl-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminProposals.map((p) => (
                          <tr
                            key={p.id}
                            className="border-b border-[#F4F6F4] dark:border-[#2A352E]"
                          >
                            <td className="py-2.5 pr-3 font-medium">{p.freelancerName}</td>
                            <td className="py-2.5 px-3">{p.jobTitle}</td>
                            <td className="py-2.5 px-3 text-right font-mono-num">
                              ${p.proposedRate}
                            </td>
                            <td className="py-2.5 pl-3 uppercase font-semibold text-[#075B35] dark:text-[#34D399]">
                              {p.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN: CATEGORIES */}
            {user.role === 'admin' && tab === 'admin-categories' && (
              <div className={`${cardClass} p-6 space-y-5`}>
                <h2 className="font-display text-base font-bold">
                  Manage Freelance Categories ({adminCategories.length})
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="New category name"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Short description"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newCatName.trim()) return;
                      await api.adminAddCategory(newCatName, newCatDesc);
                      setNewCatName('');
                      setNewCatDesc('');
                      loadData();
                    }}
                    className="px-4 py-2 bg-[#075B35] text-white text-xs font-semibold rounded-lg"
                  >
                    Add Category
                  </button>
                </div>

                <div className="divide-y divide-[#F4F6F4] dark:divide-[#2A352E]">
                  {adminCategories.map((c) => (
                    <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold">{c.name}</p>
                        <p className="text-xs text-[#141715]/70 dark:text-[#B4C0B8]">
                          {c.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.adminDeleteCategory(c.id);
                          loadData();
                        }}
                        aria-label={`Delete ${c.name}`}
                        className="p-2 text-[#E52525] hover:bg-[#E52525]/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADMIN: DISPUTES, ADS, REPORTS & PRICING */}
            {user.role === 'admin' && tab === 'admin-moderation' && (
              <div className="space-y-6">
                {/* Escrow Disputes Resolution */}
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#E52525]" />
                    Escrow Disputes Mediation Queue
                  </h2>
                  {escrows.filter((e) => e.status === 'disputed' || e.dispute).length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
                      No escrow disputes currently open.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {escrows
                        .filter((e) => e.status === 'disputed' || e.dispute)
                        .map((esc) => (
                          <div
                            key={esc.id}
                            className="p-4 border border-[#E52525]/35 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <p className="text-xs font-bold uppercase text-[#E52525]">
                                {esc.status} · ${esc.grossAmountUsd.toLocaleString()} Escrow
                              </p>
                              <p className="text-sm font-bold">{esc.jobTitle}</p>
                              <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8]">
                                {esc.dispute?.reason} — {esc.dispute?.details}
                              </p>
                            </div>
                            {esc.status === 'disputed' && (
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api.adminResolveEscrowDispute(
                                      esc.id,
                                      'release',
                                      'Administrator reviewed deliverables and released funds to freelancer.'
                                    );
                                    onNotify('Dispute resolved: released to freelancer.');
                                    loadData();
                                  }}
                                  className="px-3 py-1.5 bg-[#008C45] text-white text-xs font-semibold rounded-lg"
                                >
                                  Release to Freelancer
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api.adminResolveEscrowDispute(
                                      esc.id,
                                      'refund',
                                      'Administrator approved refund back to client escrow.'
                                    );
                                    onNotify('Dispute resolved: refunded to client.');
                                    loadData();
                                  }}
                                  className="px-3 py-1.5 bg-[#E52525] text-white text-xs font-semibold rounded-lg"
                                >
                                  Refund Client
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Business Advertising Campaigns Moderation */}
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">
                    Business Advertising Campaigns ({adminAds.length})
                  </h2>
                  <div className="space-y-3">
                    {adminAds.map((ad) => (
                      <div
                        key={ad.id}
                        className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase text-[#075B35] dark:text-[#34D399]">
                            {ad.advertiserName} · {ad.status} · ${ad.budgetUsd}
                          </p>
                          <p className="text-sm font-bold">{ad.title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await api.adminToggleAd(
                              ad.id,
                              ad.status === 'active' ? 'paused' : 'active'
                            );
                            loadData();
                          }}
                          className="px-3 py-1.5 border border-[#E2E6E3] dark:border-[#2A352E] text-xs font-semibold rounded-lg"
                        >
                          {ad.status === 'active' ? 'Pause Ad' : 'Activate Ad'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reported Accounts & Listings */}
                <div className={`${cardClass} p-6`}>
                  <h2 className="font-display text-base font-bold mb-4">
                    Reported Accounts &amp; Listings
                  </h2>
                  {adminReports.length === 0 ? (
                    <p className="text-sm text-[#141715]/65 dark:text-[#B4C0B8] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#008C45] dark:text-[#34D399]" />
                      No pending reports in queue.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {adminReports.map((r) => (
                        <div
                          key={r.id}
                          className="p-4 border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs uppercase font-semibold text-[#E52525]">
                              {r.targetType} · {r.status}
                            </p>
                            <p className="text-sm font-bold mt-0.5">{r.targetLabel}</p>
                            <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] mt-0.5">
                              Reason: {r.reason} (reported by {r.reporterName})
                            </p>
                          </div>
                          {r.status === 'open' && (
                            <div className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.adminUpdateReport(r.id, 'resolved');
                                  loadData();
                                }}
                                className="px-3 py-1.5 bg-[#075B35] text-white text-xs font-semibold rounded-lg"
                              >
                                Resolve
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.adminUpdateReport(r.id, 'dismissed');
                                  loadData();
                                }}
                                className="px-3 py-1.5 border border-[#E2E6E3] dark:border-[#2A352E] text-xs font-semibold rounded-lg"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Commission, Subscriptions & Featured Pricing */}
                <div className={`${cardClass} p-6 space-y-4`}>
                  <h2 className="font-display text-base font-bold">
                    Commission, Subscriptions &amp; Featured Pricing
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Commission (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={subSettings.commissionPercent}
                        onChange={(e) =>
                          setSubSettings({
                            ...subSettings,
                            commissionPercent: Number(e.target.value),
                          })
                        }
                        className={`${inputClass} font-mono-num`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Pro ($/mo)</label>
                      <input
                        type="number"
                        min={0}
                        value={subSettings.freelancerProMonthlyUsd}
                        onChange={(e) =>
                          setSubSettings({
                            ...subSettings,
                            freelancerProMonthlyUsd: Number(e.target.value),
                          })
                        }
                        className={`${inputClass} font-mono-num`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Enterprise ($/mo)</label>
                      <input
                        type="number"
                        min={0}
                        value={subSettings.clientEnterpriseMonthlyUsd}
                        onChange={(e) =>
                          setSubSettings({
                            ...subSettings,
                            clientEnterpriseMonthlyUsd: Number(e.target.value),
                          })
                        }
                        className={`${inputClass} font-mono-num`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Featured Job ($)</label>
                      <input
                        type="number"
                        min={0}
                        value={subSettings.featuredJobUsd || 29}
                        onChange={(e) =>
                          setSubSettings({
                            ...subSettings,
                            featuredJobUsd: Number(e.target.value),
                          })
                        }
                        className={`${inputClass} font-mono-num`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Featured Profile ($)</label>
                      <input
                        type="number"
                        min={0}
                        value={subSettings.featuredProfileUsd || 25}
                        onChange={(e) =>
                          setSubSettings({
                            ...subSettings,
                            featuredProfileUsd: Number(e.target.value),
                          })
                        }
                        className={`${inputClass} font-mono-num`}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.adminUpdateSubscriptions(subSettings);
                      onNotify('Commission and pricing settings updated.');
                      loadData();
                    }}
                    className="px-4 py-2 bg-[#075B35] text-white text-xs font-semibold rounded-lg"
                  >
                    Save Pricing Governance
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
