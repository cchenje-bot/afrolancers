import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  ActivityLogItem,
  AdCampaign,
  CategoryItem,
  EscrowContract,
  InterviewBooking,
  JobInvitation,
  JobListing,
  MessageItem,
  NotificationItem,
  PaymentTransaction,
  ProjectTask,
  Proposal,
  PublicUser,
  ReportItem,
  ReviewItem,
  ServiceListing,
  ServiceOrder,
  StoredUser,
  SubscriptionSettings,
  TestimonialItem,
} from '../types.ts';

export interface DatabaseSchema {
  users: StoredUser[];
  categories: CategoryItem[];
  jobs: JobListing[];
  proposals: Proposal[];
  invitations: JobInvitation[];
  savedJobs: Array<{ userId: string; jobId: string; createdAt: string }>;
  shortlists: Array<{ clientId: string; freelancerId: string; createdAt: string }>;
  messages: MessageItem[];
  notifications: NotificationItem[];
  reviews: ReviewItem[];
  reports: ReportItem[];
  testimonials: TestimonialItem[];
  activityLog: ActivityLogItem[];
  subscriptionSettings: SubscriptionSettings;
  transactions: PaymentTransaction[];
  escrows: EscrowContract[];
  services: ServiceListing[];
  serviceOrders: ServiceOrder[];
  interviews: InterviewBooking[];
  projectTasks: ProjectTask[];
  ads: AdCampaign[];
  resetTokens: Array<{ email: string; token: string; expiresAt: number }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function computeProfileCompletionScore(user: PublicUser): number {
  if (user.role === 'client') {
    let score = 20;
    if (user.fullName) score += 15;
    if (user.companyName) score += 20;
    if (user.businessCategory) score += 15;
    if (user.bio && user.bio.length > 20) score += 15;
    if (user.companyWebsite) score += 10;
    if (user.verifiedProfile || user.identityVerified) score += 5;
    return Math.min(100, score);
  }
  if (user.role !== 'freelancer') return 100;

  let score = 10;
  if (user.title) score += 10;
  if (user.bio && user.bio.length >= 40) score += 10;
  if (user.photoUrl) score += 10;
  if ((user.skills || []).length >= 3) score += 10;
  if (user.city && user.timezone) score += 10;
  if ((user.languages || []).length >= 1) score += 10;
  if ((user.portfolioItems || []).length >= 1) score += 10;
  if (user.hourlyRate && user.hourlyRate > 0) score += 5;
  if (user.videoIntroUrl) score += 10;
  if (user.identityVerified || user.verifiedProfile) score += 5;
  return Math.min(100, score);
}

export function sanitizeUser(user: StoredUser, includePrivate = false): PublicUser {
  const { passwordHash: _passwordHash, email, phone, ...rest } = user;
  const score = computeProfileCompletionScore(rest);
  if (includePrivate) {
    return { ...rest, email, phone, profileCompletionScore: score };
  }
  return { ...rest, profileCompletionScore: score };
}

const INITIAL_CATEGORIES: Omit<CategoryItem, 'freelancerCount'>[] = [
  {
    id: 'cat-1',
    name: 'IT & Software Development',
    slug: 'it-software-development',
    description: 'Full-stack engineers, cloud architects, mobile developers, and QA leads.',
    iconKey: 'Code2',
  },
  {
    id: 'cat-2',
    name: 'Graphic Design & Branding',
    slug: 'graphic-design-branding',
    description: 'Visual identity systems, UI/UX design, packaging, and editorial graphics.',
    iconKey: 'PenTool',
  },
  {
    id: 'cat-3',
    name: 'Writing & Translation',
    slug: 'writing-translation',
    description: 'Technical documentation, editorial copywriting, and multilingual localization.',
    iconKey: 'FileText',
  },
  {
    id: 'cat-4',
    name: 'Digital Marketing',
    slug: 'digital-marketing',
    description: 'Performance acquisition, SEO strategy, content growth, and social campaigns.',
    iconKey: 'Megaphone',
  },
  {
    id: 'cat-5',
    name: 'Accounting & Finance',
    slug: 'accounting-finance',
    description: 'Chartered accountants, IFRS reporting, financial modeling, and tax advisory.',
    iconKey: 'Calculator',
  },
  {
    id: 'cat-6',
    name: 'Virtual Assistance',
    slug: 'virtual-assistance',
    description: 'Executive scheduling, inbox governance, travel coordination, and operations.',
    iconKey: 'CalendarCheck',
  },
  {
    id: 'cat-7',
    name: 'Customer Support',
    slug: 'customer-support',
    description: 'Multilingual client success specialists, helpdesk teams, and onboarding leads.',
    iconKey: 'Headphones',
  },
  {
    id: 'cat-8',
    name: 'Photography & Videography',
    slug: 'photography-videography',
    description: 'Commercial film production, corporate photography, and post-production editing.',
    iconKey: 'Camera',
  },
  {
    id: 'cat-9',
    name: 'Engineering & Architecture',
    slug: 'engineering-architecture',
    description: 'CAD drafting, structural planning, BIM modeling, and civil infrastructure review.',
    iconKey: 'Compass',
  },
  {
    id: 'cat-10',
    name: 'Business Consulting',
    slug: 'business-consulting',
    description: 'Market entry strategy, operational transformation, and management advisory.',
    iconKey: 'Briefcase',
  },
  {
    id: 'cat-11',
    name: 'Data Entry & Research',
    slug: 'data-entry-research',
    description: 'Market intelligence, structured database curation, and academic data analysis.',
    iconKey: 'Database',
  },
  {
    id: 'cat-12',
    name: 'Sales & Lead Generation',
    slug: 'sales-lead-generation',
    description: 'B2B pipeline building, SDR outreach, CRM enrichment, and partnership closing.',
    iconKey: 'TrendingUp',
  },
  {
    id: 'cat-13',
    name: 'Administration',
    slug: 'administration',
    description: 'HR coordination, compliance documentation, procurement, and office systems.',
    iconKey: 'ClipboardList',
  },
  {
    id: 'cat-14',
    name: 'Education & Tutoring',
    slug: 'education-tutoring',
    description: 'Curriculum design, STEM instruction, corporate training, and language coaching.',
    iconKey: 'GraduationCap',
  },
  {
    id: 'cat-15',
    name: 'Trades & Technical Services',
    slug: 'trades-technical-services',
    description: 'Solar system technicians, industrial maintenance, network cabling, and hardware repair.',
    iconKey: 'Wrench',
  },
  {
    id: 'cat-16',
    name: 'Legal & Compliance Advisory',
    slug: 'legal-compliance-advisory',
    description: 'Contract drafting, corporate governance, intellectual property, and regulatory compliance.',
    iconKey: 'Scale',
  },
  {
    id: 'cat-17',
    name: 'Human Resources & Talent Acquisition',
    slug: 'human-resources-talent-acquisition',
    description: 'Executive recruiting, payroll policy, people operations, and performance systems.',
    iconKey: 'Users',
  },
  {
    id: 'cat-18',
    name: 'Cybersecurity & Cloud Operations',
    slug: 'cybersecurity-cloud-operations',
    description: 'Penetration testing, DevSecOps, cloud hardening, and SOC compliance audits.',
    iconKey: 'ShieldCheck',
  },
  {
    id: 'cat-19',
    name: 'AI, Machine Learning & Data Science',
    slug: 'ai-machine-learning-data-science',
    description: 'Predictive modeling, NLP systems, analytics pipelines, and applied AI workflows.',
    iconKey: 'Cpu',
  },
  {
    id: 'cat-20',
    name: 'Supply Chain, Logistics & Procurement',
    slug: 'supply-chain-logistics-procurement',
    description: 'Cross-border freight planning, vendor sourcing, inventory optimization, and trade ops.',
    iconKey: 'Truck',
  },
  {
    id: 'cat-21',
    name: 'Health, Medical & Telehealth Support',
    slug: 'health-medical-telehealth-support',
    description: 'Medical transcription, public health research, clinical coordination, and wellness coaching.',
    iconKey: 'HeartPulse',
  },
  {
    id: 'cat-22',
    name: 'Agriculture, Climate & Sustainability',
    slug: 'agriculture-climate-sustainability',
    description: 'Agronomy consulting, ESG reporting, carbon project audits, and renewable energy advisory.',
    iconKey: 'Sprout',
  },
  {
    id: 'cat-23',
    name: 'Audio Production, Voiceover & Music',
    slug: 'audio-production-voiceover-music',
    description: 'Multilingual voiceovers, podcast engineering, sound design, and commercial scoring.',
    iconKey: 'Mic',
  },
  {
    id: 'cat-24',
    name: 'E-Commerce & Product Management',
    slug: 'ecommerce-product-management',
    description: 'Storefront optimization, marketplace merchandising, agile product roadmaps, and launch ops.',
    iconKey: 'ShoppingBag',
  },
];

function createSeedDatabase(): DatabaseSchema {
  const now = new Date().toISOString();

  const users: StoredUser[] = [
    {
      id: 'usr-admin-1',
      fullName: 'Tariro Chikwanda',
      email: 'admin@afro-lancers.com',
      phone: '+263 77 200 1000',
      country: 'Zimbabwe',
      city: 'Harare',
      languages: ['English', 'Shona'],
      timezone: 'CAT / UTC+2 (Harare, Johannesburg, Kigali, Cairo)',
      role: 'admin',
      status: 'active',
      subscriptionTier: 'enterprise',
      createdAt: now,
      verifiedProfile: true,
      identityVerified: true,
      passwordHash: hashPassword('AdminAfro2026!'),
      bio: 'Platform Operations & Marketplace Governance Lead.',
    },
    {
      id: 'usr-client-1',
      fullName: 'Amara Diallo',
      email: 'amara.diallo@afro-lancers.com',
      phone: '+221 77 450 2180',
      country: 'Senegal',
      city: 'Dakar',
      languages: ['French', 'English', 'Wolof'],
      timezone: 'GMT / UTC+0 (Accra, Dakar, London)',
      role: 'client',
      status: 'active',
      subscriptionTier: 'enterprise',
      createdAt: now,
      isDemo: true,
      verifiedProfile: true,
      identityVerified: true,
      companyName: 'Teranga FinTech Group',
      businessCategory: 'IT & Software Development',
      companyWebsite: 'https://terangafintech.example',
      bio: 'Pan-African payments infrastructure firm hiring remote engineering, design, and financial compliance specialists.',
      teamMembers: [
        {
          id: 'tm-1',
          name: 'Amara Diallo',
          email: 'amara.diallo@afro-lancers.com',
          role: 'Owner',
          status: 'active',
          addedAt: now,
        },
        {
          id: 'tm-2',
          name: 'Moussa Ndiaye',
          email: 'moussa.ndiaye@terangafintech.example',
          role: 'Hiring Manager',
          status: 'active',
          addedAt: now,
        },
        {
          id: 'tm-3',
          name: 'Fatou Sow',
          email: 'fatou.sow@terangafintech.example',
          role: 'Finance Approver',
          status: 'active',
          addedAt: now,
        },
      ],
      passwordHash: hashPassword('ClientAfro2026!'),
    },
    {
      id: 'usr-client-2',
      fullName: 'David Kensington',
      email: 'd.kensington@meridian.example',
      phone: '+44 20 7946 0821',
      country: 'United Kingdom',
      city: 'London',
      languages: ['English', 'French'],
      timezone: 'GMT / UTC+0 (Accra, Dakar, London)',
      role: 'client',
      status: 'active',
      subscriptionTier: 'pro',
      createdAt: now,
      isDemo: true,
      verifiedProfile: true,
      identityVerified: true,
      companyName: 'Meridian Advisory Partners',
      businessCategory: 'Business Consulting',
      bio: 'London-based consulting group partnering with African analysts, accountants, and digital teams.',
      teamMembers: [
        {
          id: 'tm-4',
          name: 'David Kensington',
          email: 'd.kensington@meridian.example',
          role: 'Owner',
          status: 'active',
          addedAt: now,
        },
      ],
      passwordHash: hashPassword('ClientAfro2026!'),
    },
    {
      id: 'usr-fl-1',
      fullName: 'Kwame Mensah',
      email: 'kwame.mensah@afro-lancers.com',
      phone: '+233 24 812 4401',
      country: 'Ghana',
      city: 'Accra',
      languages: ['English', 'Twi', 'French'],
      timezone: 'GMT / UTC+0 (Accra, Dakar, London)',
      role: 'freelancer',
      status: 'active',
      subscriptionTier: 'pro',
      createdAt: now,
      isDemo: true,
      verifiedProfile: true,
      identityVerified: true,
      skillsVerified: true,
      certifiedSkills: ['TypeScript Systems', 'AWS Solutions Architect', 'PostgreSQL Performance'],
      isFeaturedProfile: true,
      freelancerOfTheMonth: true,
      risingTalent: false,
      activityStreakWeeks: 14,
      lastActiveAt: now,
      achievementBadges: ['100% On-Time Delivery', 'Top Fintech Architect', '14-Week Streak'],
      title: 'Senior Full-Stack & Cloud Architect',
      category: 'IT & Software Development',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS Architecture'],
      experienceLevel: 'Senior',
      yearsExperience: 8,
      photoUrl: '/src/assets/images/portrait_male_engineer_1794858345961.jpg',
      portfolioUrl: 'https://kwamemensah.dev.example',
      portfolioItems: [
        {
          id: 'pf-1',
          title: 'Cross-Border Payment Gateway API',
          summary: 'Architected high-throughput settlement APIs serving West African commercial banks.',
          category: 'IT & Software Development',
        },
        {
          id: 'pf-2',
          title: 'Enterprise SaaS Analytics Portal',
          summary: 'Led frontend and cloud deployment for a multi-tenant logistics platform.',
          category: 'IT & Software Development',
        },
      ],
      bio: 'Accra-based principal software engineer building resilient fintech platforms, cloud-native APIs, and enterprise web applications for global teams.',
      hourlyRate: 65,
      pricingModel: 'both',
      availability: 'Available Now',
      completedProjectsCount: 1,
      ratingAverage: 5.0,
      reviewCount: 1,
      passwordHash: hashPassword('TalentAfro2026!'),
    },
    {
      id: 'usr-fl-2',
      fullName: 'Zainab Okafor',
      email: 'zainab.okafor@afro-lancers.com',
      phone: '+234 803 512 9904',
      country: 'Nigeria',
      city: 'Lagos',
      languages: ['English', 'Igbo', 'Yoruba'],
      timezone: 'WAT / UTC+1 (Lagos, Douala, Paris)',
      role: 'freelancer',
      status: 'active',
      subscriptionTier: 'pro',
      createdAt: now,
      isDemo: true,
      verifiedProfile: true,
      identityVerified: true,
      skillsVerified: true,
      certifiedSkills: ['Design Systems Architecture', 'Figma Enterprise'],
      isFeaturedProfile: true,
      freelancerOfTheMonth: false,
      risingTalent: false,
      activityStreakWeeks: 11,
      lastActiveAt: now,
      achievementBadges: ['Design Excellence', 'Verified Specialist'],
      title: 'Principal Brand & Product Designer',
      category: 'Graphic Design & Branding',
      skills: ['Brand Identity', 'Design Systems', 'Figma', 'UI/UX', 'Editorial Direction'],
      experienceLevel: 'Senior',
      yearsExperience: 7,
      photoUrl: '/src/assets/images/portrait_female_designer_1794858346695.jpg',
      portfolioUrl: 'https://zainabokafor.design.example',
      portfolioItems: [
        {
          id: 'pf-3',
          title: 'Pan-African Neobank Rebrand',
          summary: 'Complete visual identity, typography system, and mobile product design language.',
          category: 'Graphic Design & Branding',
        },
      ],
      bio: 'Lagos-based brand director crafting authoritative visual identities, design systems, and B2B digital products for high-growth companies.',
      hourlyRate: 55,
      pricingModel: 'both',
      availability: 'Available Now',
      completedProjectsCount: 1,
      ratingAverage: 4.9,
      reviewCount: 1,
      passwordHash: hashPassword('TalentAfro2026!'),
    },
    {
      id: 'usr-fl-3',
      fullName: 'Wanjiku Kamau',
      email: 'wanjiku.kamau@afro-lancers.com',
      phone: '+254 712 390 882',
      country: 'Kenya',
      city: 'Nairobi',
      languages: ['English', 'Swahili'],
      timezone: 'EAT / UTC+3 (Nairobi, Addis Ababa, Kampala)',
      role: 'freelancer',
      status: 'active',
      subscriptionTier: 'pro',
      createdAt: now,
      isDemo: true,
      verifiedProfile: true,
      identityVerified: true,
      skillsVerified: true,
      certifiedSkills: ['ACCA / CPA-K', 'IFRS Consolidation'],
      isFeaturedProfile: true,
      activityStreakWeeks: 9,
      lastActiveAt: now,
      achievementBadges: ['Certified IFRS Advisor', 'Enterprise Trusted'],
      title: 'Chartered Accountant & CFO Advisor',
      category: 'Accounting & Finance',
      skills: ['IFRS Reporting', 'Financial Modeling', 'Audit Readiness', 'Tax Strategy', 'FP&A'],
      experienceLevel: 'Executive',
      yearsExperience: 10,
      photoUrl: '/src/assets/images/portrait_female_finance_1794858346533.jpg',
      portfolioUrl: 'https://wanjikufinance.example',
      portfolioItems: [
        {
          id: 'pf-4',
          title: 'Series A Financial Model & Data Room',
          summary: 'Prepared audited IFRS projections and investor reporting pack for an East African agritech.',
          category: 'Accounting & Finance',
        },
      ],
      bio: 'Nairobi-based CPA and fractional financial controller guiding international startups and regional enterprises through IFRS compliance and investor reporting.',
      hourlyRate: 70,
      pricingModel: 'both',
      availability: 'Open to Offers',
      completedProjectsCount: 0,
      ratingAverage: null,
      reviewCount: 0,
      passwordHash: hashPassword('TalentAfro2026!'),
    },
    {
      id: 'usr-fl-4',
      fullName: 'Thabo Mokoena',
      email: 'thabo.mokoena@afro-lancers.com',
      phone: '+27 82 640 1192',
      country: 'South Africa',
      city: 'Johannesburg',
      languages: ['English', 'Zulu'],
      timezone: 'CAT / UTC+2 (Harare, Johannesburg, Kigali, Cairo)',
      role: 'freelancer',
      status: 'active',
      subscriptionTier: 'standard',
      createdAt: now,
      isDemo: true,
      verifiedProfile: true,
      identityVerified: true,
      skillsVerified: false,
      risingTalent: true,
      activityStreakWeeks: 7,
      lastActiveAt: now,
      achievementBadges: ['Rising Talent', '7-Week Streak'],
      title: 'B2B Growth & Digital Strategy Director',
      category: 'Digital Marketing',
      skills: ['B2B Demand Gen', 'SEO Architecture', 'Paid Media', 'Analytics', 'Go-To-Market'],
      experienceLevel: 'Senior',
      yearsExperience: 6,
      photoUrl: '/src/assets/images/portrait_male_marketing_1794858347073.jpg',
      portfolioUrl: 'https://thabogrowth.example',
      portfolioItems: [
        {
          id: 'pf-5',
          title: 'EMEA Enterprise Pipeline Campaign',
          summary: 'Structured search and LinkedIn demand strategy for a B2B SaaS provider.',
          category: 'Digital Marketing',
        },
      ],
      bio: 'Johannesburg-based digital strategist focused on measurable B2B pipeline acquisition, technical SEO, and cross-border market expansion.',
      hourlyRate: 50,
      pricingModel: 'hourly',
      availability: 'Available Now',
      completedProjectsCount: 0,
      ratingAverage: null,
      reviewCount: 0,
      passwordHash: hashPassword('TalentAfro2026!'),
    },
    {
      id: 'usr-fl-5',
      fullName: 'Chidinma Eze',
      email: 'chidinma.eze@afro-lancers.com',
      phone: '+234 809 301 7742',
      country: 'Nigeria',
      city: 'Abuja',
      languages: ['English', 'French', 'Igbo'],
      timezone: 'WAT / UTC+1 (Lagos, Douala, Paris)',
      role: 'freelancer',
      status: 'active',
      subscriptionTier: 'standard',
      createdAt: now,
      isDemo: true,
      verifiedProfile: false,
      identityVerified: true,
      risingTalent: true,
      activityStreakWeeks: 5,
      lastActiveAt: now,
      achievementBadges: ['Rising Talent'],
      title: 'Executive Virtual Assistant & Operations Lead',
      category: 'Virtual Assistance',
      skills: ['Executive Calendar', 'Board Reporting', 'Travel Logistics', 'Notion', 'CRM Admin'],
      experienceLevel: 'Intermediate',
      yearsExperience: 5,
      photoUrl: '/src/assets/images/promo_freelancer_studio_1794858346085.jpg',
      portfolioItems: [
        {
          id: 'pf-6',
          title: 'Founder Office & Investor Ops',
          summary: 'Managed multi-timezone schedules and quarterly stakeholder updates for 3 executives.',
          category: 'Virtual Assistance',
        },
      ],
      bio: 'Detail-oriented executive partner supporting international founders with structured inbox management, SOP documentation, and board preparation.',
      hourlyRate: 28,
      pricingModel: 'hourly',
      availability: 'Available Now',
      completedProjectsCount: 0,
      ratingAverage: null,
      reviewCount: 0,
      passwordHash: hashPassword('TalentAfro2026!'),
    },
    {
      id: 'usr-fl-6',
      fullName: 'Rumbidzai Moyo',
      email: 'rumbidzai.moyo@afro-lancers.com',
      phone: '+263 77 412 8890',
      country: 'Zimbabwe',
      city: 'Harare',
      languages: ['English', 'Shona', 'Ndebele'],
      timezone: 'CAT / UTC+2 (Harare, Johannesburg, Kigali, Cairo)',
      role: 'freelancer',
      status: 'active',
      subscriptionTier: 'pro',
      createdAt: now,
      isDemo: true,
      verifiedProfile: true,
      identityVerified: true,
      skillsVerified: true,
      certifiedSkills: ['AWS Security Specialty', 'ISO 27001 Lead Auditor'],
      activityStreakWeeks: 10,
      lastActiveAt: now,
      achievementBadges: ['Cloud Security Certified', '10-Week Streak'],
      title: 'Cloud Security & DevSecOps Specialist',
      category: 'Cybersecurity & Cloud Operations',
      skills: ['Penetration Testing', 'AWS Security', 'Terraform', 'SOC 2', 'Kubernetes'],
      experienceLevel: 'Senior',
      yearsExperience: 6,
      photoUrl: '/src/assets/images/portrait_female_finance_1794858346533.jpg',
      portfolioItems: [
        {
          id: 'pf-7',
          title: 'Pan-African PSP Zero-Trust Audit',
          summary: 'Hardened multi-region cloud workloads and automated CI security gates.',
          category: 'Cybersecurity & Cloud Operations',
        },
      ],
      bio: 'Harare-based DevSecOps engineer helping payment institutions and global SaaS teams achieve SOC 2 and ISO 27001 compliance.',
      hourlyRate: 62,
      pricingModel: 'both',
      availability: 'Available Now',
      completedProjectsCount: 0,
      ratingAverage: null,
      reviewCount: 0,
      passwordHash: hashPassword('TalentAfro2026!'),
    },
    {
      id: 'usr-fl-7',
      fullName: 'Youssef Benali',
      email: 'youssef.benali@afro-lancers.com',
      phone: '+212 661 480 219',
      country: 'Morocco',
      city: 'Casablanca',
      languages: ['Arabic', 'French', 'English'],
      timezone: 'WAT / UTC+1 (Lagos, Douala, Paris)',
      role: 'freelancer',
      status: 'active',
      subscriptionTier: 'standard',
      createdAt: now,
      isDemo: true,
      verifiedProfile: true,
      identityVerified: true,
      skillsVerified: true,
      certifiedSkills: ['Applied NLP & RAG Pipelines', 'Python ML'],
      activityStreakWeeks: 8,
      lastActiveAt: now,
      achievementBadges: ['AI Practitioner', 'Multilingual Talent'],
      title: 'Applied AI & Machine Learning Engineer',
      category: 'AI, Machine Learning & Data Science',
      skills: ['Python', 'PyTorch', 'LLM Pipelines', 'Data Engineering', 'FastAPI'],
      experienceLevel: 'Senior',
      yearsExperience: 5,
      photoUrl: '/src/assets/images/portrait_male_engineer_1794858345961.jpg',
      portfolioItems: [
        {
          id: 'pf-8',
          title: 'Multilingual Agritech Advisory Copilot',
          summary: 'Deployed French/Arabic/English crop diagnostics workflow for North African cooperatives.',
          category: 'AI, Machine Learning & Data Science',
        },
      ],
      bio: 'Casablanca-based AI engineer building multilingual NLP pipelines, predictive analytics models, and production data infrastructure.',
      hourlyRate: 68,
      pricingModel: 'both',
      availability: 'Available Now',
      completedProjectsCount: 0,
      ratingAverage: null,
      reviewCount: 0,
      passwordHash: hashPassword('TalentAfro2026!'),
    },
    {
      id: 'usr-fl-8',
      fullName: 'Dr. Maya Osei-Bonsu',
      email: 'maya.osei@afro-lancers.com',
      phone: '+44 7700 900412',
      country: 'United Kingdom',
      city: 'London',
      languages: ['English', 'Twi'],
      timezone: 'GMT / UTC+0 (Accra, Dakar, London)',
      role: 'freelancer',
      status: 'active',
      subscriptionTier: 'pro',
      createdAt: now,
      isDemo: true,
      verifiedProfile: true,
      identityVerified: true,
      skillsVerified: true,
      certifiedSkills: ['Cross-Border Commercial Law', 'GDPR & Data Privacy'],
      activityStreakWeeks: 6,
      lastActiveAt: now,
      achievementBadges: ['Diaspora Network Leader', 'Legal Advisory'],
      title: 'Cross-Border Corporate & IP Counsel',
      category: 'Legal & Compliance Advisory',
      skills: ['Contract Drafting', 'IP Licensing', 'Data Privacy', 'Regulatory Compliance'],
      experienceLevel: 'Executive',
      yearsExperience: 9,
      photoUrl: '/src/assets/images/portrait_female_designer_1794858346695.jpg',
      portfolioItems: [
        {
          id: 'pf-9',
          title: 'UK–West Africa Venture Structuring',
          summary: 'Drafted cross-border IP assignment and commercial SaaS agreements.',
          category: 'Legal & Compliance Advisory',
        },
      ],
      bio: 'London-based Ghanaian diaspora counsel advising African startups and international investors on commercial contracts and data compliance.',
      hourlyRate: 95,
      pricingModel: 'both',
      availability: 'Open to Offers',
      completedProjectsCount: 0,
      ratingAverage: null,
      reviewCount: 0,
      passwordHash: hashPassword('TalentAfro2026!'),
    },
  ];

  const jobs: JobListing[] = [
    {
      id: 'job-1',
      clientId: 'usr-client-1',
      clientName: 'Amara Diallo',
      companyName: 'Teranga FinTech Group',
      title: 'Lead React & TypeScript Architect for Merchant Portal',
      category: 'IT & Software Development',
      description:
        'Design and implement a high-reliability merchant settlement portal with role-based permissions, multi-currency reconciliation views, and accessible reporting tables.',
      budgetMin: 4500,
      budgetMax: 7200,
      budgetType: 'fixed',
      experienceLevel: 'Senior',
      jobType: 'Remote',
      location: 'Dakar / Remote',
      remoteStatus: 'Remote',
      country: 'Senegal',
      skillsRequired: ['TypeScript', 'React', 'Node.js', 'REST APIs'],
      deadline: '2026-12-15',
      status: 'open',
      isFeatured: true,
      createdAt: now,
      isDemo: true,
    },
    {
      id: 'job-2',
      clientId: 'usr-client-2',
      clientName: 'David Kensington',
      companyName: 'Meridian Advisory Partners',
      title: 'Chartered Accountant for Cross-Border IFRS Consolidation',
      category: 'Accounting & Finance',
      description:
        'Partner with our London and Nairobi finance teams to prepare quarterly IFRS consolidation schedules, variance commentary, and board audit packs.',
      budgetMin: 55,
      budgetMax: 80,
      budgetType: 'hourly',
      experienceLevel: 'Executive',
      jobType: 'Contract',
      location: 'London / Remote',
      remoteStatus: 'Remote',
      country: 'United Kingdom',
      skillsRequired: ['IFRS Reporting', 'Financial Modeling', 'Audit Readiness'],
      deadline: '2026-12-10',
      status: 'open',
      isFeatured: true,
      createdAt: now,
      isDemo: true,
    },
    {
      id: 'job-3',
      clientId: 'usr-client-1',
      clientName: 'Amara Diallo',
      companyName: 'Teranga FinTech Group',
      title: 'Corporate Brand Identity & Design System Overhaul',
      category: 'Graphic Design & Branding',
      description:
        'Establish an authoritative pan-African corporate design system covering typography, web components, investor deck templates, and product UI standards.',
      budgetMin: 3200,
      budgetMax: 4800,
      budgetType: 'fixed',
      experienceLevel: 'Senior',
      jobType: 'Fixed-price',
      location: 'Remote (Africa-wide)',
      remoteStatus: 'Remote',
      country: 'Senegal',
      skillsRequired: ['Brand Identity', 'Design Systems', 'Figma'],
      deadline: '2026-12-20',
      status: 'open',
      createdAt: now,
      isDemo: true,
    },
    {
      id: 'job-4',
      clientId: 'usr-client-2',
      clientName: 'David Kensington',
      companyName: 'Meridian Advisory Partners',
      title: 'B2B Digital Acquisition & Technical SEO Strategist',
      category: 'Digital Marketing',
      description:
        'Audit organic search architecture, build high-intent enterprise landing pages, and manage LinkedIn demand campaigns across EMEA and East Africa.',
      budgetMin: 40,
      budgetMax: 60,
      budgetType: 'hourly',
      experienceLevel: 'Senior',
      jobType: 'Part-time',
      location: 'Remote',
      remoteStatus: 'Remote',
      country: 'United Kingdom',
      skillsRequired: ['SEO Architecture', 'B2B Demand Gen', 'Analytics'],
      deadline: '2026-12-18',
      status: 'open',
      createdAt: now,
      isDemo: true,
    },
    {
      id: 'job-5',
      clientId: 'usr-client-1',
      clientName: 'Amara Diallo',
      companyName: 'Teranga FinTech Group',
      title: 'Bilingual French/English Executive Virtual Assistant',
      category: 'Virtual Assistance',
      description:
        'Support executive leadership with multi-timezone scheduling, board meeting minutes, vendor coordination, and travel logistics across West Africa and Europe.',
      budgetMin: 22,
      budgetMax: 32,
      budgetType: 'hourly',
      experienceLevel: 'Intermediate',
      jobType: 'Full-time',
      location: 'Remote',
      remoteStatus: 'Remote',
      country: 'Senegal',
      skillsRequired: ['Executive Calendar', 'Board Reporting', 'Bilingual French/English'],
      deadline: '2026-12-12',
      status: 'open',
      createdAt: now,
      isDemo: true,
    },
    {
      id: 'job-6',
      clientId: 'usr-client-2',
      clientName: 'David Kensington',
      companyName: 'Meridian Advisory Partners',
      title: 'Renewable Energy Market Research & Financial Data Analyst',
      category: 'Data Entry & Research',
      description:
        'Compile verified regulatory, tariff, and grid-capacity datasets across 8 Southern and East African countries for an institutional investment briefing.',
      budgetMin: 1800,
      budgetMax: 2600,
      budgetType: 'fixed',
      experienceLevel: 'Intermediate',
      jobType: 'Freelance project',
      location: 'Remote',
      remoteStatus: 'Remote',
      country: 'Kenya',
      skillsRequired: ['Market Research', 'Excel Modeling', 'Data Curation'],
      deadline: '2026-12-22',
      status: 'open',
      createdAt: now,
      isDemo: true,
    },
    {
      id: 'job-7',
      clientId: 'usr-client-1',
      clientName: 'Amara Diallo',
      companyName: 'Teranga FinTech Group',
      title: 'SOC 2 Cloud Hardening & Penetration Test Engagement',
      category: 'Cybersecurity & Cloud Operations',
      description:
        'Conduct infrastructure penetration testing, IAM policy audits, and Terraform security remediation ahead of regional central bank licensing.',
      budgetMin: 3800,
      budgetMax: 5500,
      budgetType: 'fixed',
      experienceLevel: 'Senior',
      jobType: 'Contract',
      location: 'Harare / Remote',
      remoteStatus: 'Remote',
      country: 'Zimbabwe',
      skillsRequired: ['Penetration Testing', 'AWS Security', 'SOC 2'],
      deadline: '2026-12-28',
      status: 'open',
      isFeatured: true,
      createdAt: now,
      isDemo: true,
    },
  ];

  const proposals: Proposal[] = [
    {
      id: 'prop-1',
      jobId: 'job-1',
      jobTitle: 'Lead React & TypeScript Architect for Merchant Portal',
      freelancerId: 'usr-fl-1',
      freelancerName: 'Kwame Mensah',
      freelancerTitle: 'Senior Full-Stack & Cloud Architect',
      freelancerPhoto: '/src/assets/images/portrait_male_engineer_1794858345961.jpg',
      freelancerCountry: 'Ghana',
      clientId: 'usr-client-1',
      coverLetter:
        'I have architected settlement dashboards for two licensed West African PSPs using TypeScript, React, and strict RBAC patterns.',
      proposedRate: 5800,
      timeline: '6 weeks',
      status: 'completed',
      createdAt: now,
    },
    {
      id: 'prop-2',
      jobId: 'job-3',
      jobTitle: 'Corporate Brand Identity & Design System Overhaul',
      freelancerId: 'usr-fl-2',
      freelancerName: 'Zainab Okafor',
      freelancerTitle: 'Principal Brand & Product Designer',
      freelancerPhoto: '/src/assets/images/portrait_female_designer_1794858346695.jpg',
      freelancerCountry: 'Nigeria',
      clientId: 'usr-client-1',
      coverLetter:
        'Sharing our fintech design system architecture case study covering token governance, accessibility, and executive presentation decks.',
      proposedRate: 4100,
      timeline: '4 weeks',
      status: 'completed',
      createdAt: now,
    },
  ];

  const reviews: ReviewItem[] = [
    {
      id: 'rev-1',
      jobId: 'job-1',
      jobTitle: 'Lead React & TypeScript Architect for Merchant Portal',
      freelancerId: 'usr-fl-1',
      clientId: 'usr-client-1',
      clientName: 'Amara Diallo',
      companyName: 'Teranga FinTech Group',
      rating: 5,
      comment:
        'Delivered clean, production-ready TypeScript architecture ahead of schedule with disciplined documentation.',
      verified: true,
      createdAt: now,
    },
    {
      id: 'rev-2',
      jobId: 'job-3',
      jobTitle: 'Corporate Brand Identity & Design System Overhaul',
      freelancerId: 'usr-fl-2',
      clientId: 'usr-client-1',
      clientName: 'Amara Diallo',
      companyName: 'Teranga FinTech Group',
      rating: 4.9,
      comment:
        'Exceptional editorial sensibility and responsive Figma component library ready for immediate engineering handoff.',
      verified: true,
      createdAt: now,
    },
  ];

  const testimonials: TestimonialItem[] = [
    {
      id: 'test-1',
      name: 'Amara Diallo',
      role: 'Chief Operating Officer',
      companyOrSpecialty: 'Teranga FinTech Group',
      country: 'Senegal',
      quote:
        'Demonstration showcase: Hiring senior engineering and design specialists across Accra and Lagos cut our product launch cycle while raising architectural quality.',
      photoUrl: '/src/assets/images/promo_client_team_1794858344137.jpg',
      perspective: 'Client',
      isDemo: true,
      verifiedRating: 5.0,
    },
    {
      id: 'test-2',
      name: 'Kwame Mensah',
      role: 'Principal Software Architect',
      companyOrSpecialty: 'IT & Software Development',
      country: 'Ghana',
      quote:
        'Demonstration showcase: Having a structured international profile and direct client briefs lets independent African engineers compete purely on technical merit.',
      photoUrl: '/src/assets/images/portrait_male_engineer_1794858345961.jpg',
      perspective: 'Freelancer',
      isDemo: true,
      verifiedRating: 5.0,
    },
    {
      id: 'test-3',
      name: 'Wanjiku Kamau',
      role: 'Chartered Accountant & Advisor',
      companyOrSpecialty: 'Accounting & Finance',
      country: 'Kenya',
      quote:
        'Demonstration showcase: International advisory firms value rigorous IFRS reporting and clear communication across time zones.',
      photoUrl: '/src/assets/images/portrait_female_finance_1794858346533.jpg',
      perspective: 'Freelancer',
      isDemo: true,
      verifiedRating: null,
    },
  ];

  const interviews: InterviewBooking[] = [
    {
      id: 'int-1',
      jobId: 'job-2',
      jobTitle: 'Chartered Accountant for Cross-Border IFRS Consolidation',
      clientId: 'usr-client-2',
      clientName: 'David Kensington',
      companyName: 'Meridian Advisory Partners',
      freelancerId: 'usr-fl-3',
      freelancerName: 'Wanjiku Kamau',
      scheduledAt: '2026-11-24T11:00',
      durationMinutes: 30,
      meetingNotes: 'Review Q4 multi-entity consolidation timeline and IFRS audit sign-off scope.',
      meetingLink: 'https://meet.afro-lancers.com/meridian-ifrs-brief',
      status: 'confirmed',
      createdAt: now,
    },
  ];

  const projectTasks: ProjectTask[] = [
    {
      id: 'task-1',
      jobId: 'job-1',
      proposalId: 'prop-1',
      title: 'RBAC & Multi-Currency Settlement Schema Sign-Off',
      status: 'done',
      assigneeName: 'Kwame Mensah',
      dueDate: '2026-11-20',
      updatedAt: now,
    },
    {
      id: 'task-2',
      jobId: 'job-1',
      proposalId: 'prop-1',
      title: 'Merchant Payout Audit CSV & Webhook Handler',
      status: 'done',
      assigneeName: 'Kwame Mensah',
      dueDate: '2026-12-01',
      updatedAt: now,
    },
  ];

  const ads: AdCampaign[] = [
    {
      id: 'ad-1',
      advertiserId: 'usr-client-1',
      advertiserName: 'Teranga Cloud & Treasury',
      title: 'Zero-Friction Cross-Border Treasury for African Teams',
      summary:
        'Multi-currency USD, EUR, XOF, NGN, and ZAR corporate accounts built for distributed African startups and remote contractors.',
      ctaLabel: 'Explore Partner Offer',
      targetUrl: '#payments-section',
      category: 'FinTech & Treasury',
      placement: 'home',
      status: 'active',
      budgetUsd: 250,
      createdAt: now,
    },
    {
      id: 'ad-2',
      advertiserId: 'usr-client-2',
      advertiserName: 'Meridian Executive Advisory',
      title: 'Expand Into UK & EMEA Enterprise Procurement',
      summary:
        'Compliance readiness audits and cross-border vendor onboarding support for top-rated African digital agencies.',
      ctaLabel: 'Learn More',
      targetUrl: '#how-it-works-section',
      category: 'Enterprise Compliance',
      placement: 'directory',
      status: 'active',
      budgetUsd: 180,
      createdAt: now,
    },
  ];

  return {
    users,
    categories: INITIAL_CATEGORIES.map((c) => ({ ...c, freelancerCount: 0 })),
    jobs,
    proposals,
    invitations: [],
    savedJobs: [],
    shortlists: [],
    messages: [
      {
        id: 'msg-1',
        senderId: 'usr-client-1',
        senderName: 'Amara Diallo',
        senderRole: 'client',
        recipientId: 'usr-fl-1',
        recipientName: 'Kwame Mensah',
        jobId: 'job-1',
        jobTitle: 'Lead React & TypeScript Architect for Merchant Portal',
        body: 'Welcome aboard Kwame — let us review the milestone schedule for the settlement dashboard this week.',
        read: false,
        createdAt: now,
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        userId: 'usr-fl-1',
        title: 'New message from Teranga FinTech Group',
        body: 'Amara Diallo sent a message regarding Lead React & TypeScript Architect.',
        type: 'message',
        read: false,
        targetView: 'dashboard',
        createdAt: now,
      },
      {
        id: 'notif-2',
        userId: 'usr-client-1',
        title: 'Proposal archive updated',
        body: 'Two completed project evaluations are available in your Client Dashboard.',
        type: 'proposal',
        read: false,
        targetView: 'dashboard',
        createdAt: now,
      },
    ],
    reviews,
    reports: [],
    testimonials,
    activityLog: [
      {
        id: 'act-1',
        actorName: 'System Seed',
        action: 'Initialized marketplace registry',
        target: '24 Categories · Global Talent Map · Showcase Briefs',
        timestamp: now,
      },
    ],
    subscriptionSettings: {
      commissionPercent: 5,
      serviceCommissionPercent: 10,
      freelancerProMonthlyUsd: 19,
      clientEnterpriseMonthlyUsd: 79,
      featuredJobUsd: 29,
      featuredProfileUsd: 25,
    },
    transactions: [],
    escrows: [],
    services: [
      {
        id: 'svc-1',
        sellerId: 'usr-fl-1',
        sellerName: 'Kwame Mensah',
        sellerTitle: 'Senior Full-Stack & Cloud Architect',
        sellerPhoto: '/src/assets/images/portrait_male_engineer_1794858345961.jpg',
        sellerCountry: 'Ghana',
        sellerVerified: true,
        title: 'Production SaaS & Payment API Architecture Package',
        category: 'IT & Software Development',
        description:
          'Complete TypeScript/Node.js REST API foundation with authentication, RBAC permissions, PostgreSQL schema, and Paynow/Stripe webhook boilerplate.',
        priceUsd: 850,
        deliveryDays: 7,
        deliveryTime: '7 days',
        coverImageUrl: '/src/assets/images/service_software_architecture_1794870728095.jpg',
        deliverables: [
          'Scalable TypeScript API codebase',
          'Database schema & migrations',
          'CI/CD deployment checklist & handover call',
        ],
        salesCount: 6,
        status: 'active',
        createdAt: now,
        isDemo: true,
      },
      {
        id: 'svc-2',
        sellerId: 'usr-fl-2',
        sellerName: 'Zainab Okafor',
        sellerTitle: 'Principal Brand & Product Designer',
        sellerPhoto: '/src/assets/images/portrait_female_designer_1794858346695.jpg',
        sellerCountry: 'Nigeria',
        sellerVerified: true,
        title: 'Executive Brand Identity & Figma Design System Kit',
        category: 'Graphic Design & Branding',
        description:
          'Authoritative visual identity suite including logo system, typography hierarchy, corporate palette tokens, stationery templates, and reusable Figma UI kit.',
        priceUsd: 620,
        deliveryDays: 5,
        deliveryTime: '5 days',
        coverImageUrl: '/src/assets/images/service_brand_identity_1794870728614.jpg',
        deliverables: [
          'Primary & monochrome brand marks (SVG/PDF)',
          '24-page brand guidelines deck',
          'Responsive Figma component library',
        ],
        salesCount: 9,
        status: 'active',
        createdAt: now,
        isDemo: true,
      },
      {
        id: 'svc-3',
        sellerId: 'usr-fl-3',
        sellerName: 'Wanjiku Kamau',
        sellerTitle: 'Chartered Accountant & CFO Advisor',
        sellerPhoto: '/src/assets/images/portrait_female_finance_1794858346533.jpg',
        sellerCountry: 'Kenya',
        sellerVerified: true,
        title: 'Investor-Ready 3-Year IFRS Financial Model & Audit Pack',
        category: 'Accounting & Finance',
        description:
          'Board-level dynamic Excel financial model with P&L, cash flow, balance sheet forecasts, unit economics, and IFRS variance notes for fundraising.',
        priceUsd: 490,
        deliveryDays: 4,
        deliveryTime: '4 days',
        coverImageUrl: '/src/assets/images/service_finance_advisory_1794870729851.jpg',
        deliverables: [
          'Linked 3-statement Excel model',
          'Scenario sensitivity dashboard',
          'Executive commentary memo (PDF)',
        ],
        salesCount: 5,
        status: 'active',
        createdAt: now,
        isDemo: true,
      },
      {
        id: 'svc-4',
        sellerId: 'usr-fl-6',
        sellerName: 'Rumbidzai Moyo',
        sellerTitle: 'Cloud Security & DevSecOps Specialist',
        sellerPhoto: '/src/assets/images/portrait_female_finance_1794858346533.jpg',
        sellerCountry: 'Zimbabwe',
        sellerVerified: true,
        title: 'Cloud Infrastructure Security Audit & SOC 2 Gap Assessment',
        category: 'Cybersecurity & Cloud Operations',
        description:
          'Deep review of AWS/GCP IAM roles, VPC firewall topology, secrets hygiene, and prioritized remediation roadmap aligned to SOC 2 & ISO 27001.',
        priceUsd: 540,
        deliveryDays: 5,
        deliveryTime: '5 days',
        coverImageUrl: '/src/assets/images/service_security_ai_1794870730489.jpg',
        deliverables: [
          'Detailed vulnerability & IAM findings report',
          'Terraform security hardening patches',
          '45-minute remediation walkthrough',
        ],
        salesCount: 4,
        status: 'active',
        createdAt: now,
        isDemo: true,
      },
      {
        id: 'svc-5',
        sellerId: 'usr-fl-4',
        sellerName: 'Thabo Mokoena',
        sellerTitle: 'B2B Growth & Digital Strategy Director',
        sellerPhoto: '/src/assets/images/portrait_male_marketing_1794858347073.jpg',
        sellerCountry: 'South Africa',
        sellerVerified: true,
        title: 'Technical SEO Audit & 90-Day B2B Demand Blueprint',
        category: 'Digital Marketing',
        description:
          'Full crawl & Core Web Vitals diagnosis, keyword intent mapping, LinkedIn outbound funnel messaging, and high-converting landing page wireframes.',
        priceUsd: 350,
        deliveryDays: 3,
        deliveryTime: '3 days',
        coverImageUrl: '/src/assets/images/service_software_architecture_1794870728095.jpg',
        deliverables: [
          'Technical SEO issue prioritized sheet',
          '90-day content & paid acquisition calendar',
          '3 conversion wireframe concepts',
        ],
        salesCount: 7,
        status: 'active',
        createdAt: now,
        isDemo: true,
      },
      {
        id: 'svc-6',
        sellerId: 'usr-fl-7',
        sellerName: 'Youssef Benali',
        sellerTitle: 'Applied AI & Machine Learning Engineer',
        sellerPhoto: '/src/assets/images/portrait_male_engineer_1794858345961.jpg',
        sellerCountry: 'Morocco',
        sellerVerified: true,
        title: 'Custom RAG Knowledge Assistant & Document Search Pipeline',
        category: 'AI, Machine Learning & Data Science',
        description:
          'Deploy a secure retrieval-augmented search workflow over your company PDFs and manuals with citation grounding and REST endpoint integration.',
        priceUsd: 780,
        deliveryDays: 6,
        deliveryTime: '6 days',
        coverImageUrl: '/src/assets/images/service_security_ai_1794870730489.jpg',
        deliverables: [
          'Document ingestion & chunking pipeline',
          'Grounded Q&A API service',
          'Evaluation benchmark report',
        ],
        salesCount: 3,
        status: 'active',
        createdAt: now,
        isDemo: true,
      },
    ],
    serviceOrders: [],
    interviews,
    projectTasks,
    ads,
    resetTokens: [],
  };
}

let cachedDb: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    cachedDb = createSeedDatabase();
    saveDb(cachedDb);
    return cachedDb;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    cachedDb = JSON.parse(raw) as DatabaseSchema;
    const seed = createSeedDatabase();
    let mutated = false;

    for (const def of INITIAL_CATEGORIES) {
      if (!cachedDb.categories.some((c) => c.id === def.id || c.name === def.name)) {
        cachedDb.categories.push({ ...def, freelancerCount: 0 });
        mutated = true;
      }
    }

    for (const seedUser of seed.users) {
      const existing = cachedDb.users.find((u) => u.id === seedUser.id);
      if (!existing) {
        cachedDb.users.push(seedUser);
        mutated = true;
      } else if (existing.isDemo) {
        if (!existing.city && seedUser.city) {
          existing.city = seedUser.city;
          mutated = true;
        }
        if (existing.freelancerOfTheMonth === undefined && seedUser.freelancerOfTheMonth !== undefined) {
          existing.freelancerOfTheMonth = seedUser.freelancerOfTheMonth;
          mutated = true;
        }
        if (existing.risingTalent === undefined && seedUser.risingTalent !== undefined) {
          existing.risingTalent = seedUser.risingTalent;
          mutated = true;
        }
        if (existing.skillsVerified === undefined && seedUser.skillsVerified !== undefined) {
          existing.skillsVerified = seedUser.skillsVerified;
          mutated = true;
        }
        if (!existing.certifiedSkills && seedUser.certifiedSkills) {
          existing.certifiedSkills = seedUser.certifiedSkills;
          mutated = true;
        }
        if (!existing.achievementBadges && seedUser.achievementBadges) {
          existing.achievementBadges = seedUser.achievementBadges;
          mutated = true;
        }
        if (existing.isFeaturedProfile === undefined && seedUser.isFeaturedProfile !== undefined) {
          existing.isFeaturedProfile = seedUser.isFeaturedProfile;
          mutated = true;
        }
        if (!existing.teamMembers && seedUser.teamMembers) {
          existing.teamMembers = seedUser.teamMembers;
          mutated = true;
        }
      }
    }

    for (const seedJob of seed.jobs) {
      const existingJob = cachedDb.jobs.find((j) => j.id === seedJob.id);
      if (!existingJob) {
        cachedDb.jobs.push(seedJob);
        mutated = true;
      } else if (existingJob.isFeatured === undefined && seedJob.isFeatured !== undefined) {
        existingJob.isFeatured = seedJob.isFeatured;
        mutated = true;
      }
    }

    for (const u of cachedDb.users) {
      if (u.role === 'freelancer' && !u.projectAlerts) {
        u.projectAlerts = {
          enabled: true,
          categories: u.category ? [u.category] : [],
          keywords: (u.skills || []).slice(0, 4),
          minBudget: 0,
          remoteOnly: false,
        };
        mutated = true;
      }
      if (!u.languages) {
        u.languages = ['English'];
        mutated = true;
      }
      if (!u.timezone) {
        u.timezone = 'CAT / UTC+2 (Harare, Johannesburg, Kigali, Cairo)';
        mutated = true;
      }
      if (u.role === 'freelancer' && u.activityStreakWeeks === undefined) {
        u.activityStreakWeeks = 1;
        mutated = true;
      }
      if (u.role === 'freelancer' && u.identityVerified === undefined) {
        u.identityVerified = Boolean(u.verifiedProfile);
        mutated = true;
      }
    }

    if (!Array.isArray(cachedDb.transactions)) {
      cachedDb.transactions = [];
      mutated = true;
    }
    if (!Array.isArray(cachedDb.escrows)) {
      cachedDb.escrows = [];
      mutated = true;
    }
    if (!Array.isArray(cachedDb.services) || cachedDb.services.length === 0) {
      cachedDb.services = seed.services;
      mutated = true;
    } else {
      for (const seedSvc of seed.services) {
        if (!cachedDb.services.some((s) => s.id === seedSvc.id)) {
          cachedDb.services.push(seedSvc);
          mutated = true;
        }
      }
    }
    if (!Array.isArray(cachedDb.serviceOrders)) {
      cachedDb.serviceOrders = [];
      mutated = true;
    }
    if (!Array.isArray(cachedDb.interviews) || cachedDb.interviews.length === 0) {
      cachedDb.interviews = seed.interviews;
      mutated = true;
    }
    if (!Array.isArray(cachedDb.projectTasks) || cachedDb.projectTasks.length === 0) {
      cachedDb.projectTasks = seed.projectTasks;
      mutated = true;
    }
    if (!Array.isArray(cachedDb.ads) || cachedDb.ads.length === 0) {
      cachedDb.ads = seed.ads;
      mutated = true;
    }
    if (cachedDb.subscriptionSettings) {
      if (cachedDb.subscriptionSettings.serviceCommissionPercent === undefined) {
        cachedDb.subscriptionSettings.serviceCommissionPercent = 10;
        mutated = true;
      }
      if (cachedDb.subscriptionSettings.featuredJobUsd === undefined) {
        cachedDb.subscriptionSettings.featuredJobUsd = 29;
        mutated = true;
      }
      if (cachedDb.subscriptionSettings.featuredProfileUsd === undefined) {
        cachedDb.subscriptionSettings.featuredProfileUsd = 25;
        mutated = true;
      }
      if (cachedDb.subscriptionSettings.commissionPercent === 8) {
        cachedDb.subscriptionSettings.commissionPercent = 5;
        mutated = true;
      }
    }

    if (mutated) {
      saveDb(cachedDb);
    }
    return cachedDb;
  } catch {
    cachedDb = createSeedDatabase();
    saveDb(cachedDb);
    return cachedDb;
  }
}

export function saveDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
  cachedDb = db;
}

export function dispatchProjectAlertsForJob(db: DatabaseSchema, job: JobListing): number {
  let matchedCount = 0;
  const jobHaystack = [job.title, job.description, job.category, ...job.skillsRequired]
    .join(' ')
    .toLowerCase();

  for (const user of db.users) {
    if (user.role !== 'freelancer' || user.status !== 'active') continue;
    const prefs = user.projectAlerts;
    if (!prefs || !prefs.enabled) continue;
    if (prefs.remoteOnly && job.remoteStatus !== 'Remote') continue;
    if (prefs.minBudget > 0 && job.budgetMax < prefs.minBudget) continue;

    const categoryMatch =
      prefs.categories.length === 0 ||
      prefs.categories.includes(job.category) ||
      user.category === job.category;

    const keywordMatch =
      prefs.keywords.length === 0 ||
      prefs.keywords.some((kw) => kw.trim() && jobHaystack.includes(kw.trim().toLowerCase()));

    if (categoryMatch || keywordMatch) {
      db.notifications.unshift({
        id: `notif-${crypto.randomUUID().slice(0, 8)}`,
        userId: user.id,
        title: `Project Alert: ${job.title}`,
        body: `${job.companyName} posted a ${job.category} project ($${job.budgetMin}–$${job.budgetMax}${
          job.budgetType === 'hourly' ? '/hr' : ' fixed'
        }).`,
        type: 'alert',
        read: false,
        targetView: 'find-work',
        jobId: job.id,
        createdAt: new Date().toISOString(),
      });
      matchedCount += 1;
    }
  }
  return matchedCount;
}

export function computeCategoriesWithCounts(db: DatabaseSchema): CategoryItem[] {
  return db.categories.map((cat) => {
    const count = db.users.filter(
      (u) => u.role === 'freelancer' && u.status === 'active' && u.category === cat.name
    ).length;
    return { ...cat, freelancerCount: count };
  });
}

export function computePlatformStats(db: DatabaseSchema) {
  const activeFreelancers = db.users.filter((u) => u.role === 'freelancer' && u.status === 'active');
  const activeJobs = db.jobs.filter((j) => j.status !== 'closed');
  const completedProposals = db.proposals.filter((p) => p.status === 'completed');
  const completedJobs = db.jobs.filter((j) => j.status === 'completed');
  const completedProjects = completedProposals.length + completedJobs.length;

  const countries = new Set<string>();
  for (const u of db.users) {
    if (u.country) countries.add(u.country);
  }
  for (const j of db.jobs) {
    if (j.country) countries.add(j.country);
  }

  const now = new Date();
  const demoBaseline = [12, 18, 25, 34, 44, 52];
  const monthlyGrowth = Array.from({ length: 6 }, (_, idx) => {
    const offset = 5 - idx;
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const liveInMonth =
      completedProposals.filter((p) => p.createdAt.startsWith(monthKey)).length +
      completedJobs.filter((j) => j.createdAt.startsWith(monthKey)).length;

    return {
      month: label,
      projectsCompleted: demoBaseline[idx] + liveInMonth,
      isCurrentMonth: offset === 0,
    };
  });

  return {
    freelancersCount: activeFreelancers.length,
    jobsPostedCount: activeJobs.length,
    projectsCompletedCount: completedProjects,
    countriesReachedCount: countries.size,
    isLiveDatabase: true,
    monthlyGrowth,
  };
}

export function recalculateFreelancerStats(db: DatabaseSchema, freelancerId: string): void {
  const user = db.users.find((u) => u.id === freelancerId && u.role === 'freelancer');
  if (!user) return;
  const userReviews = db.reviews.filter((r) => r.freelancerId === freelancerId);
  user.reviewCount = userReviews.length;
  if (userReviews.length > 0) {
    const total = userReviews.reduce((acc, r) => acc + r.rating, 0);
    user.ratingAverage = Number((total / userReviews.length).toFixed(1));
  } else {
    user.ratingAverage = null;
  }
  user.completedProjectsCount = db.proposals.filter(
    (p) => p.freelancerId === freelancerId && p.status === 'completed'
  ).length;
}
