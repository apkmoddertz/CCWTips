import React, { useState, useEffect } from 'react';
import { MatchTip } from '../types';
import { VipCountdown } from './VipCountdown';
import { 
  User, 
  Edit2, 
  Check, 
  X, 
  Bookmark, 
  TrendingUp, 
  Trash2, 
  Award, 
  Gem, 
  CircleDot, 
  Bell, 
  Sparkles, 
  Settings, 
  ArrowRight,
  Info,
  Globe,
  MapPin,
  ChevronDown,
  Search,
  CheckCircle2,
  Compass,
  Map
} from 'lucide-react';

interface UserProfileProps {
  user: {
    uid: string;
    email: string;
    role: 'user' | 'admin';
    isVip: boolean;
    username?: string;
    vipStartDate?: string;
    vipEndDate?: string;
    country?: string;
    city?: string;
  };
  onUpdateUsername: (newUsername: string) => Promise<void>;
  onUpdateLocation: (country: string, city: string) => Promise<void>;
  onDirectToPlans: () => void;
  allMatches: MatchTip[];
  followedTipIds: string[];
  onToggleFollow: (matchId: string) => void;
  onToggleVip: () => void;
}

// Custom Cow Avatar Assets available in our project directory
const AVAILABLE_AVATARS = [
  { id: 'cow1', name: 'Golden Cow VIP', path: 'https://i.ibb.co/Lhzt1vX1/cashcowlogo.png' }
];

interface CountryData {
  country: string;
  cities: string[];
}

const PRESET_COUNTRIES: CountryData[] = [
  {
    country: "Tanzania",
    cities: ["Dar es Salaam", "Zanzibar", "Dodoma", "Arusha", "Mwanza", "Morogoro", "Tanga", "Kahama", "Tabora", "Kigoma", "Iringa", "Mbeya"]
  },
  {
    country: "Kenya",
    cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Malindi", "Thika", "Kitale", "Garissa", "Nyeri", "Kericho"]
  },
  {
    country: "Uganda",
    cities: ["Kampala", "Entebbe", "Gulu", "Lira", "Mbarara", "Jinja", "Mbale", "Masaka", "Kasese", "Njeru"]
  },
  {
    country: "Nigeria",
    cities: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City", "Kaduna", "Enugu", "Aba", "Jos", "Ilorin"]
  },
  {
    country: "Ghana",
    cities: ["Accra", "Kumasi", "Tamale", "Takoradi", "Achimota", "Tema", "Cape Coast", "Obuasi", "Koforidua"]
  },
  {
    country: "South Africa",
    cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "Soweto", "East London"]
  },
  {
    country: "Zambia",
    cities: ["Lusaka", "Kitwe", "Ndola", "Kabwe", "Chingola", "Mufulira", "Luanshya", "Livingstone"]
  },
  {
    country: "United Kingdom",
    cities: ["London", "Birmingham", "Leeds", "Glasgow", "Sheffield", "Manchester", "Liverpool", "Bristol", "Cardiff", "Edinburgh", "Belfast"]
  },
  {
    country: "United States",
    cities: ["Austin", "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Miami", "Seattle"]
  },
  {
    country: "Spain",
    cities: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga", "Murcia", "Palma de Mallorca"]
  },
  {
    country: "Germany",
    cities: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund"]
  },
  {
    country: "Sweden",
    cities: ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping"]
  },
  {
    country: "Brazil",
    cities: ["Sao Paulo", "Rio de Janeiro", "Brasilia", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus"]
  },
  {
    country: "United Arab Emirates",
    cities: ["Dubai", "Abu Dhabi", "Sharjah", "Al Ain", "Ajman", "Ras Al Khaimah"]
  }
];

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onUpdateUsername,
  onUpdateLocation,
  onDirectToPlans,
  allMatches,
  followedTipIds,
  onToggleFollow,
  onToggleVip,
}) => {
  // Username component state
  const [isEditing, setIsEditing] = useState(false);
  const [usernameInput, setUsernameInput] = useState(user.username || '');
  const [isSaving, setIsSaving] = useState(false);

  // Filter for history listing
  const [historyFilter, setHistoryFilter] = useState<'all' | 'win' | 'lose' | 'pending'>('all');

  // Avatar choosing state
  const [activeAvatarPath, setActiveAvatarPath] = useState<string>(() => {
    const cached = localStorage.getItem(`avatar_${user.uid}`);
    if (cached && cached.startsWith('http')) return cached;
    return AVAILABLE_AVATARS[0].path;
  });
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // States for Country & City Interactive Selection
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(user.country || '');
  const [selectedCity, setSelectedCity] = useState(user.city || '');
  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  // Remote loaded list of countries with online fallback support
  const [countriesList, setCountriesList] = useState<CountryData[]>(PRESET_COUNTRIES);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Dynamic automatic fetch of exact countries/cities mapping from free public API
  useEffect(() => {
    let active = true;
    setLoadingLocations(true);
    fetch('https://countriesnow.space/api/v0.1/countries')
      .then(res => {
        if (!res.ok) throw new Error("HTTP connection check failed");
        return res.json();
      })
      .then(res => {
        if (active && res && !res.error && Array.isArray(res.data)) {
          const fetched: CountryData[] = res.data.map((item: any) => ({
            country: item.country,
            cities: Array.isArray(item.cities) ? item.cities : []
          }));
          if (fetched.length > 0) {
            // Keep popular football/prediction presets at top of the search stack, sort remainder
            const presetNames = new Set(PRESET_COUNTRIES.map(p => p.country));
            const uniqueFetched = fetched.filter(f => !presetNames.has(f.country));
            setCountriesList([...PRESET_COUNTRIES, ...uniqueFetched]);
          }
        }
      })
      .catch(err => {
        console.warn("Using high-fidelity client-side offline presets:", err);
      })
      .finally(() => {
        if (active) setLoadingLocations(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Sync state if user database records update asynchronously
  useEffect(() => {
    if (user.country) setSelectedCountry(user.country);
    if (user.city) setSelectedCity(user.city);
  }, [user.country, user.city]);

  // Notification states stored in LocalStorage per UID
  const [notifications, setNotifications] = useState({
    freeTips: true,
    vipTips: false,
    goalAlerts: true,
    newsletter: false,
  });

  const [notificationSuccess, setNotificationSuccess] = useState(false);

  // Sync username input when user prop changes
  useEffect(() => {
    if (user.username) {
      setUsernameInput(user.username);
    }
  }, [user.username]);

  // Load user notification preferences from localStorage
  useEffect(() => {
    const cachedPrefs = localStorage.getItem(`notification_prefs_${user.uid}`);
    if (cachedPrefs) {
      try {
        setNotifications(JSON.parse(cachedPrefs));
      } catch (err) {
        console.error('Failed parsing notification preferences from local cache:', err);
      }
    }
  }, [user.uid]);

  // Handle saving username
  const handleSaveUsername = async () => {
    if (!usernameInput.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateUsername(usernameInput.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to translate username update to Firestore:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving selected location
  const handleSaveLocation = async (countryName: string, cityName: string) => {
    if (!countryName || !cityName) return;
    setIsSavingLocation(true);
    try {
      await onUpdateLocation(countryName.trim(), cityName.trim());
      setIsEditingLocation(false);
      setCountrySearch('');
      setCitySearch('');
    } catch (err) {
      console.error('Failed to update profile location in database:', err);
    } finally {
      setIsSavingLocation(false);
    }
  };

  // Profile avatar setup
  const handleSelectAvatar = (path: string) => {
    setActiveAvatarPath(path);
    localStorage.setItem(`avatar_${user.uid}`, path);
    setIsAvatarModalOpen(false);
  };

  // Preference changes
  const handleTogglePreference = (key: keyof typeof notifications) => {
    const nextPrefs = {
      ...notifications,
      [key]: !notifications[key],
    };
    setNotifications(nextPrefs);
    localStorage.setItem(`notification_prefs_${user.uid}`, JSON.stringify(nextPrefs));
    
    // Quick micro-interaction success cue
    setNotificationSuccess(true);
    setTimeout(() => setNotificationSuccess(false), 1500);
  };

  // --- DERIVE PERFORMANCE METRICS ---
  const followedMatches = allMatches.filter((m) => followedTipIds.includes(m.id));
  const totalFollowed = followedMatches.length;
  const wins = followedMatches.filter((m) => m.status === 'win').length;
  const losses = followedMatches.filter((m) => m.status === 'lose').length;
  const pending = followedMatches.filter((m) => m.status === 'pending').length;

  const finishedTips = totalFollowed - pending;
  const winRate = finishedTips > 0 ? Math.round((wins / finishedTips) * 100) : 0;

  // Cumulative Yield/Odds tracking (Wins add (odds - 1), losses subtract 1)
  const simulatedROI = followedMatches.reduce((acc, m) => {
    if (m.status === 'win') {
      return acc + ((m.odds || 1.5) - 1);
    } else if (m.status === 'lose') {
      return acc - 1;
    }
    return acc;
  }, 0);

  // Form Guide bullet generators (last 5 results)
  const formGuide = followedMatches
    .filter((m) => m.status !== 'pending')
    .slice(-5)
    .map((m) => m.status);

  // Filter history items list
  const filteredHistory = followedMatches
    .filter((m) => {
      if (historyFilter === 'all') return true;
      return m.status === historyFilter;
    })
    .sort((a, b) => {
      const dateCompare = (b.dateId || '').localeCompare(a.dateId || '');
      if (dateCompare !== 0) return dateCompare;
      return (b.time || '').localeCompare(a.time || '');
    });

  return (
    <div className="px-4 space-y-4">
      
      {/* 1. HERO AVATAR & IDENTITY PLATE */}
      <div className="bg-[#121724] border border-[#1E2538] rounded-[24px] p-4.5 relative overflow-hidden shadow-lg">
        {/* Neon corner design flourish */}
        <div className="absolute right-0 top-0 w-20 h-20 bg-gradient-to-bl from-[#F5C400]/8 to-transparent pointer-events-none rounded-tr-[24px]" />
        
        <div className="flex items-center gap-4">
          {/* Circular Framed Avatar */}
          <div className="relative group flex-shrink-0">
            {/* Glowing active outline */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#F5C400] to-amber-500 opacity-60 blur-[3px] group-hover:opacity-100 transition duration-300"></div>
            
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="relative h-18 w-18 rounded-full overflow-hidden bg-[#0A0D18] border-2 border-[#F5C400] flex items-center justify-center cursor-pointer hover:scale-103 transition-transform duration-200"
              title="Change Cow Profile Icon"
            >
              <img
                src={activeAvatarPath}
                alt="Cow Mascot Avatar"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Overlapping camera icon on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] font-bold text-[#F5C400] uppercase tracking-wider text-center p-1 font-mono">
                edit
              </div>
            </button>
          </div>

          {/* User Details & Edit Form */}
          <div className="min-w-0 flex-1">
            <span className="block text-[8px] font-mono uppercase tracking-widest text-slate-500 leading-none mb-1">
              Active Member Profile
            </span>

            {isEditing ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="text"
                  maxLength={40}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="bg-[#171E2F] border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-white focus:border-[#F5C400] outline-none w-full min-w-0"
                  placeholder="Insert username..."
                  disabled={isSaving}
                  autoFocus
                />
                <button
                  onClick={handleSaveUsername}
                  disabled={isSaving}
                  className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition active:scale-90 flex-shrink-0 cursor-pointer"
                  title="Confirm change"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setUsernameInput(user.username || '');
                    setIsEditing(false);
                  }}
                  disabled={isSaving}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition active:scale-90 flex-shrink-0 cursor-pointer"
                  title="Cancel Change"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5 group">
                <h2 className="text-sm font-black text-white truncate uppercase tracking-wide leading-tight">
                  {user.username || user.email.split('@')[0] || 'Premium Cow VIP'}
                </h2>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-slate-500 hover:text-[#F5C400] transition active:scale-95 cursor-pointer"
                  title="Modify username"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}

            <p className="text-[10px] text-slate-400 select-all truncate font-mono mt-0.5 leading-none">
              {user.email}
            </p>

            {/* Dynamic Location Badge */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="flex items-center gap-1 bg-slate-950 border border-slate-800/80 px-2.5 py-1 rounded-full text-slate-300">
                <MapPin className="w-2.8 h-2.8 text-[#F5C400]" />
                <span className="text-[9.5px] font-mono uppercase font-black tracking-wider">
                  {user.country && user.city ? `${user.city}, ${user.country}` : 'Location Unset'}
                </span>
              </span>
              <button
                onClick={() => setIsEditingLocation(true)}
                className="text-[9px] font-black text-[#F5C400] hover:text-[#ffe04d] uppercase tracking-widest bg-[#F5C400]/8 hover:bg-[#F5C400]/15 border border-[#F5C400]/30 px-2.5 py-1 rounded-full transition active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <Compass className="w-2.8 h-2.8" />
                <span>{user.country && user.city ? 'Change' : 'Set Location'}</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[8px] font-mono tracking-wider font-extrabold text-[#F5C400] bg-[#F5C400]/8 border border-[#F5C400]/25 px-2 py-0.5 rounded-full uppercase">
                  {user.role === 'admin' ? 'SYSTEM OWNER' : 'FREE USER'}
                </span>

                {user.isVip ? (
                  <span className="text-[8px] font-mono tracking-wider font-extrabold text-emerald-400 bg-emerald-500/8 border border-emerald-500/25 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                    <Gem className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" /> Premium Active
                  </span>
                ) : (
                  <span className="text-[8px] font-mono tracking-wider font-extrabold text-slate-450 bg-slate-900 border border-slate-800 px-2 py-0.3 rounded-full uppercase">
                    VIP Dormant
                  </span>
                )}
              </div>

              {user.isVip && user.vipStartDate && user.vipEndDate && (
                <div className="space-y-1.5 text-left">
                  <p className="text-[9px] font-mono text-emerald-400/80 font-bold leading-none pl-0.5">
                    📅 Access Period: {user.vipStartDate} to {user.vipEndDate}
                  </p>
                  <div className="pt-1">
                    <VipCountdown
                      vipEndDate={user.vipEndDate}
                      isVip={user.isVip}
                      onRedirectToPlans={onDirectToPlans}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Location Finder and Selection Panel */}
      {isEditingLocation && (
        <div className="bg-[#121724] border-2 border-[#F5C400]/70 rounded-[24px] p-4 relative overflow-visible shadow-lg shadow-black/50" id="location-editor-panel">
          <div className="flex items-center justify-between mb-2.5 border-b border-slate-850 pb-2">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#F5C400] animate-pulse" />
              <h4 className="text-[11px] font-black uppercase text-white tracking-widest font-sans">Select Your Location</h4>
            </div>
            <button
              onClick={() => {
                setIsEditingLocation(false);
                setSelectedCountry(user.country || '');
                setSelectedCity(user.city || '');
                setCountrySearch('');
                setCitySearch('');
                setIsCountryDropdownOpen(false);
                setIsCityDropdownOpen(false);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-900 transition active:scale-90 cursor-pointer"
              title="Close editor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[9px] text-slate-400 font-sans leading-relaxed mb-3">
            To avoid errors, choose your country first and its verified cities list will load automatically. Use the filter bars to find them fast.
          </p>

          <div className="space-y-3.5">
            {/* COUNTRY PICKER */}
            <div className="relative">
              <label className="block text-[8.5px] font-mono text-slate-450 uppercase tracking-widest mb-1.2 font-extrabold">
                1. SELECT COUNTRY <span className="text-red-500">*</span>
              </label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Type to search country..."
                  value={countrySearch || selectedCountry}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    setSelectedCountry('');
                    setSelectedCity('');
                    setIsCountryDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setIsCountryDropdownOpen(true);
                    setIsCityDropdownOpen(false);
                  }}
                  className="w-full bg-[#0A0D18] border border-slate-800 focus:border-[#F5C400]/70 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-550 outline-none transition"
                />
                
                {selectedCountry && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                )}
                
                {!selectedCountry && (
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                )}
              </div>

              {/* Country suggestion list */}
              {isCountryDropdownOpen && (
                <div className="absolute z-30 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-[#070A12] border border-slate-800 rounded-xl shadow-2xl p-1 divide-y divide-slate-900 scrollbar-none">
                  {loadingLocations && countriesList.length === PRESET_COUNTRIES.length ? (
                    <div className="text-center py-2 text-[10px] text-slate-500 font-mono">
                      🔄 LOADING WORLD MAP DIRECTORY...
                    </div>
                  ) : null}
                  
                  {(() => {
                    const searchStr = (countrySearch || selectedCountry).toLowerCase();
                    const filteredCountries = countriesList.filter(c =>
                      c.country.toLowerCase().includes(searchStr)
                    );
                    
                    if (filteredCountries.length === 0) {
                      return (
                        <div className="text-center py-3 text-slate-500 text-[10px] font-mono">
                          ⚠️ COUNTRY NOT FOUND. PLEASE RE-TYPE
                        </div>
                      );
                    }
                    
                    return filteredCountries.map((c) => (
                      <button
                        key={c.country}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c.country);
                          setCountrySearch(c.country);
                          setIsCountryDropdownOpen(false);
                          
                          // Reset city states to prepare for new country's cities
                          setSelectedCity('');
                          setCitySearch('');
                          
                          // AUTOMATICALLY open city selection to make it extremely easy
                          setIsCityDropdownOpen(true);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-between text-slate-200 hover:bg-[#F5C400]/10 hover:text-white cursor-pointer ${
                          selectedCountry === c.country ? 'bg-[#F5C400]/8 text-[#F5C400]' : ''
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>{c.country}</span>
                        </span>
                        
                        {PRESET_COUNTRIES.some(p => p.country === c.country) && (
                          <span className="text-[8px] font-mono text-[#F5C400] bg-[#F5C400]/8 border border-[#F5C400]/20 px-1 rounded">
                            Popular
                          </span>
                        )}
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* CITY PICKER - APPEARS AUTOMATICALLY AFTER SELECTING COUNTRY */}
            {selectedCountry ? (
              <div className="relative">
                <label className="block text-[8.5px] font-mono text-slate-450 uppercase tracking-widest mb-1.2 font-extrabold">
                  2. SELECT CITY IN {selectedCountry.toUpperCase()} <span className="text-red-500">*</span>
                </label>
                
                <div className="relative">
                  <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder={`Type to search cities in ${selectedCountry}...`}
                    value={citySearch || selectedCity}
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      setSelectedCity('');
                      setIsCityDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsCityDropdownOpen(true);
                      setIsCountryDropdownOpen(false);
                    }}
                    className="w-full bg-[#0A0D18] border border-slate-800 focus:border-[#F5C400]/70 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-550 outline-none transition animate-pulse duration-1000"
                  />
                  
                  {selectedCity && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-bounce" />
                  )}
                  
                  {!selectedCity && (
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  )}
                </div>

                {/* City suggestion list */}
                {isCityDropdownOpen && (
                  <div className="absolute z-35 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-[#070A12] border border-slate-800 rounded-xl shadow-2xl p-1 divide-y divide-slate-900 scrollbar-none animate-fadeIn">
                    {(() => {
                      const countryData = countriesList.find(c => c.country === selectedCountry);
                      const availableCities = countryData ? countryData.cities : [];
                      
                      const searchStr = (citySearch || selectedCity).toLowerCase();
                      const filteredCities = availableCities.filter(city =>
                        city.toLowerCase().includes(searchStr)
                      );
                      
                      if (filteredCities.length === 0) {
                        return (
                          <div className="p-3 text-center text-slate-450 text-[10px] font-mono">
                            {citySearch ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCity(citySearch);
                                  setIsCityDropdownOpen(false);
                                }}
                                className="block mx-auto text-[#F5C400] hover:underline font-extrabold text-[9.5px] uppercase tracking-wide cursor-pointer"
                              >
                                Type error? Click to set Custom: "{citySearch}"
                              </button>
                            ) : (
                              'No loaded standard cities for this country.'
                            )}
                          </div>
                        );
                      }
                      
                      return filteredCities.slice(0, 50).map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setSelectedCity(city);
                            setCitySearch(city);
                            setIsCityDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-between text-slate-200 hover:bg-[#F5C400]/10 hover:text-white cursor-pointer ${
                            selectedCity === city ? 'bg-[#F5C400]/8 text-[#F5C400]' : ''
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{city}</span>
                          </span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-3.5 bg-[#090D18] border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center">
                <Compass className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono">WAITING FOR COUNTRY SELECTION...</span>
              </div>
            )}

            {/* ACTION FOOTER BUTTONS */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
              <button
                type="button"
                disabled={isSavingLocation || !selectedCountry || !selectedCity}
                onClick={() => handleSaveLocation(selectedCountry, selectedCity)}
                className="flex-1 bg-gradient-to-r from-amber-500 to-[#F5C400] hover:from-amber-600 hover:to-yellow-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-[10.5px] py-2 px-3.5 rounded-xl transition duration-200 uppercase flex items-center justify-center gap-1 cursor-pointer"
              >
                {isSavingLocation ? (
                  <span>Saving location...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Location</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsEditingLocation(false);
                  setSelectedCountry(user.country || '');
                  setSelectedCity(user.city || '');
                  setCountrySearch('');
                  setCitySearch('');
                  setIsCountryDropdownOpen(false);
                  setIsCityDropdownOpen(false);
                }}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 font-bold text-[10px] tracking-wider py-2 px-4 rounded-xl transition cursor-pointer uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. AVATAR CHOOSER MODAL SHEET (OVERLAY COMPACT) */}
      {isAvatarModalOpen && (
        <div className="bg-[#0A0E1A] border border-[#1E2538] rounded-2xl p-4 shadow-xl z-20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#F5C400] font-black">Choose Mascot Icon</span>
            <button 
              onClick={() => setIsAvatarModalOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-900 transition active:scale-90"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {AVAILABLE_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleSelectAvatar(avatar.path)}
                className={`relative flex flex-col items-center p-2 rounded-xl border transition cursor-pointer hover:border-[#F5C400]/50 ${
                  activeAvatarPath === avatar.path 
                    ? 'bg-[#F5C400]/10 border-[#F5C400] text-[#F5C400]' 
                    : 'bg-[#111524] border-slate-800 text-slate-400'
                }`}
              >
                <img
                  src={avatar.path}
                  alt={avatar.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700/50 mb-1 pointer-events-none"
                />
                <span className="text-[8.5px] font-bold uppercase tracking-tight">{avatar.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. BENTO PERFORMANCE METRICS GRID */}
      <div className="grid grid-cols-2 gap-3">
        {/* Win Rate Grid Card */}
        <div className="bg-[#121724] border border-[#1E2538] rounded-[20px] p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-450 font-bold">Total Win Rate</span>
            <Award className="w-4 h-4 text-[#F5C400]" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white font-heading">{winRate}%</span>
              <span className="text-[9px] font-mono text-emerald-400 font-extrabold uppercase">ACCURATE</span>
            </div>
            <p className="text-[8.5px] text-slate-500 font-mono leading-tight mt-1">
              Derived from <span className="text-slate-350">{wins} wins</span> out of <span className="text-slate-350">{finishedTips} resolved</span> predictions in history tracker.
            </p>
          </div>
        </div>

        {/* Profit Tracker card */}
        <div className="bg-[#121724] border border-[#1E2538] rounded-[20px] p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-450 font-bold">Odds Yield</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black font-heading ${simulatedROI >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {simulatedROI >= 0 ? '+' : ''}{simulatedROI.toFixed(2)}
              </span>
              <span className="text-[8.5px] text-slate-450 font-extrabold uppercase font-mono">PTS</span>
            </div>
            {/* Horizontal mini form guide */}
            <div className="flex items-center gap-1.2 mt-2 select-none">
              <span className="text-[8px] text-slate-500 uppercase font-mono mr-1">Streak:</span>
              {formGuide.length === 0 ? (
                <span className="text-[8px] text-slate-500 font-mono italic">No data</span>
              ) : (
                formGuide.map((outcome, idx) => (
                  <span
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black uppercase text-center ${
                      outcome === 'win'
                        ? 'bg-[#00B140] text-black'
                        : outcome === 'lose'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {outcome === 'win' ? 'W' : 'L'}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tracker Overview Mini stats */}
        <div className="col-span-2 grid grid-cols-3 gap-2 bg-[#090D18] border border-slate-850 p-3 rounded-2xl">
          <div className="text-center border-r border-slate-800/60 py-0.5">
            <span className="block text-[8px] font-mono text-slate-500 uppercase">Tracked Tips</span>
            <span className="text-sm font-extrabold text-slate-100">{totalFollowed}</span>
          </div>
          <div className="text-center border-r border-slate-800/60 py-0.5">
            <span className="block text-[8px] font-mono text-slate-500 uppercase">Won Predictions</span>
            <span className="text-sm font-extrabold text-[#00B140]">{wins}</span>
          </div>
          <div className="text-center py-0.5">
            <span className="block text-[8px] font-mono text-slate-500 uppercase">In Progress</span>
            <span className="text-sm font-extrabold text-amber-500">{pending}</span>
          </div>
        </div>
      </div>

      {/* 4. SUBSCRIPTION MANAGE PLATFORM DETAILS */}
      <div className="bg-[#121724] border border-[#1E2538] rounded-[24px] p-4 relative overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 mb-2.5">
          <Gem className="w-4 h-4 text-[#F5C400] fill-[#F5C400]/25" />
          <h4 className="text-xs font-black uppercase text-slate-200 tracking-wide font-sans">Active Subscription Control</h4>
        </div>

        {user.isVip ? (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-black text-emerald-400 uppercase tracking-wide">6 MONTH PLAN ACTIVE</span>
                  <span className="block text-[8px] font-mono text-slate-400 mt-0.5">Full access to High-Odds VIP categories</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] font-mono text-emerald-400 uppercase font-bold">Status: Active</span>
                  <span className="block text-[7.5px] text-slate-500 mt-0.5">Auto-renews 2026-12-02</span>
                </div>
              </div>
            </div>

            {user.role === 'admin' && (
              <div className="flex items-center gap-2 justify-between pt-1">
                <span className="text-[9.5px] text-slate-450 italic leading-snug pr-2">
                  Simulating actual payment systems in dev? Toggle VIP privileges instantly:
                </span>
                <button
                  type="button"
                  onClick={onToggleVip}
                  className="bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/15 text-rose-400 font-extrabold text-[9px] uppercase px-3 py-1.8 rounded-xl shrink-0 transition active:scale-95 cursor-pointer font-sans"
                >
                  Deactivate VIP
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-900 flex justify-between items-center">
              <div>
                <span className="block text-[9px] font-mono text-slate-450 uppercase font-black">Current package:</span>
                <span className="block text-[11px] font-extrabold text-[#F5C400] mt-0.5 uppercase tracking-wide uppercase">Standard Free Tier</span>
              </div>
              
              <button
                type="button"
                onClick={onDirectToPlans}
                className="bg-[#F5C400] hover:bg-[#ffe04d] text-slate-950 text-[10px] font-black uppercase px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-md shadow-[#F5C400]/20 font-sans"
              >
                Upgrade <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {user.role === 'admin' && (
              <div className="flex items-center justify-between text-[9px] bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                <span className="text-slate-400">Instantly unlocked for evaluation?</span>
                <button
                  type="button"
                  onClick={onToggleVip}
                  className="text-[#F5C400] font-black uppercase text-[8.5px] bg-[#F5C400]/10 hover:bg-[#F5C400]/18 px-3 py-1 rounded-lg border border-[#F5C400]/25 transition active:scale-95 cursor-pointer font-sans"
                >
                  Simulate Unlock
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. NOTIFICATION SLIDE TOGGLES */}
      <div className="bg-[#121724] border border-[#1E2538] rounded-[24px] p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-black uppercase text-slate-200 tracking-wide font-sans">Notification Preferences</h4>
          </div>
          {notificationSuccess && (
            <span className="text-[8.5px] font-mono text-emerald-400 font-extrabold animate-pulse uppercase">Saved!</span>
          )}
        </div>

        <div className="space-y-2.5">
          {/* Free Tips Slide */}
          <div className="flex items-center justify-between bg-slate-950/75 p-2 px-3 rounded-xl border border-slate-900">
            <div>
              <span className="block text-[10px] font-black text-slate-100 uppercase tracking-wide">Daily Free Tips Alerts</span>
              <span className="block text-[8px] text-slate-500">Instant notification when daily free picks are published</span>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePreference('freeTips')}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                notifications.freeTips ? 'bg-[#F2C400]' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  notifications.freeTips ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* VIP Tips Slide */}
          <div className="flex items-center justify-between bg-slate-950/75 p-2 px-3 rounded-xl border border-slate-900">
            <div>
              <span className="block text-[10px] font-black text-slate-100 uppercase tracking-wide">VIP Prediction Updates</span>
              <span className="block text-[8px] text-slate-500 font-normal">Push notification for premium analysis uploads</span>
            </div>
            <button
              type="button"
              disabled={!user.isVip}
              onClick={() => handleTogglePreference('vipTips')}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                !user.isVip ? 'opacity-30 cursor-not-allowed' : ''
              } ${notifications.vipTips && user.isVip ? 'bg-[#F2C400]' : 'bg-slate-800'}`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  notifications.vipTips && user.isVip ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Win/Loss alerts */}
          <div className="flex items-center justify-between bg-slate-950/75 p-2 px-3 rounded-xl border border-slate-900">
            <div>
              <span className="block text-[10px] font-black text-slate-100 uppercase tracking-wide">Match Goals & Outcome Alerts</span>
              <span className="block text-[8px] text-slate-500 font-normal">Real-time status updates as results settle (Win/Lose)</span>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePreference('goalAlerts')}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                notifications.goalAlerts ? 'bg-[#F2C400]' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  notifications.goalAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Weekly recaps alerts */}
          <div className="flex items-center justify-between bg-slate-950/75 p-2 px-3 rounded-xl border border-slate-900">
            <div>
              <span className="block text-[10px] font-black text-slate-100 uppercase tracking-wide">Weekly Profit & Performance Report</span>
              <span className="block text-[8px] text-slate-500 font-normal">Receive detailed weekly stats, win streaks and yield scores</span>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePreference('newsletter')}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                notifications.newsletter ? 'bg-[#F2C400]' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  notifications.newsletter ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 6. HISTORY OF TRACKED PREDICTIONS WALLET */}
      <div className="space-y-3">
        {/* Section Header with status filters */}
        <div className="flex flex-col gap-2 border-b border-slate-850 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-[#F5C400]" />
              <span>Personal Tracking History</span>
            </span>
            <span className="text-[9.5px] bg-[#0A0D18] border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
              {filteredHistory.length} Matches
            </span>
          </div>

          {/* Mini filters timeline row */}
          <div className="flex items-center gap-1 text-[9px] select-none font-sans mt-0.5">
            <button
              onClick={() => setHistoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-black uppercase transition shrink-0 ${
                historyFilter === 'all'
                  ? 'bg-[#F5C400] text-black font-extrabold'
                  : 'bg-[#111524] text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setHistoryFilter('win')}
              className={`px-2.5 py-1 rounded-lg font-black uppercase transition shrink-0 flex items-center gap-0.5 ${
                historyFilter === 'win'
                  ? 'bg-[#00B140] text-black font-extrabold'
                  : 'bg-[#111524] text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#000]" /> Wins
            </button>
            <button
              onClick={() => setHistoryFilter('lose')}
              className={`px-2.5 py-1 rounded-lg font-black uppercase transition shrink-0 flex items-center gap-0.5 ${
                historyFilter === 'lose'
                  ? 'bg-rose-500 text-white font-extrabold'
                  : 'bg-[#111524] text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" /> Losses
            </button>
            <button
              onClick={() => setHistoryFilter('pending')}
              className={`px-2.5 py-1 rounded-lg font-black uppercase transition shrink-0 flex items-center gap-0.5 ${
                historyFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-extrabold'
                  : 'bg-[#111524] text-slate-400 hover:text-white'
              }`}
            >
              Pending
            </button>
          </div>
        </div>

        {/* Dynamic history rows list */}
        {filteredHistory.length > 0 ? (
          <div className="space-y-2.5">
            {filteredHistory.map((m) => (
              <div 
                key={m.id} 
                className="bg-[#121724] border border-[#1E2538] hover:border-[#F5C400]/25 rounded-[18px] p-3 text-xs leading-normal relative group transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#F5C400] bg-[#F5C400]/10 border border-[#F5C400]/20 px-2 py-0.3 rounded uppercase font-mono tracking-wider">
                      {m.type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-450 uppercase">{m.dateId}</span>
                  </div>

                  {/* Remove Follow button */}
                  <button
                    onClick={() => onToggleFollow(m.id)}
                    className="p-1 text-slate-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition active:scale-90 opacity-40 group-hover:opacity-100 cursor-pointer"
                    title="Remove item from tracking history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 font-bold text-[11.5px] text-slate-200 mt-2 bg-[#1B2132]/50 p-1.5 rounded-lg text-center font-sans tracking-wide">
                  <span className="truncate">{m.homeTeam}</span>
                  <span className="text-[10px] font-black uppercase text-[#F5C400] px-1 font-mono">VS</span>
                  <span className="truncate">{m.awayTeam}</span>
                </div>

                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/40">
                  <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                    <span className="text-[11.5px] font-extrabold text-slate-100 font-mono shrink-0">{m.time}</span>
                    <span className="text-slate-500 shrink-0 select-none text-[10px]">→</span>
                    <span className="text-slate-300 font-bold truncate text-[11.5px] leading-tight">
                      {m.prediction}
                      {m.odds !== undefined && m.odds !== null && (
                        <span className="text-[#F5C400] font-extrabold text-[11.5px] ml-0.5 tracking-wide select-none">
                          @{Number(m.odds).toFixed(2)}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {m.status === 'win' && (
                      <span className="bg-[#00B140] text-black font-black text-[9.5px] uppercase py-0.5 px-2.2 rounded-full select-none">
                        Win
                      </span>
                    )}
                    {m.status === 'lose' && (
                      <span className="bg-rose-600 text-white font-black text-[9.5px] uppercase py-0.5 px-2.2 rounded-full select-none">
                        Lose
                      </span>
                    )}
                    {m.status === 'pending' && (
                      <span className="bg-amber-500 text-slate-950 font-black text-[9.5px] py-0.5 px-2.2 rounded-full select-none font-mono">
                        Hold
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty History Tracker State */
          <div className="bg-[#0D1222]/30 border border-dashed border-slate-800 rounded-[22px] py-10 px-5 text-center shadow-inner select-none">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3.5 text-slate-550">
              <Info className="w-4.5 h-4.5" />
            </div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">No Predictions Tracked</h4>
            <p className="text-slate-500 text-[10.5px] mt-1.5 max-w-xs mx-auto leading-relaxed font-sans">
              Matches you bookmarked or backed will appear in this performance dashboard. Browse daily free or premium categories to get started!
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
