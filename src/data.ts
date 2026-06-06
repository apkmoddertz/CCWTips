import { MatchTip, VIPPlan, DateItem } from './types';

// The precise list of date pills shown in the screenshots
export const INITIAL_DATES: DateItem[] = [
  { id: '2026-05-29', month: 'May', dayName: 'FRI', dayNumber: '29' },
  { id: '2026-05-30', month: 'May', dayName: 'SAT', dayNumber: '30' },
  { id: '2026-05-31', month: 'May', dayName: 'SUN', dayNumber: '31' },
  { id: '2026-06-01', month: 'June', dayName: 'MON', dayNumber: '01' },
  { id: '2026-06-02', month: 'June', dayName: 'TUE', dayNumber: '02' },
  { id: '2026-06-03', month: 'June', dayName: 'WED', dayNumber: '03' },
  { id: '2026-06-04', month: 'June', dayName: 'THU', dayNumber: '04' },
];

export const INITIAL_MATCHES: MatchTip[] = [
  // --- JUNE 01 MATCHES (EXACT ALIGNMENT WITH SCREENSHOTS!) ---
  // Free tips
  {
    id: 'f-jun1-1',
    homeTeam: 'Elva',
    awayTeam: 'Tartu Welco',
    time: '19:00',
    prediction: 'Draw or Away',
    odds: 1.65,
    status: 'win',
    type: 'free',
    dateId: '2026-06-01'
  },
  {
    id: 'f-jun1-2',
    homeTeam: 'Al Najaf',
    awayTeam: 'Al Zawraa',
    time: '20:30',
    prediction: 'Draw or Away',
    odds: 1.58,
    status: 'lose',
    type: 'free',
    dateId: '2026-06-01'
  },
  // VIP tips
  {
    id: 'v-jun1-1',
    homeTeam: 'Turkey',
    awayTeam: 'North Macedonia',
    time: '20:30',
    prediction: 'Half Time/Full Time: 1/1 @ 1.79',
    odds: 1.79,
    status: 'win',
    type: 'vip',
    dateId: '2026-06-01'
  },
  {
    id: 'v-jun1-2',
    homeTeam: 'Wadi Degla',
    awayTeam: 'Enppi',
    time: '20:00',
    prediction: 'Full Time Draw @ 3.00',
    odds: 3.00,
    status: 'lose',
    type: 'vip',
    dateId: '2026-06-01'
  },

  // --- MAY 31 MATCHES ---
  // Free tips
  {
    id: 'f-may31-1',
    homeTeam: 'Levante',
    awayTeam: 'Alaves',
    time: '18:30',
    prediction: 'Home Win or Draw',
    odds: 1.45,
    status: 'win',
    type: 'free',
    dateId: '2026-05-31'
  },
  {
    id: 'f-may31-2',
    homeTeam: 'Spezia',
    awayTeam: 'Torino',
    time: '15:00',
    prediction: 'Over 2.5 Goals',
    odds: 1.85,
    status: 'win',
    type: 'free',
    dateId: '2026-05-31'
  },
  // VIP tips
  {
    id: 'v-may31-1',
    homeTeam: 'Inter Milan',
    awayTeam: 'Lazio',
    time: '20:45',
    prediction: 'Home Win & Over 1.5 Goals @ 1.95',
    odds: 1.95,
    status: 'win',
    type: 'vip',
    dateId: '2026-05-31'
  },
  {
    id: 'v-may31-2',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    time: '17:30',
    prediction: 'Chelsea - Under 1.5 Team Goals @ 1.62',
    odds: 1.62,
    status: 'win',
    type: 'vip',
    dateId: '2026-05-31'
  },

  // --- MAY 30 MATCHES ---
  // Free Tips
  {
    id: 'f-may30-1',
    homeTeam: 'Eintracht Frankfurt',
    awayTeam: 'Freiburg',
    time: '14:30',
    prediction: 'Both Teams to Score',
    odds: 1.70,
    status: 'win',
    type: 'free',
    dateId: '2026-05-30'
  },
  {
    id: 'f-may30-2',
    homeTeam: 'Nantes',
    awayTeam: 'Montpellier',
    time: '19:00',
    prediction: 'Under 2.5 Goals',
    odds: 1.90,
    status: 'lose',
    type: 'free',
    dateId: '2026-05-30'
  },
  // VIP Tips
  {
    id: 'v-may30-1',
    homeTeam: 'Real Madrid',
    awayTeam: 'Real Betis',
    time: '21:00',
    prediction: 'Half Time: Real Madrid @ 1.82',
    odds: 1.82,
    status: 'win',
    type: 'vip',
    dateId: '2026-05-30'
  },

  // --- MAY 29 MATCHES ---
  // Free Tips
  {
    id: 'f-may29-1',
    homeTeam: 'Auxerre',
    awayTeam: 'Saint-Etienne',
    time: '20:45',
    prediction: 'Draw or Away',
    odds: 1.57,
    status: 'win',
    type: 'free',
    dateId: '2026-05-29'
  },
  // VIP Tips
  {
    id: 'v-may29-1',
    homeTeam: 'Dundalk',
    awayTeam: 'Shamrock Rovers',
    time: '19:45',
    prediction: 'Away Win @ 2.10',
    odds: 2.10,
    status: 'win',
    type: 'vip',
    dateId: '2026-05-29'
  },

  // --- JUNE 02 MATCHES (FUTURE/PENDING - Live/Upcoming predictions) ---
  // Free Tips
  {
    id: 'f-jun2-1',
    homeTeam: 'Sweden',
    awayTeam: 'Denmark',
    time: '19:00',
    prediction: 'Home Win or Draw',
    odds: 1.48,
    status: 'pending',
    type: 'free',
    dateId: '2026-06-02'
  },
  {
    id: 'f-jun2-2',
    homeTeam: 'Austria',
    awayTeam: 'Serbia',
    time: '20:45',
    prediction: 'Over 1.5 Goals',
    odds: 1.30,
    status: 'pending',
    type: 'free',
    dateId: '2026-06-02'
  },
  // VIP Tips
  {
    id: 'v-jun2-1',
    homeTeam: 'Portugal',
    awayTeam: 'Finland',
    time: '20:45',
    prediction: 'Portugal HDC -1.5 @ 1.80',
    odds: 1.80,
    status: 'pending',
    type: 'vip',
    dateId: '2026-06-02'
  },
  {
    id: 'v-jun2-2',
    homeTeam: 'Italy',
    awayTeam: 'Turkey',
    time: '21:00',
    prediction: 'Home Win & Under 3.5 Goals @ 2.15',
    odds: 2.15,
    status: 'pending',
    type: 'vip',
    dateId: '2026-06-02'
  },

  // --- JUNE 03 MATCHES ---
  // Free Tips
  {
    id: 'f-jun3-1',
    homeTeam: 'Belgium',
    awayTeam: 'Montenegro',
    time: '20:30',
    prediction: 'Belgium Win & Over 2.5 Goals',
    odds: 1.62,
    status: 'pending',
    type: 'free',
    dateId: '2026-06-03'
  },
  // VIP Tips
  {
    id: 'v-jun3-1',
    homeTeam: 'France',
    awayTeam: 'Luxembourg',
    time: '21:00',
    prediction: 'France Win Both Halves @ 1.65',
    odds: 1.65,
    status: 'pending',
    type: 'vip',
    dateId: '2026-06-03'
  },

  // --- JUNE 04 MATCHES ---
  // Free Tips
  {
    id: 'f-jun4-1',
    homeTeam: 'Netherlands',
    awayTeam: 'Canada',
    time: '20:45',
    prediction: 'Home Win',
    odds: 1.38,
    status: 'pending',
    type: 'free',
    dateId: '2026-06-04'
  },
  // VIP Tips
  {
    id: 'v-jun4-1',
    homeTeam: 'Germany',
    awayTeam: 'Greece',
    time: '20:45',
    prediction: 'Germany Win & Under 4.5 Goals @ 1.70',
    odds: 1.70,
    status: 'pending',
    type: 'vip',
    dateId: '2026-06-04'
  },
];

export const PLANS: VIPPlan[] = [
  { id: '1day', duration: '1 Day', price: 15, isPopular: false },
  { id: '5months', duration: '5 Months', price: 1550, isPopular: false, savings: 'Save 30%' },
  { id: '6months', duration: '6 Months', price: 1600, isPopular: true, savings: 'Best Value!' }
];
