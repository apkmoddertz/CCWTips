import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, createUserProfile, fetchUserProfile, db } from '../firebase';
import { Mail, Lock, Sparkles, HelpCircle, ArrowLeft } from 'lucide-react';
const cowLogo = "https://i.ibb.co/Lhzt1vX1/cashcowlogo.png";

interface AuthFormProps {
  onAuthSuccess: (user: { uid: string; email: string; role: 'user' | 'admin'; isVip: boolean }) => void;
  onShowNotification: (msg: string, type: 'success' | 'info') => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess, onShowNotification }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Parse neat error from Auth Provider
  const getCleanAuthError = (err: any): string => {
    const code = err?.code || '';
    const message = err?.message || '';

    // Check for network errors or firebase offline failures first
    if (
      code === 'auth/network-request-failed' ||
      message.includes('network-request-failed') ||
      message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('failed to fetch')
    ) {
      return 'Connection error. Please check your internet connection and try again.';
    }

    switch (code) {
      case 'auth/invalid-email': return 'The email address is invalid.';
      case 'auth/user-disabled': return 'This user account has been disabled.';
      case 'auth/user-not-found': return 'No account matches this email or username.';
      case 'auth/wrong-password': return 'Incorrect password. Please verify and try again.';
      case 'auth/invalid-credential': return 'Invalid username, email, or incorrect password. Please try again.';
      case 'auth/email-already-in-use': return 'An account already exists with this email or username.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      default: {
        // Sanitize any other unmasked Firebase / Database labels from displaying to end-users
        if (message.includes('Firebase') || message.includes('firebase') || code.startsWith('auth/')) {
          return 'Authentication failed. Please check your username or password and try again.';
        }
        return message || 'Authentication failed. Please try again.';
      }
    }
  };

  const validateUsername = (uName: string): string | null => {
    const trimmed = uName.trim();
    if (trimmed.length < 3) {
      return 'Username must be at least 3 characters long.';
    }
    if (trimmed.length > 25) {
      return 'Username cannot be longer than 25 characters.';
    }
    if (trimmed.includes('@')) {
      return 'Username cannot resemble an email address or contain "@".';
    }
    if (trimmed.includes('.')) {
      return 'Username cannot contain dots "." or resemble email domains.';
    }
    if (trimmed.toLowerCase().endsWith('mail')) {
      return 'Username cannot end with "mail".';
    }
    
    const pattern = /^[a-zA-Z0-9_]+$/;
    if (!pattern.test(trimmed)) {
      return 'Username can only contain letters, numbers, and underscores.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'login') {
        const inputStr = emailOrUsername.trim();
        if (!inputStr) {
          setError('Please enter your username or email.');
          setLoading(false);
          return;
        }

        if (!password) {
          setError('Please enter your account password.');
          setLoading(false);
          return;
        }

        let finalEmail = inputStr;
        if (!inputStr.includes('@')) {
          // If the login text doesn't contain '@', it's a username.
          // Try to lookup the corresponding email from 'usernames' map:
          const usernameKey = inputStr.toLowerCase();
          try {
            const nameDoc = await getDoc(doc(db, 'usernames', usernameKey));
            if (nameDoc.exists()) {
              finalEmail = nameDoc.data().email;
            } else {
              // Graceful backwards-compatibility fallback for legacy users
              finalEmail = `${usernameKey}@cashcow.com`;
            }
          } catch (dbErr) {
            console.error('Error fetching email by username lookup:', dbErr);
            finalEmail = `${usernameKey}@cashcow.com`;
          }
        }

        // Authenticate User via Firebase Login
        const userCredential = await signInWithEmailAndPassword(auth, finalEmail, password);
        const fbUser = userCredential.user;
        
        let profile = await fetchUserProfile(fbUser.uid);
        if (!profile) {
          profile = await createUserProfile(fbUser.uid, fbUser.email || finalEmail);
        }

        onAuthSuccess({
          uid: fbUser.uid,
          email: fbUser.email || finalEmail,
          role: profile.role,
          isVip: profile.isVip
        });
        onShowNotification('Successfully authenticated with premium server!', 'success');
      } else {
        const uName = regUsername.trim();
        const uEmail = regEmail.trim();

        if (!uName) {
          setError('Please enter a username.');
          setLoading(false);
          return;
        }

        const uError = validateUsername(uName);
        if (uError) {
          setError(uError);
          setLoading(false);
          return;
        }

        if (!uEmail) {
          setError('Please enter an email address.');
          setLoading(false);
          return;
        }

        if (!password) {
          setError('Please choose a password for security.');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        // Check uniqueness of username using usernames document existence
        const usernameKey = uName.toLowerCase();
        try {
          const nameDoc = await getDoc(doc(db, 'usernames', usernameKey));
          if (nameDoc.exists()) {
            setError('This username resembles an existing account or is already taken. Please choose another username.');
            setLoading(false);
            return;
          }
        } catch (dbErr) {
          console.error('Error checking unique username:', dbErr);
        }

        // Authenticate User via Firebase Registration
        const userCredential = await createUserWithEmailAndPassword(auth, uEmail, password);
        const fbUser = userCredential.user;

        const profile = await createUserProfile(fbUser.uid, fbUser.email || uEmail, uName);

        onAuthSuccess({
          uid: fbUser.uid,
          email: fbUser.email || uEmail,
          role: profile.role,
          isVip: profile.isVip
        });
        onShowNotification('Account successfully registered on premium server!', 'success');
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setError(getCleanAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');
    setLoading(true);

    const email = forgotEmail.trim();
    if (!email) {
      setError('Please enter your email address to reset password.');
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setForgotSuccess('Success! A secure password reset link has been dispatched to your email address.');
      onShowNotification('Password reset link sent successfully!', 'success');
      setForgotEmail('');
    } catch (err: any) {
      console.error('Password Reset Error:', err);
      setError(getCleanAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-full bg-gradient-to-br from-[#061438] via-[#040816] to-[#3a4f0b] flex flex-col justify-between py-12 px-6 relative overflow-hidden select-none">
      
      {/* 1. Neon Green Dollar Chain dropping from top center */}
      <div className="absolute top-0 inset-x-0 flex flex-col items-center pointer-events-none z-0">
        <div className="flex flex-col text-[#00E676] font-extrabold text-lg leading-[12px] opacity-40 py-2 select-none tracking-widest">
          <span className="text-[#00E676] scale-110 drop-shadow-[0_0_10px_#00E676]">$</span>
          <span>$</span>
          <span>$</span>
          <span className="opacity-70">$</span>
          <span className="opacity-50">$</span>
          <span className="opacity-30">$</span>
        </div>
      </div>

      {/* Main Content Card Container */}
      <div className="w-full flex-1 flex flex-col justify-center max-w-sm mx-auto z-10">
        
        {/* 2. Cute Rounded Cow Head graphic with glowing backshadow halo */}
        <div className="text-center mt-4 mb-4">
          <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-full bg-transparent overflow-hidden mx-auto mb-3">
            {/* Outer golden halo sphere ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-[#F5C400] via-[#F5C400]/40 to-transparent opacity-60 blur-md animate-pulse" />
            
            <div className="relative w-24 h-24 rounded-full border-2 border-[#F5C400] bg-[#020512] flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(245,196,0,0.6)]">
              <img 
                src={cowLogo} 
                alt="Cash Cow VIP" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* 3. Bold Gold Display Title */}
          <h1 className="text-3xl font-black text-[#F5C400] uppercase tracking-tight font-sans text-center drop-shadow-[0_2px_8px_rgba(245,196,0,0.4)]">
            Cash Cow VIP
          </h1>
        </div>

        {/* 4. Segmented Menu Switch bar Capsule / Header */}
        {activeTab === 'forgot' ? (
          <div className="text-center mb-6">
            <h2 className="text-lg font-black text-[#F5C400] uppercase tracking-wide">
              Reset Password
            </h2>
            <p className="text-slate-400 text-[11px] mt-1 px-4 leading-relaxed font-bold">
              Enter your registered email address, and we'll dispatch a secure authorization link to reset your password.
            </p>
          </div>
        ) : (
          <div className="bg-[#050918]/80 max-w-sm w-full mx-auto p-1.5 rounded-full flex relative border border-slate-900/60 mb-6">
            <button
              onClick={() => { setActiveTab('login'); setError(''); setForgotSuccess(''); }}
              type="button"
              className={`w-1/2 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 rounded-full flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-[#F5C400] text-black shadow-lg font-black scale-100'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(''); setForgotSuccess(''); }}
              type="button"
              className={`w-1/2 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 rounded-full flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-[#F5C400] text-black shadow-lg font-black scale-100'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Error / Success info banners */}
        {error && (
          <div className="bg-rose-950/45 border border-rose-900/40 text-rose-300 text-xs py-2 px-4 rounded-full mb-4 font-bold text-center">
            ⚠ {error}
          </div>
        )}
        {forgotSuccess && (
          <div className="bg-emerald-950/45 border border-emerald-900/40 text-emerald-300 text-xs py-2 px-4 rounded-full mb-4 font-bold text-center animate-fade-in">
            ✓ {forgotSuccess}
          </div>
        )}

        {/* 5. Clean minimalist inputs and form controls */}
        <form onSubmit={activeTab === 'forgot' ? handleForgotPassword : handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {activeTab === 'login' && (
              <>
                <input
                  type="text"
                  required
                  placeholder="Username or Email"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full bg-[#050918]/90 border border-[#0F162A]/60 focus:border-[#F5C400] focus:ring-1 focus:ring-[#F5C400]/40 outline-none rounded-full px-6 py-3.5 text-xs text-white placeholder:text-slate-500 font-sans tracking-wide transition-all"
                />
                
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#050918]/90 border border-[#0F162A]/60 focus:border-[#F5C400] focus:ring-1 focus:ring-[#F5C400]/40 outline-none rounded-full px-6 py-3.5 text-xs text-white placeholder:text-slate-500 font-sans tracking-wide transition-all"
                />

                <div className="text-right pr-2">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('forgot'); setError(''); setForgotSuccess(''); }}
                    className="text-[11px] text-slate-400 hover:text-[#F5C400] font-bold transition-all underline decoration-dotted"
                  >
                    Forgot Password?
                  </button>
                </div>
              </>
            )}

            {activeTab === 'register' && (
              <>
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full bg-[#050918]/90 border border-[#0F162A]/60 focus:border-[#F5C400] focus:ring-1 focus:ring-[#F5C400]/40 outline-none rounded-full px-6 py-3.5 text-xs text-white placeholder:text-slate-500 font-sans tracking-wide transition-all"
                />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-[#050918]/90 border border-[#0F162A]/60 focus:border-[#F5C400] focus:ring-1 focus:ring-[#F5C400]/40 outline-none rounded-full px-6 py-3.5 text-xs text-white placeholder:text-slate-500 font-sans tracking-wide transition-all"
                />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#050918]/90 border border-[#0F162A]/60 focus:border-[#F5C400] focus:ring-1 focus:ring-[#F5C400]/40 outline-none rounded-full px-6 py-3.5 text-xs text-white placeholder:text-slate-500 font-sans tracking-wide transition-all"
                />
              </>
            )}

            {activeTab === 'forgot' && (
              <input
                type="email"
                required
                placeholder="Enter Registered Email Address"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full bg-[#050918]/90 border border-[#0F162A]/60 focus:border-[#F5C400] focus:ring-1 focus:ring-[#F5C400]/40 outline-none rounded-full px-6 py-3.5 text-xs text-white placeholder:text-slate-500 font-sans tracking-wide transition-all"
              />
            )}
          </div>

          {/* 6. Gold Pill Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F5C400] hover:bg-[#E2B200] active:scale-97 text-black text-xs font-black uppercase py-4 rounded-full transition-all duration-200 mt-4 shadow-[0_4px_15px_rgba(245,196,0,0.3)] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span>
                {activeTab === 'login' ? 'Login' : activeTab === 'register' ? 'Create Account' : 'Send Reset Link'}
              </span>
            )}
          </button>

          {activeTab === 'forgot' && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setError(''); setForgotSuccess(''); }}
                className="inline-flex items-center gap-1.5 text-xs text-[#F5C400] font-bold hover:underline transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#F5C400]" />
                Back to Login
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

