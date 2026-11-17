export type UserRole = 'freelancer' | 'client' | 'admin';

export type AvailabilityStatus = 'Available Now' | 'Open to Offers' | 'Booked';

export type ExperienceLevel = 'Entry' | 'Intermediate' | 'Senior' | 'Executive';

export type JobType =
  | 'Remote'
  | 'Part-time'
  | 'Full-time'
  | 'Contract'
  | 'Freelance project'
  | 'Fixed-price'
  | 'Hourly';

export type SubscriptionTier = 'standard' | 'pro' | 'enterprise';

export interface PortfolioItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  link?: string;
}

export interface ProjectAlertPreferences {
  enabled: boolean;
  categories: string[];
  keywords: string[];
  minBudget: number;
  remoteOnly: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Hiring Manager' | 'Finance Approver' | 'Reviewer';
  status: 'active' | 'invited';
  addedAt: string;
}

export interface PublicUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  country: string;
  city?: string;
  languages?: string[];
  timezone?: string;
  role: UserRole;
  status: 'active' | 'suspended';
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  isDemo?: boolean;
  verifiedProfile?: boolean;
  identityVerified?: boolean;
  skillsVerified?: boolean;
  certifiedSkills?: string[];
  isFeaturedProfile?: boolean;
  freelancerOfTheMonth?: boolean;
  risingTalent?: boolean;
  activityStreakWeeks?: number;
  lastActiveAt?: string;
  profileCompletionScore?: number;
  achievementBadges?: string[];
  authProvider?: 'email' | 'google' | 'facebook';

  // Freelancer profile fields
  title?: string;
  category?: string;
  skills?: string[];
  experienceLevel?: ExperienceLevel;
  yearsExperience?: number;
  photoUrl?: string;
  videoIntroUrl?: string;
  portfolioUrl?: string;
  portfolioItems?: PortfolioItem[];
  bio?: string;
  hourlyRate?: number;
  pricingModel?: 'hourly' | 'fixed' | 'both';
  availability?: AvailabilityStatus;
  completedProjectsCount?: number;
  ratingAverage?: number | null;
  reviewCount?: number;
  projectAlerts?: ProjectAlertPreferences;

  // Client profile fields
  companyName?: string;
  businessCategory?: string;
  companyWebsite?: string;
  teamMembers?: TeamMember[];
}

export interface StoredUser extends PublicUser {
  email: string;
  phone: string;
  passwordHash: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconKey: string;
  freelancerCount: number;
}

export interface JobListing {
  id: string;
  clientId: string;
  clientName: string;
  companyName: string;
  title: string;
  category: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  budgetType: 'fixed' | 'hourly';
  experienceLevel: ExperienceLevel;
  jobType: JobType;
  location: string;
  remoteStatus: 'Remote' | 'Hybrid' | 'On-site';
  country: string;
  skillsRequired: string[];
  deadline: string;
  status: 'open' | 'pending_review' | 'in_progress' | 'completed' | 'closed';
  isFeatured?: boolean;
  featuredUntil?: string;
  createdAt: string;
  applicationCount?: number;
  isDemo?: boolean;
}

export interface RecommendedJob extends JobListing {
  matchScore: number;
  matchReasons: string[];
}

export interface Proposal {
  id: string;
  jobId: string;
  jobTitle: string;
  freelancerId: string;
  freelancerName: string;
  freelancerTitle: string;
  freelancerPhoto: string;
  freelancerCountry: string;
  clientId: string;
  coverLetter: string;
  proposedRate: number;
  timeline: string;
  status: 'submitted' | 'shortlisted' | 'hired' | 'declined' | 'completed';
  createdAt: string;
}

export interface JobInvitation {
  id: string;
  jobId: string;
  jobTitle: string;
  clientId: string;
  clientName: string;
  companyName: string;
  freelancerId: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface MessageAttachment {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface NegotiationQuote {
  amountUsd: number;
  timeline: string;
  proposalId?: string;
  status: 'proposed' | 'accepted' | 'declined';
}

export interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  jobId?: string;
  jobTitle?: string;
  body: string;
  attachment?: MessageAttachment;
  quote?: NegotiationQuote;
  read: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type:
    | 'alert'
    | 'proposal'
    | 'invitation'
    | 'message'
    | 'moderation'
    | 'review'
    | 'payment'
    | 'interview'
    | 'system';
  read: boolean;
  targetView?: string;
  jobId?: string;
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  jobId: string;
  jobTitle: string;
  freelancerId: string;
  clientId: string;
  clientName: string;
  companyName: string;
  rating: number;
  comment: string;
  verified: boolean;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'user' | 'job';
  targetId: string;
  targetLabel: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  companyOrSpecialty: string;
  country: string;
  quote: string;
  photoUrl: string;
  perspective: 'Client' | 'Freelancer';
  isDemo: boolean;
  verifiedRating: number | null;
}

export interface ActivityLogItem {
  id: string;
  actorName: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface SubscriptionSettings {
  commissionPercent: number;
  serviceCommissionPercent: number;
  freelancerProMonthlyUsd: number;
  clientEnterpriseMonthlyUsd: number;
  featuredJobUsd: number;
  featuredProfileUsd: number;
}

export interface ServiceListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerTitle: string;
  sellerPhoto: string;
  sellerCountry: string;
  sellerVerified?: boolean;
  title: string;
  category: string;
  description: string;
  priceUsd: number;
  deliveryDays: number;
  deliveryTime: string;
  coverImageUrl?: string;
  deliverables?: string[];
  salesCount: number;
  status: 'active' | 'paused';
  createdAt: string;
  isDemo?: boolean;
}

export interface ServiceOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  buyerRole: UserRole;
  grossAmountUsd: number;
  platformFeeUsd: number;
  sellerNetUsd: number;
  commissionPercent: number;
  gateway: PaymentGatewayId;
  currency: string;
  reference: string;
  requirementsNote?: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'completed';
  deliveryTime: string;
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
}

export interface MonthlyGrowthPoint {
  month: string;
  projectsCompleted: number;
  isCurrentMonth?: boolean;
}

export interface PlatformStats {
  freelancersCount: number;
  jobsPostedCount: number;
  projectsCompletedCount: number;
  countriesReachedCount: number;
  isLiveDatabase: boolean;
  monthlyGrowth: MonthlyGrowthPoint[];
}

export interface MarketplaceOverviewResponse {
  stats: PlatformStats;
  categories: CategoryItem[];
  featuredFreelancers: PublicUser[];
  featuredJobs: JobListing[];
  featuredServices: ServiceListing[];
  serviceCommissionPercent: number;
  testimonials: TestimonialItem[];
}

export type PaymentGatewayId = 'paynow' | 'paystack' | 'flutterwave' | 'stripe';

export interface PaymentGatewayInfo {
  id: PaymentGatewayId;
  name: string;
  region: string;
  description: string;
  methods: string[];
  currencies: string[];
  configured: boolean;
  recommendedFor: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  userName: string;
  purpose: 'escrow' | 'subscription' | 'featured_job' | 'featured_profile' | 'service_purchase';
  gateway: PaymentGatewayId;
  paymentMethod: string;
  currency: string;
  amountUsd: number;
  platformFeeUsd: number;
  netPayoutUsd: number;
  reference: string;
  status: 'pending' | 'funded' | 'released' | 'failed';
  jobId?: string;
  jobTitle?: string;
  proposalId?: string;
  escrowId?: string;
  serviceId?: string;
  serviceOrderId?: string;
  serviceTitle?: string;
  targetTier?: SubscriptionTier;
  checkoutUrl?: string;
  pollUrl?: string;
  paynowInstructions?: string;
  isSandbox: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface EscrowMilestone {
  id: string;
  title: string;
  amountUsd: number;
  netPayoutUsd: number;
  status: 'funded' | 'released' | 'refunded';
  dueDate?: string;
  releasedAt?: string;
}

export interface EscrowDispute {
  status: 'none' | 'open' | 'resolved';
  reason?: string;
  details?: string;
  raisedById?: string;
  raisedByName?: string;
  resolutionOutcome?: 'release' | 'refund';
  resolutionNote?: string;
  createdAt?: string;
  resolvedAt?: string;
}

export interface EscrowContract {
  id: string;
  jobId: string;
  jobTitle: string;
  proposalId: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  grossAmountUsd: number;
  platformFeeUsd: number;
  netPayoutUsd: number;
  gateway: PaymentGatewayId;
  currency: string;
  status: 'pending' | 'funded' | 'released' | 'refunded' | 'disputed';
  milestones?: EscrowMilestone[];
  dispute?: EscrowDispute;
  reference: string;
  isSandbox: boolean;
  createdAt: string;
  fundedAt?: string;
  releasedAt?: string;
}

export interface InterviewBooking {
  id: string;
  jobId: string;
  jobTitle: string;
  clientId: string;
  clientName: string;
  companyName: string;
  freelancerId: string;
  freelancerName: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingNotes: string;
  meetingLink?: string;
  status: 'pending' | 'confirmed' | 'declined' | 'completed';
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  jobId: string;
  proposalId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  assigneeName: string;
  dueDate: string;
  updatedAt: string;
}

export interface AdCampaign {
  id: string;
  advertiserId: string;
  advertiserName: string;
  title: string;
  summary: string;
  ctaLabel: string;
  targetUrl: string;
  category: string;
  placement: 'home' | 'directory';
  status: 'active' | 'paused';
  budgetUsd: number;
  createdAt: string;
}

export interface TalentMapHub {
  country: string;
  region: 'Africa' | 'Global';
  hubCity: string;
  timezone: string;
  x: number;
  y: number;
  freelancersCount: number;
  openJobsCount: number;
  topCategories: string[];
}

export interface TalentHighlightsResponse {
  freelancerOfTheMonth: PublicUser | null;
  top10Freelancers: PublicUser[];
  mapHubs: TalentMapHub[];
  ads: AdCampaign[];
}

export interface MonthlyEarningsPoint {
  month: string;
  earnedUsd: number;
  escrowPendingUsd: number;
}

export interface FreelancerEarningsResponse {
  totalEarnedUsd: number;
  pendingEscrowUsd: number;
  completedProjectsCount: number;
  proposalsSubmittedCount: number;
  acceptanceRatePercent: number;
  averageReviewRating: number | null;
  reviewsCount: number;
  commissionPercent: number;
  monthlySeries: MonthlyEarningsPoint[];
  recentReviews: ReviewItem[];
}

export type AiCareerMode = 'cv' | 'profile_review' | 'proposal' | 'pricing' | 'interview_prep';

export interface AiCareerRequest {
  mode: AiCareerMode;
  jobId?: string;
  targetRole?: string;
  projectScope?: string;
  notes?: string;
}

export interface AiCareerResponse {
  mode: AiCareerMode;
  content: string;
  suggestedHeadline?: string;
  recommendedRateUsd?: number;
}
