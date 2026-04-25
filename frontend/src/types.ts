export type SheetRow = {
  [key: string]: string | number | boolean | null;
};

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  preview?: SheetRow;
};

export type SummaryReport = {
  headline: string;
  summary: string;
  observations: string[];
  recommendations: string[];
};

export type AuthUser = {
  email?: string;
  name?: string;
  picture?: string;
};

export type UserProfile = {
  name: string;
  experienceLevel: string;
  primaryLanguage: string;
  leetcodeGoals: string;
  problemsSolved: number;
  dateFormat: string;
};
