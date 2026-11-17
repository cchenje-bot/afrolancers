import type { ExperienceLevel, JobType } from '../types';

export const AFRICAN_COUNTRIES = [
  'Nigeria',
  'Kenya',
  'South Africa',
  'Ghana',
  'Egypt',
  'Morocco',
  'Ethiopia',
  'Rwanda',
  'Senegal',
  'Tanzania',
  'Uganda',
  'Zimbabwe',
  'Botswana',
  'Namibia',
  'Mauritius',
  'Côte d’Ivoire',
  'Cameroon',
  'Tunisia',
];

export const GLOBAL_COUNTRIES = [
  'United Kingdom',
  'United States',
  'Canada',
  'Germany',
  'France',
  'Netherlands',
  'United Arab Emirates',
  'India',
  'Brazil',
  'Australia',
];

export const COUNTRIES = [...AFRICAN_COUNTRIES, ...GLOBAL_COUNTRIES];

export const LANGUAGES = [
  'English',
  'French',
  'Arabic',
  'Portuguese',
  'Swahili',
  'Shona',
  'Ndebele',
  'Yoruba',
  'Igbo',
  'Hausa',
  'Zulu',
  'Amharic',
  'Twi',
  'Wolof',
  'Spanish',
  'German',
];

export const TIMEZONES = [
  'GMT / UTC+0 (Accra, Dakar, London)',
  'WAT / UTC+1 (Lagos, Douala, Paris)',
  'CAT / UTC+2 (Harare, Johannesburg, Kigali, Cairo)',
  'EAT / UTC+3 (Nairobi, Addis Ababa, Kampala)',
  'GST / UTC+4 (Dubai, Port Louis)',
  'EST / UTC-5 (New York, Toronto)',
  'PST / UTC-8 (San Francisco)',
  'BRT / UTC-3 (São Paulo)',
  'IST / UTC+5:30 (Bengaluru)',
];

export const POPULAR_SEARCHES = [
  'Web Development',
  'Graphic Design',
  'Virtual Assistance',
  'Writing',
  'Digital Marketing',
  'Accounting',
];

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  'Entry',
  'Intermediate',
  'Senior',
  'Executive',
];

export const JOB_TYPES: JobType[] = [
  'Remote',
  'Part-time',
  'Full-time',
  'Contract',
  'Freelance project',
  'Fixed-price',
  'Hourly',
];

export const CATEGORY_NAMES = [
  'IT & Software Development',
  'Graphic Design & Branding',
  'Writing & Translation',
  'Digital Marketing',
  'Accounting & Finance',
  'Virtual Assistance',
  'Customer Support',
  'Photography & Videography',
  'Engineering & Architecture',
  'Business Consulting',
  'Data Entry & Research',
  'Sales & Lead Generation',
  'Administration',
  'Education & Tutoring',
  'Trades & Technical Services',
  'Legal & Compliance Advisory',
  'Human Resources & Talent Acquisition',
  'Cybersecurity & Cloud Operations',
  'AI, Machine Learning & Data Science',
  'Supply Chain, Logistics & Procurement',
  'Health, Medical & Telehealth Support',
  'Agriculture, Climate & Sustainability',
  'Audio Production, Voiceover & Music',
  'E-Commerce & Product Management',
];

export const PRESET_PORTRAITS = [
  {
    label: 'Executive Tech Portrait',
    url: '/src/assets/images/portrait_male_engineer_1794858345961.jpg',
  },
  {
    label: 'Brand & Design Portrait',
    url: '/src/assets/images/portrait_female_designer_1794858346695.jpg',
  },
  {
    label: 'Finance & Advisory Portrait',
    url: '/src/assets/images/portrait_female_finance_1794858346533.jpg',
  },
  {
    label: 'Growth & Strategy Portrait',
    url: '/src/assets/images/portrait_male_marketing_1794858347073.jpg',
  },
];

export interface HubGeoPoint {
  country: string;
  region: 'Africa' | 'Global';
  hubCity: string;
  timezone: string;
  /** SVG coordinates on 1000x520 world projection */
  x: number;
  y: number;
}

export const TALENT_MAP_HUBS: HubGeoPoint[] = [
  { country: 'Ghana', region: 'Africa', hubCity: 'Accra', timezone: 'GMT (UTC+0)', x: 472, y: 274 },
  { country: 'Nigeria', region: 'Africa', hubCity: 'Lagos', timezone: 'WAT (UTC+1)', x: 492, y: 270 },
  { country: 'Senegal', region: 'Africa', hubCity: 'Dakar', timezone: 'GMT (UTC+0)', x: 425, y: 248 },
  { country: 'Kenya', region: 'Africa', hubCity: 'Nairobi', timezone: 'EAT (UTC+3)', x: 582, y: 294 },
  { country: 'South Africa', region: 'Africa', hubCity: 'Johannesburg', timezone: 'CAT (UTC+2)', x: 545, y: 388 },
  { country: 'Zimbabwe', region: 'Africa', hubCity: 'Harare', timezone: 'CAT (UTC+2)', x: 556, y: 356 },
  { country: 'Egypt', region: 'Africa', hubCity: 'Cairo', timezone: 'CAT (UTC+2)', x: 555, y: 204 },
  { country: 'Rwanda', region: 'Africa', hubCity: 'Kigali', timezone: 'CAT (UTC+2)', x: 558, y: 300 },
  { country: 'Morocco', region: 'Africa', hubCity: 'Casablanca', timezone: 'WAT (UTC+1)', x: 455, y: 185 },
  { country: 'Ethiopia', region: 'Africa', hubCity: 'Addis Ababa', timezone: 'EAT (UTC+3)', x: 586, y: 266 },
  { country: 'United Kingdom', region: 'Global', hubCity: 'London', timezone: 'GMT (UTC+0)', x: 470, y: 122 },
  { country: 'United States', region: 'Global', hubCity: 'New York', timezone: 'EST (UTC-5)', x: 268, y: 164 },
  { country: 'Canada', region: 'Global', hubCity: 'Toronto', timezone: 'EST (UTC-5)', x: 244, y: 138 },
  { country: 'Germany', region: 'Global', hubCity: 'Berlin', timezone: 'CET (UTC+1)', x: 512, y: 120 },
  { country: 'United Arab Emirates', region: 'Global', hubCity: 'Dubai', timezone: 'GST (UTC+4)', x: 632, y: 215 },
  { country: 'India', region: 'Global', hubCity: 'Bengaluru', timezone: 'IST (UTC+5:30)', x: 706, y: 244 },
  { country: 'Brazil', region: 'Global', hubCity: 'São Paulo', timezone: 'BRT (UTC-3)', x: 344, y: 356 },
  { country: 'Australia', region: 'Global', hubCity: 'Sydney', timezone: 'AEDT (UTC+11)', x: 868, y: 382 },
];
