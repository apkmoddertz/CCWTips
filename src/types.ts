/**
 * Types and interfaces for Cash Cow VIP prediction applet.
 */

export interface MatchTip {
  id: string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  prediction: string;
  odds?: number;
  status: 'win' | 'lose' | 'pending';
  type: 'free' | 'vip';
  dateId: string; // e.g. "2026-05-29", "2026-06-01"
}

export interface VIPPlan {
  id: string;
  duration: string;
  price: number;
  isPopular?: boolean;
  savings?: string;
}

export interface DateItem {
  id: string; // e.g., "2026-06-01"
  month: string; // e.g., "May" or "June"
  dayName: string; // e.g., "FRI", "SAT"
  dayNumber: string; // e.g., "29", "01"
}
