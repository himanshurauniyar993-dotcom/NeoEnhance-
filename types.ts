
export interface EnhancementStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
  color: string;
}

export type UserRole = 'free' | 'subscriber' | 'vip';

export interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
  credits: number;
  isAdmin: boolean;
  role: UserRole;
  isSuspended: boolean;
  password?: string; // Simulated field
}

export interface WebSettings {
  siteName: string;
  logoText: string;
  logoUrl: string | null;
  themePrimary: string;
  themeSecondary: string;
  creditPrice: number;
  currency: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
