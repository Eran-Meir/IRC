export interface Message {
  id: string;
  sender: string;
  target: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  isAction?: boolean;
  isWhois?: boolean;
  isRtl?: boolean;
}

export interface Channel {
  name: string;
  topic: string;
  unreadCount: number;
  users: string[];
}

export type ThemeOption = 'mirc-dark' | 'matrix-emerald' | 'cyberpunk' | 'classic-light';
export type FontSizeOption = '12px' | '14px' | '16px' | '18px' | '20px' | 'small' | 'medium' | 'large';
export type FontFamilyOption = 'fixedsys' | 'fira-code' | 'monospace';
export type LanguageOption = 'en' | 'he';

export interface UserPreferences {
  theme: ThemeOption;
  fontSize: FontSizeOption;
  fontFamily: FontFamilyOption;
  language: LanguageOption;
  showUserList: boolean;
  showTimestamps: boolean;
}
