import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye, EyeOff, Check, School, Heart, X, AlertTriangle
} from 'lucide-react';
import { cn } from './lib/utils';
import { UserType } from './types';
import { auth, db, googleProvider } from './lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthProps {
  onLogin: (type: UserType, uid: string) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [view, setView] = useState<'login' | 'signup' | 'reset'>('login');
  const [userType, setUserType] = useState<UserType>('community-partner');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [orgName, setOrgName] = useState('');
  const [contactName, setContactName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Reset form state
  const [resetEmail, setResetEmail] = useState('');

  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleScroll = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 1000);
  };

  const carouselSlides = [
    {
      title: "Support The Power Of Education",
      description: "Your support provides students with essential tools for lifelong learning.",
      image: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=1200&q=80"
    },
    {
      title: "Strengthen Our Communities",
      description: "Help ensure every family has access to the support they deserve by creating long-lasting impact.",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80"
    },
    {
      title: "Empower Our Youth To Lead",
      description: "Help youth build skills, advocate for themselves, and transform their communities.",
      image: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&q=80"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // Handle Email/Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (loginPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    try {
      setIsAuthenticating(true);
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const savedType = userDoc.exists() ? userDoc.data().userType : userType;
      onLogin(savedType as UserType, userCredential.user.uid);
    } catch (err: any) {
      setError(getFriendlyError(err.code));
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Email/Password Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      setIsAuthenticating(true);
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: signupEmail,
        orgName,
        contactName,
        phone,
        userType,
        createdAt: new Date().toISOString(),
        termsAcceptedAt: new Date().toISOString()
      });
      onLogin(userType, userCredential.user.uid);
    } catch (err: any) {
      setError(getFriendlyError(err.code));
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Google Sign In
  const handleGoogle = async () => {
    setError('');
    try {
      setIsAuthenticating(true);
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          contactName: result.user.displayName,
          userType,
          createdAt: new Date().toISOString(),
          // Only set when the account is created from the signup view, where the Google button requires agreeing first.
          ...(agreed && { termsAcceptedAt: new Date().toISOString() })
        });
      }
      const savedType = userDoc.exists() ? userDoc.data().userType : userType;
      onLogin(savedType as UserType, result.user.uid);
    } catch (err: any) {
      setError(getFriendlyError(err.code));
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Password Reset
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setIsAuthenticating(true);
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (err: any) {
      setError(getFriendlyError(err.code));
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Convert Firebase error codes to friendly messages
  const getFriendlyError = (code: string) => {
    switch (code) {
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/weak-password': return 'Password must be at least 8 characters.';
      case 'auth/popup-closed-by-user': return 'Sign in was cancelled.';
      case 'auth/invalid-credential': return 'Invalid email or password.';
      default: return 'Something went wrong. Please try again.';
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-white flex justify-center">
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row">
        {/* Left Side - Image Carousel */}
        <div className="hidden lg:block w-1/2 h-full py-12 pl-0 pr-[40px]">
          <div className="relative h-full w-full rounded-[5px] overflow-hidden group bg-black">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                src={carouselSlides[currentSlide].image}
                alt={carouselSlides[currentSlide].title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute bottom-12 left-12 text-white max-w-md">
              <motion.div
                key={`text-${currentSlide}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-4xl font-bold mb-4 leading-tight">{carouselSlides[currentSlide].title}</h2>
                <p className="text-lg opacity-90">{carouselSlides[currentSlide].description}</p>
              </motion.div>
              <div className="flex gap-2 mt-8">
                {carouselSlides.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-all duration-500",
                      currentSlide === i ? "w-8 bg-white" : "w-2 bg-white/40"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-end justify-start lg:py-12 lg:h-full">
          <div
            onScroll={handleScroll}
            className={cn(
              "w-full max-w-[660px] lg:h-full lg:overflow-y-auto lg:pl-[40px] lg:pr-[32px] p-8 lg:p-0 custom-scrollbar scrollbar-auto-hide",
              isScrolling && "is-scrolling"
            )}
          >
            
            <a
              href="https://www.realizetoact.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-col items-center gap-2 mb-12 hover:opacity-80 transition-opacity group"
            >
              <span className="font-bold text-brand-primary tracking-tight text-lg">Realize To Act</span>
            </a>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 mb-6 p-3 bg-red-50 border border-red-200 rounded-[5px] text-red-600 text-sm">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* ===== LOGIN VIEW ===== */}
              {view === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h1 className="text-3xl font-bold text-brand-dark mb-2">Welcome Back!</h1>
                  <p className="text-slate-500 mb-8">Choose your organization type and enter your credentials</p>

                  <div className="flex p-1 bg-slate-100 rounded-[5px] mb-8">
                    <button
                      onClick={() => setUserType('school')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[5px] text-sm font-medium transition-all",
                        userType === 'school' ? "bg-white text-brand-primary" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <School size={18} /> School District
                    </button>
                    <button
                      onClick={() => setUserType('community-partner')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[5px] text-sm font-medium transition-all",
                        userType === 'community-partner' ? "bg-white text-brand-primary" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Heart size={18} /> Community Partner
                    </button>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address*</label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder={userType === 'school' ? "user@schooldistrict.edu" : "user@communitypartner.org"}
                        className="w-full px-4 py-3 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                        required
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">Password*</label>
                        <button type="button" onClick={() => setView('reset')} className="text-sm font-medium text-brand-primary hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            if (e.target.value.length >= 8) setPasswordError('');
                          }}
                          placeholder="••••••••"
                          className={cn(
                            "w-full px-4 py-3 rounded-[5px] border focus:outline-none focus:ring-2 transition-all",
                            passwordError ? "border-red-500 focus:ring-red-500/20" : "border-slate-200 focus:ring-brand-primary/20 focus:border-brand-primary"
                          )}
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                      </div>
                      {passwordError && (
                        <div className="flex items-center gap-1.5 mt-2 text-red-500">
                          <AlertTriangle size={14} />
                          <span className="text-xs font-medium">{passwordError}</span>
                        </div>
                      )}
                    </div>
                    {/* Returning users already accepted the Terms & Privacy at signup, so login doesn't ask again. */}
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className={cn("w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3.5 rounded-[5px] transition-all", isAuthenticating && "opacity-50 cursor-not-allowed")}
                    >
                      {isAuthenticating ? 'Logging in...' : 'Log In'}
                    </button>
                  </form>

                  <p className="text-center mt-8 text-slate-600">
                    Don't have an account? <button onClick={() => { setView('signup'); setError(''); }} className="text-brand-primary font-bold hover:underline">Sign Up</button>
                  </p>

                  <div className="relative my-10">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-slate-400">or</span></div>
                  </div>

                  <button
                    onClick={handleGoogle}
                    disabled={isAuthenticating}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-[5px] hover:bg-slate-50 transition-all font-medium text-slate-700 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Log in with Google
                  </button>
                </motion.div>
              )}

              {/* ===== SIGNUP VIEW ===== */}
              {view === 'signup' && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h1 className="text-3xl font-bold text-brand-dark mb-2">Let's Get Started!</h1>
                  <p className="text-slate-500 mb-8">Choose your organization type and enter your credentials</p>

                  <div className="flex p-1 bg-slate-100 rounded-[5px] mb-8">
                    <button
                      onClick={() => setUserType('school')}
                      className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[5px] text-sm font-medium transition-all", userType === 'school' ? "bg-white text-brand-primary" : "text-slate-500 hover:text-slate-700")}
                    >
                      <School size={18} /> School District
                    </button>
                    <button
                      onClick={() => setUserType('community-partner')}
                      className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[5px] text-sm font-medium transition-all", userType === 'community-partner' ? "bg-white text-brand-primary" : "text-slate-500 hover:text-slate-700")}
                    >
                      <Heart size={18} /> Community Partner
                    </button>
                  </div>

                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        {userType === 'school' ? 'School District Name*' : 'Organization Name*'}
                      </label>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder={userType === 'school' ? "Midland School District" : "Hope Healing Community Partner"}
                        className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Full Name*</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address*</label>
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder={userType === 'school' ? "user@schooldistrict.edu" : "user@communitypartner.org"}
                        className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password*</label>
                        <input
                          type="password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password*</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { setAgreed(!agreed); if (!agreed) setShowTerms(true); }}
                        className={cn("w-5 h-5 rounded border flex items-center justify-center transition-all", agreed ? "bg-brand-primary border-brand-primary" : "border-slate-300")}
                      >
                        {agreed && <Check size={14} className="text-white" />}
                      </button>
                      <span className="text-sm text-slate-600">
                        I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-brand-primary font-medium hover:underline">Terms & Privacy</button>
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={!agreed || isAuthenticating}
                      className={cn("w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3.5 rounded-[5px] transition-all mt-4", (!agreed || isAuthenticating) && "opacity-50 cursor-not-allowed")}
                    >
                      {isAuthenticating ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>

                  <p className="text-center mt-6 text-slate-600">
                    Already have an account? <button onClick={() => { setView('login'); setError(''); }} className="text-brand-primary font-bold hover:underline">Log In</button>
                  </p>

                  <div className="relative my-10">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-slate-400">or</span></div>
                  </div>

                  <button
                    onClick={handleGoogle}
                    disabled={!agreed || isAuthenticating}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-[5px] hover:bg-slate-50 transition-all font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign up with Google
                  </button>
                </motion.div>
              )}

              {/* ===== RESET VIEW ===== */}
              {view === 'reset' && (
                <motion.div
                  key="reset"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h1 className="text-3xl font-bold text-brand-dark mb-2">Password Reset</h1>
                  <p className="text-slate-500 mb-8">Provide the email address associated to your account to recover your password</p>

                  {resetSent ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-[5px] text-green-700 text-sm text-center">
                      ✅ Reset email sent! Check your inbox.
                    </div>
                  ) : (
                    <form onSubmit={handleReset} className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address*</label>
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="user@organization.com"
                          className="w-full px-4 py-3 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isAuthenticating}
                        className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold py-3.5 rounded-[5px] transition-all disabled:opacity-50"
                      >
                        {isAuthenticating ? 'Sending...' : 'Reset Password'}
                      </button>
                    </form>
                  )}

                  <button onClick={() => { setView('login'); setError(''); setResetSent(false); }} className="w-full text-center mt-8 text-brand-primary font-bold hover:underline">
                    Back to Log In
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTerms(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-[5px] shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-brand-dark">Realize to Act Terms & Privacy</h3>
                <button onClick={() => setShowTerms(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto text-slate-600 leading-relaxed">
                <div className="space-y-6">
                  <section><h4 className="font-bold text-brand-dark mb-2">1. Acceptance of Terms</h4><p>By accessing or using the Realize to Act platform, you agree to be bound by these Terms of Service.</p></section>
                  <section><h4 className="font-bold text-brand-dark mb-2">2. Organization Verification</h4><p>All users must represent a valid School District or registered 501(c)(3) Community Partner organization.</p></section>
                  <section><h4 className="font-bold text-brand-dark mb-2">3. Resource Exchange</h4><p>Realize to Act acts as a facilitator. Organizations are responsible for coordinating the safe and legal transfer of all items.</p></section>
                  <section><h4 className="font-bold text-brand-dark mb-2">4. Privacy & Data</h4><p>We collect minimal data necessary to facilitate connections. Your contact information is only shared with organizations you explicitly choose to connect with.</p></section>
                  <section><h4 className="font-bold text-brand-dark mb-2">5. Prohibited Conduct</h4><p>Users may not use the platform for commercial sales, personal gain, or the exchange of hazardous materials.</p></section>
                </div>
              </div>
              <div className="p-8 bg-slate-50 flex justify-center">
                <button onClick={() => { setAgreed(true); setShowTerms(false); }} className="w-full py-3 border border-slate-200 bg-white rounded-[5px] font-bold text-slate-700 hover:bg-slate-50 transition-all">
                  I Agree To The Terms
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}