import { Course, ThemeColor } from './types';

export const AVAILABLE_COURSES: Course[] = [
  {
    id: 'dev-101',
    title: 'Advanced React & Next.js Frameworks',
    code: 'CS-NEXT-501',
    category: 'Development',
    duration: '40 Hours',
    instructor: 'Dr. Sarah Jenkins'
  },
  {
    id: 'dev-102',
    title: 'Full-Stack Web Development with Node.js',
    code: 'CS-FS-202',
    category: 'Development',
    duration: '60 Hours',
    instructor: 'Alex Rivera'
  },
  {
    id: 'des-201',
    title: 'UI/UX Design Masterclass & Design Systems',
    code: 'DS-UIUX-401',
    category: 'Design',
    duration: '32 Hours',
    instructor: 'Elena Rostova'
  },
  {
    id: 'ds-301',
    title: 'Modern Machine Learning & Deep Learning',
    code: 'DS-ML-602',
    category: 'Data Science',
    duration: '54 Hours',
    instructor: 'Prof. Michael Chen'
  },
  {
    id: 'ds-302',
    title: 'Data Visualization with D3.js and Recharts',
    code: 'DS-D3-305',
    category: 'Data Science',
    duration: '24 Hours',
    instructor: 'Marcus Aurel'
  },
  {
    id: 'bus-401',
    title: 'Agile Product Management & Product Growth',
    code: 'PM-AGILE-310',
    category: 'Business',
    duration: '28 Hours',
    instructor: 'Sophia Vanguard'
  }
];

export const THEME_COLORS: ThemeColor[] = [
  {
    id: 'navy', // Keep same id so that previous default selection is backward compatible
    name: 'Deep Royal Purple (Classic)',
    primary: '#5A189A',
    secondary: '#4C1D95',
    accent: '#6D28D9',
    border: '#111111',
    text: '#111111',
    background: '#FFFFFF',
    gradient: 'from-[#4C1D95] via-[#5A189A] to-[#6D28D9]'
  },
  {
    id: 'emerald', // Keep same id so that previous default selection is backward compatible
    name: 'Rich Violet (Ornate)',
    primary: '#4C1D95',
    secondary: '#5A189A',
    accent: '#6D28D9',
    border: '#111111',
    text: '#111111',
    background: '#FFFFFF',
    gradient: 'from-[#111111] via-[#4C1D95] to-[#5A189A]'
  },
  {
    id: 'gold', // Keep same id so that previous default selection is backward compatible
    name: 'Bright Orchid (Vibrant)',
    primary: '#6D28D9',
    secondary: '#4C1D95',
    accent: '#5A189A',
    border: '#111111',
    text: '#111111',
    background: '#FFFFFF',
    gradient: 'from-[#5A189A] via-[#6D28D9] to-white'
  }
];

export const CERTIFICATE_TEMPLATES = [
  { id: 'classic', name: 'Modern Classic', desc: 'Symmetrical traditional design, perfect for serious academic credentials.' },
  { id: 'modern', name: 'Minimalist Tech', desc: 'Asymmetrical tech layout, styled with mono fonts and code aesthetics.' },
  { id: 'luxury', name: 'Imperial Luxury', desc: 'Golden ornate status board, suitable for elite distinctions.' },
  { id: 'abstract', name: 'Creative Abstract', desc: 'Soft pastel borders and fluid geometry, best for artistic and creative courses.' }
];
