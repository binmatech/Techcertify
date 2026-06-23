export interface Course {
  id: string;
  title: string;
  code: string;
  category: 'Development' | 'Design' | 'Data Science' | 'Business';
  duration: string;
  instructor: string;
}

export interface User {
  name: string;
  email: string;
  registeredAt: string;
  selectedCourseIds: string[];
  isAdmin?: boolean;
}

export type TemplateStyle = 'classic' | 'modern' | 'luxury' | 'abstract';

export interface ThemeColor {
  id: string;
  name: string;
  primary: string; // Tailwind color class or hex
  secondary: string;
  accent: string;
  border: string;
  text: string;
  background: string;
  gradient: string;
}

export interface CertificateConfig {
  title: string;
  subtitle: string;
  recipientName: string;
  courseTitle: string;
  issueDate: string;
  certificateId: string;
  signatureText: string;
  signatureTitle: string;
  sealText: string;
  template: TemplateStyle;
  colorThemeId: string;
  showSubtitle?: boolean;
  showDate?: boolean;
  showId?: boolean;
  showSignature?: boolean;
  showSeal?: boolean;
  recipientPrefix?: string;
  bodyText?: string;
  dateLabel?: string;
  logoUrl?: string;
  showLogo?: boolean;
  logoSize?: number;
}
