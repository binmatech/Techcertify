import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Lock, Award, BookOpen, Check, ShieldCheck, Database, LogIn, Chrome, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AVAILABLE_COURSES } from '../data';
import { User, Course } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [courses, setCourses] = useState<Course[]>(AVAILABLE_COURSES);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/courses')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        if (data.courses) {
          setCourses(data.courses);
          if (data.courses.length > 0) {
            setSelectedCourses([data.courses[0].id]);
          }
        }
      })
      .catch((err) => {
        console.warn("Failed loading live courses for Auth selection:", err);
      });
  }, []);

  const [isRegistering, setIsRegistering] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbState, setDbState] = useState<{ usingAtlas: boolean; mode: string; configured: boolean; googleClientId?: string | null }>({
    usingAtlas: false,
    mode: "Establishing host query...",
    configured: false,
    googleClientId: null
  });

  // Simulated Google Sign In Dialog State
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  const [googleMockEmail, setGoogleMockEmail] = useState('nuddywale@gmail.com');
  const [googleMockName, setGoogleMockName] = useState('Nuddy Wale');

  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  // Fetch db connectivity state & Check iframe sandbox constraints
  useEffect(() => {
    setIsInIframe(window.self !== window.top);

    fetch('/api/db-state')
      .then(res => res.json())
      .then(data => {
        setDbState(data);
        if (data.googleClientId) {
          // Dynamically load the Google Identity Services GSI script
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            setGsiLoaded(true);
          };
          script.onerror = () => {
            console.error("Failed to load Google Identity Services GSI library.");
          };
          document.head.appendChild(script);
        }
      })
      .catch(err => {
        console.error("Failed to query db-state:", err);
        setDbState({ usingAtlas: false, mode: "Internal server-mode (offline host)", configured: false, googleClientId: null });
      });
  }, []);

  // Initialize official Google Sign-In Button once library is ready
  useEffect(() => {
    if (gsiLoaded && dbState.googleClientId) {
      try {
        const google = (window as any).google;
        if (google?.accounts?.id) {
          google.accounts.id.initialize({
            client_id: dbState.googleClientId,
            callback: (response: any) => {
              if (response.credential) {
                handleGoogleCredentialResponse(response.credential);
              }
            },
            cancel_on_tap_outside: false
          });

          google.accounts.id.renderButton(
            document.getElementById('google-signin-btn-real'),
            { 
              theme: 'outline', 
              size: 'large', 
              text: 'signin_with', 
              shape: 'rectangular',
              width: '100%',
              logo_alignment: 'left'
            }
          );
        }
      } catch (err) {
        console.error("Google Identity prompt rendering error:", err);
      }
    }
  }, [gsiLoaded, dbState.googleClientId]);

  // Decode official GSI JWT client-side and post profile credentials to backend
  const handleGoogleCredentialResponse = async (credential: string) => {
    setError('');
    setLoading(true);

    try {
      // Decode credential base64 client-side
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decodedPayload = JSON.parse(jsonPayload);

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: decodedPayload.name || 'Google Student',
          email: decodedPayload.email.toLowerCase(),
          googleId: decodedPayload.sub,
          imageUrl: decodedPayload.picture || ''
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Google registration was rejected by the database auth service.');
      }

      localStorage.setItem('certifysuite_token', data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed exchange Google authentication credential.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      if (selectedCourses.length > 1) {
        setSelectedCourses(selectedCourses.filter(id => id !== courseId));
      } else {
        setError('You must select at least one course when registering to generate certificates.');
      }
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
      setError('');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (selectedCourses.length === 0) {
      setError('Please select at least one course.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          selectedCourseIds: selectedCourses
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server rejected registration credentials.');
      }

      // Store persistent JWT
      localStorage.setItem('certifysuite_token', data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Connection lost to Node API service.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials or connection state.');
      }

      localStorage.setItem('certifysuite_token', data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    // Open Google Simulation dialog to provide account customization,
    // accommodating iframe limitations while triggering full Atlas MongoDB registration.
    setShowGoogleMock(true);
  };

  const completeGoogleAuth = async () => {
    if (!googleMockEmail.trim() || !googleMockEmail.includes('@')) {
      alert('Please provide a valid Google account email.');
      return;
    }
    if (!googleMockName.trim()) {
      alert('Please enter a valid display name.');
      return;
    }

    setLoading(true);
    setShowGoogleMock(false);

    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: googleMockName.trim(),
          email: googleMockEmail.trim().toLowerCase(),
          googleId: "google_" + Math.random().toString(36).substr(2, 9),
          imageUrl: ""
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Google token handshake rejected.');
      }

      localStorage.setItem('certifysuite_token', data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Google Auth simulation endpoint failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setLoading(true);
    // Login to predefined account or create one
    fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Eleanor Vance",
        email: "eleanor.vance@education.edu",
        googleId: "fallback_demo_eleanor"
      })
    })
    .then(res => res.json())
    .then(data => {
      localStorage.setItem('certifysuite_token', data.token);
      onLogin(data.user);
    })
    .catch(err => {
      setError("Failed to initialize quick student demo.");
    })
    .finally(() => {
      setLoading(false);
    });
  };

  return (
    <div id="auth-screen-container" className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4 md:p-8 selection:bg-amber-500 selection:text-slate-900">
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="w-full max-w-4xl grid md:grid-cols-12 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative z-10">
        
        {/* Brand visual panel */}
        <div id="auth-brand-panel" className="md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-8 flex flex-col justify-between border-r border-slate-800/80 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#3b82f615,transparent_40%)]" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Award className="w-6 h-6" />
              </div>
              <span className="font-sans font-bold tracking-tight text-lg text-slate-100">CertifySuite</span>
            </div>
            
            {/* Live Database status pill */}
            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg text-[9px] font-semibold">
              <Database className="w-3 h-3 stroke-[2.5]" />
              <span className="capitalize">{dbState.usingAtlas ? "MongoDB Active" : "In-Memory Mode"}</span>
            </div>
          </div>

          <div className="my-10">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 leading-tight">
              Instantly Certify Your Hard-Earned Expertise.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Register, choose your specialization curriculum, and immediately customize & publish official certificates of completion. Export elegantly styled PDFs and images for LinkedIn, print, or portfolios.
            </p>
          </div>

          <div className="space-y-3.5 border-t border-slate-800/60 pt-6">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Perfect high-fidelity export formats (PDF & PNG)</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Fully customizable layout themes & signatures</span>
            </div>
            
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2 mt-2">
              <p className="text-[10px] text-slate-500 font-mono tracking-tight leading-normal">
                DATABASE CONFIG:<br />
                {dbState.mode}
              </p>
            </div>
          </div>
        </div>

        {/* Form interactive panel */}
        <div id="auth-form-panel" className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isRegistering ? 'Create Student Account' : 'Welcome Back'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isRegistering 
                  ? 'Fill out your name and the courses you have mastered.'
                  : 'Log in to customize and access your official credentials.'
                }
              </p>
            </div>
            
            <button
              id="auth-toggle-btn"
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium transition duration-150 decoration-2 underline underline-offset-4"
            >
              {isRegistering ? 'Switch to Login' : 'Switch to Register'}
            </button>
          </div>

          {error && (
            <div id="auth-error-banner" className="mb-6 p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Social Google OAuth Block */}
          <div className="mb-5 space-y-3">
            {dbState.googleClientId ? (
              <div className="mb-4">
                {/* Real Google Button Mount Target */}
                <div className="flex justify-center py-0.5">
                  <div id="google-signin-btn-real" className="w-full flex justify-center"></div>
                </div>
              </div>
            ) : (
              <button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-100 hover:text-white border border-slate-800 font-medium text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Chrome className="w-4 h-4 text-amber-400" />
                <span>Sign in with Google</span>
              </button>
            )}

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-slate-900"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-500 uppercase tracking-widest font-mono">or email credentials</span>
              <div className="flex-grow border-t border-slate-900"></div>
            </div>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLoginSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Official Student Name <span className="text-amber-400">*</span></label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-name-input"
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  Ensure this matches your official identification card perfectly.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:ring-1 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Secret Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:ring-1 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {isRegistering && (
              <div className="border-t border-slate-900 pt-4 mt-2">
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    Select Courses Completed <span className="text-amber-400 text-[10px] font-normal">(choose 1 or more)</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {courses.map((course) => {
                    const isChecked = selectedCourses.includes(course.id);
                    return (
                      <button
                        id={`course-select-${course.id}`}
                        key={course.id}
                        type="button"
                        onClick={() => toggleCourse(course.id)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition duration-150 flex items-center gap-2.5 justify-between ${
                          isChecked 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 font-medium' 
                            : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-medium truncate">{course.title}</p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{course.code} • {course.duration}</p>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isChecked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-700'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3px]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:translate-y-px"
              >
                {loading 
                  ? 'Compiling Security Directives...' 
                  : isRegistering 
                    ? 'Register profile & Access workspace' 
                    : 'Sign in to workspace'
                }
              </button>
            </div>
          </form>

          {/* Quick test prefill */}
          <div className="mt-6 border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>Want to test the app instantly?</span>
            <button
              id="auth-quick-demo-btn"
              type="button"
              onClick={handleQuickDemo}
              disabled={loading}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-amber-400 rounded-xl transition flex items-center gap-1.5 font-medium"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Auto-fill Student Demo Account (Google Sign-In)
            </button>
          </div>


        </div>

      </div>

      {/* Google Sign In Flow Dialog Modal */}
      <AnimatePresence>
        {showGoogleMock && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowGoogleMock(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-sm"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Chrome className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google Secure Sign-In Service</h3>
                  <p className="text-[10px] text-slate-500">Connecting Google Workspace Accounts with CertifySuite MongoDB Atlas</p>
                </div>
              </div>

              <div className="space-y-4 border-t border-b border-slate-800/80 py-4 my-2 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Choose Google Account Profile</label>
                  <input
                    type="email"
                    value={googleMockEmail}
                    onChange={(e) => setGoogleMockEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-amber-500/40 font-semibold"
                    placeholder="e.g. yourname@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Account Display Name</label>
                  <input
                    type="text"
                    value={googleMockName}
                    onChange={(e) => setGoogleMockName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-amber-500/40 font-semibold"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-[10px] text-indigo-300 leading-normal">
                  💡 <strong>Google Sandbox Protocol:</strong> In pre-production, to circumvent iframe third-party auth sandboxing, we securely simulate the token handshake and register you as an validated Google student in your live MongoDB collection!
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleMock(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={completeGoogleAuth}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 hover:scale-101 duration-150 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Chrome className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Authorize & Connect with MongoDB</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
