import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, LogOut, Settings, Palette, Calendar, Type, FileText, 
  Award, Sparkles, BookOpen, UserCircle, RefreshCw, Sliders, Feather, Info,
  CheckCircle2, ShieldCheck, Mail, ChevronRight, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { html2canvasPatched as html2canvas } from '../lib/html2canvas-patch';
import { jsPDF } from 'jspdf';

import { AVAILABLE_COURSES, THEME_COLORS, CERTIFICATE_TEMPLATES } from '../data';
import { User, CertificateConfig, Course, TemplateStyle } from '../types';
import CertificateCanvas, { CertificateCanvasHandle } from './CertificateCanvas';
import AdminDashboard from './AdminDashboard';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  // Dynamic course list
  const [courses, setCourses] = useState<Course[]>(AVAILABLE_COURSES);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      if (response.ok) {
        const data = await response.json();
        if (data.courses) {
          setCourses(data.courses);
        }
      }
    } catch (err) {
      console.warn("Failed loading live courses from backend:", err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Find courses that user chose when registering
  const rawRegisteredCourses = courses.filter(course => 
    user.selectedCourseIds && user.selectedCourseIds.includes(course.id)
  );
  const registeredCourses = rawRegisteredCourses.length > 0 ? rawRegisteredCourses : courses;

  // Default to first user course
  const [selectedCourse, setSelectedCourse] = useState<Course | 'all'>('all');

  // Pick first available registered course once loaded, handling transitioning from fallback courses to database loaded courses gracefully.
  useEffect(() => {
    const rawRegistered = courses.filter(course => 
      user.selectedCourseIds && user.selectedCourseIds.includes(course.id)
    );
    if (rawRegistered.length > 0) {
      const isCurrentValid = selectedCourse !== 'all' && rawRegistered.some(c => c.id === selectedCourse.id);
      if (!isCurrentValid) {
        setSelectedCourse(rawRegistered[0]);
      }
    } else if (courses.length > 0 && selectedCourse === 'all') {
      setSelectedCourse(courses[0]);
    }
  }, [courses, user.selectedCourseIds]);

  const [activeTab, setActiveTab] = useState<'template' | 'details' | 'design'>('template');
  const [showAdminDashboard, setShowAdminDashboard] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string>('');

  // Initial config
  const getRandomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'CS-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const getSyllabusString = () => {
    if (selectedCourse === 'all') {
      return registeredCourses.map(c => c.title).join(', & ');
    }
    return selectedCourse.title;
  };

  const [config, setConfig] = useState<CertificateConfig>({
    title: 'CERTIFICATE OF COMPLETION',
    subtitle: 'OFFICIAL STUDENT ACHIEVEMENT CREDENTIAL',
    recipientName: user.name,
    courseTitle: getSyllabusString(),
    issueDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    certificateId: getRandomId(),
    signatureText: 'Dr. Sarah Jenkins',
    signatureTitle: 'Academic Director & Lead Dean',
    sealText: 'VERIFIED',
    template: 'classic',
    colorThemeId: 'navy',
    showSubtitle: true,
    showDate: true,
    showId: true,
    showSignature: true,
    showSeal: true,
    logoUrl: '',
    showLogo: true,
    logoSize: 56,
  });

  // Load custom certificate layout design configured by administrator
  useEffect(() => {
    const fetchCustomDesign = async () => {
      try {
        const response = await fetch('/api/certificate-design');
        if (response.ok) {
          const data = await response.json();
          if (data.design) {
            setConfig(prev => ({
              ...prev,
              title: data.design.title || prev.title,
              subtitle: data.design.subtitle || prev.subtitle,
              signatureText: data.design.signatureText || prev.signatureText,
              signatureTitle: data.design.signatureTitle || prev.signatureTitle,
              sealText: data.design.sealText || prev.sealText,
              recipientPrefix: data.design.recipientPrefix !== undefined ? data.design.recipientPrefix : prev.recipientPrefix,
              bodyText: data.design.bodyText !== undefined ? data.design.bodyText : prev.bodyText,
              dateLabel: data.design.dateLabel !== undefined ? data.design.dateLabel : prev.dateLabel,
              logoUrl: data.design.logoUrl !== undefined ? data.design.logoUrl : prev.logoUrl,
              showLogo: data.design.showLogo !== undefined ? data.design.showLogo : prev.showLogo,
              logoSize: data.design.logoSize !== undefined ? Number(data.design.logoSize) : prev.logoSize,
              showSubtitle: data.design.showSubtitle !== undefined ? data.design.showSubtitle : prev.showSubtitle,
              showDate: data.design.showDate !== undefined ? data.design.showDate : prev.showDate,
              showId: data.design.showId !== undefined ? data.design.showId : prev.showId,
              showSignature: data.design.showSignature !== undefined ? data.design.showSignature : prev.showSignature,
              showSeal: data.design.showSeal !== undefined ? data.design.showSeal : prev.showSeal,
            }));
          }
        }
      } catch (err) {
        console.warn("Could not retrieve custom certificate design from server:", err);
      }
    };
    fetchCustomDesign();
  }, [showAdminDashboard]); // Re-fetch when admin panel is toggled, to reflect administrative designer saves instantly!

  // Keep template matching course changes
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      courseTitle: getSyllabusString()
    }));
  }, [selectedCourse, courses]);

  const activeTheme = THEME_COLORS.find(t => t.id === config.colorThemeId) || THEME_COLORS[0];
  const certificateRef = useRef<CertificateCanvasHandle>(null);

  // Export routines
  const handleExportPNG = async () => {
    const node = certificateRef.current?.getDomNode();
    if (!node) return;

    setIsExporting(true);
    setExportMessage('Synthesizing high-resolution canvas layers...');

    let clone: HTMLDivElement | null = null;
    try {
      // Delay slightly for animation frame stability
      await new Promise(resolve => setTimeout(resolve, 300));

      // Clone the node to bypass parent transform/scale styles
      clone = node.cloneNode(true) as HTMLDivElement;
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.width = '841px';
      clone.style.height = '595px';
      clone.style.transform = 'none';
      clone.style.zIndex = '-9999';
      clone.style.pointerEvents = 'none';

      // Fix images crossOrigin attribute in clone
      const images = clone.getElementsByTagName('img');
      for (let i = 0; i < images.length; i++) {
        images[i].setAttribute('crossOrigin', 'anonymous');
      }

      document.body.appendChild(clone);

      try {
        await document.fonts.ready;
      } catch (fontErr) {
        console.warn('Font loading failed or bypassed:', fontErr);
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const canvas = await html2canvas(clone, {
        scale: 3, // 3x quality scale for beautiful print output
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: activeTheme.background,
        scrollX: 0,
        scrollY: 0,
        width: 841,
        height: 595,
        windowWidth: 841,
        windowHeight: 595
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const filename = `Certificate_${config.recipientName.replace(/\s+/g, '_')}_${config.template}.png`;
      link.download = filename;
      link.href = image;
      link.click();
      
      setExportMessage('PNG Downloaded successfully!');
      setTimeout(() => setExportMessage(''), 3000);
    } catch (err) {
      console.error('Export Error:', err);
      setExportMessage('Error exporting certificate format.');
    } finally {
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    const node = certificateRef.current?.getDomNode();
    if (!node) return;

    setIsExporting(true);
    setExportMessage('Packaging vector graphics and fonts...');

    let clone: HTMLDivElement | null = null;
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      // Clone the node to bypass parent transform/scale styles
      clone = node.cloneNode(true) as HTMLDivElement;
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.width = '841px';
      clone.style.height = '595px';
      clone.style.transform = 'none';
      clone.style.zIndex = '-9999';
      clone.style.pointerEvents = 'none';

      // Fix images crossOrigin attribute in clone
      const images = clone.getElementsByTagName('img');
      for (let i = 0; i < images.length; i++) {
        images[i].setAttribute('crossOrigin', 'anonymous');
      }

      document.body.appendChild(clone);

      try {
        await document.fonts.ready;
      } catch (fontErr) {
        console.warn('Font loading failed or bypassed:', fontErr);
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const canvas = await html2canvas(clone, {
        scale: 3, // 3x scale for extremely crisp pdf rendering
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: activeTheme.background,
        scrollX: 0,
        scrollY: 0,
        width: 841,
        height: 595,
        windowWidth: 841,
        windowHeight: 595
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Landscape A4 PDF configuration: 297mm x 210mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Fit 841x595 accurately in standard A4 sheet
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
      
      const filename = `Certificate_${config.recipientName.replace(/\s+/g, '_')}_${config.template}.pdf`;
      pdf.save(filename);

      setExportMessage('PDF Downloaded successfully!');
      setTimeout(() => setExportMessage(''), 3000);
    } catch (err) {
      console.error('PDF Export Error:', err);
      setExportMessage('Failed to package PDF document.');
    } finally {
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
      setIsExporting(false);
    }
  };

  const handleCopyLink = () => {
    const mockUrl = `${window.location.origin}/verify/${config.certificateId}`;
    navigator.clipboard.writeText(mockUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const regenerateId = () => {
    setConfig(prev => ({ ...prev, certificateId: getRandomId() }));
  };

  return (
    <div id="dashboard-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Professional Navigation */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-slate-100 text-base flex items-center gap-2">
              CertifySuite Workspace
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Live Preview Verified
              </span>
            </h1>
            <p className="text-xs text-slate-400">Tailor specialized academic credentials on-demand.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          {/* Admin Portal Toggle Button */}
          {user.isAdmin && (
            <button
              id="dashboard-admin-toggle-btn"
              onClick={() => setShowAdminDashboard(!showAdminDashboard)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition duration-150 shrink-0 ${
                showAdminDashboard 
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-transparent shadow-md' 
                  : 'bg-slate-900/60 hover:bg-slate-800 text-amber-400 border-amber-500/20 hover:border-amber-500/40'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>{showAdminDashboard ? "Exit Admin Portal" : "Admin Portal"}</span>
            </button>
          )}

          {/* User profile capsule info */}
          <div className="hidden sm:flex items-center gap-2.5 bg-slate-900/60 border border-slate-800/80 px-3.5 py-1.5 rounded-xl text-xs text-slate-300">
            <UserCircle className="w-4 h-4 text-slate-400" />
            <div>
              <p className="font-medium text-slate-200">{user.name}</p>
              <p className="text-[10px] text-slate-500">
                {user.isAdmin ? "Portal Administrator" : "Student Account"}
              </p>
            </div>
          </div>

          <button
            id="dashboard-logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 font-medium px-3.5 py-2 bg-slate-900/40 hover:bg-rose-950/10 border border-slate-800 hover:border-rose-950/30 rounded-xl transition duration-150 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {showAdminDashboard ? (
        <AdminDashboard 
          onBack={() => setShowAdminDashboard(false)} 
          courses={courses}
          onReloadCourses={fetchCourses}
        />
      ) : (
        /* Main Board Grid container */
        <main className="flex-1 w-full max-w-[1700px] mx-auto p-4 md:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start relative z-10">
        
        {/* Left Control Center Panel (5 cols) */}
        <section id="workspace-controls-panel" className="xl:col-span-5 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 md:p-6 space-y-6 shadow-xl backdrop-blur">
          
          {/* Curriculum Status capsule */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-300 uppercase tracking-widest">
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>Registered Curriculum</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              These are the verified courses you completed during registration. Select which curriculum certificate parameters to compile:
            </p>

            <div className="mt-3.5 space-y-2">
              {registeredCourses.map((course) => {
                const isSelected = selectedCourse !== 'all' && selectedCourse.id === course.id;
                return (
                  <button
                    id={`active-course-tab-${course.id}`}
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition duration-150 flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' 
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-semibold block">{course.title}</p>
                      <span className="text-[10px] text-slate-500 font-mono tracking-wide mt-1 block">
                        Code: {course.code} • {course.duration} Coursework
                      </span>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}

              {/* Master Course Certificate option (all courses combined) */}
              {registeredCourses.length > 1 && (
                <button
                  id="active-course-tab-all"
                  onClick={() => setSelectedCourse('all')}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition duration-150 flex items-center justify-between gap-3 ${
                    selectedCourse === 'all' 
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' 
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-semibold block">All-Inclusive Master Specialization Link</p>
                      <span className="text-[10px] text-slate-500 font-mono tracking-wide mt-1 block">
                        Combines all ({registeredCourses.length}) academic achievements on a single diploma
                      </span>
                    </div>
                  </div>
                  {selectedCourse === 'all' && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Interactive controls configuration */}
          <div>
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-4">
              <button
                id="control-tab-template"
                onClick={() => setActiveTab('template')}
                className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition duration-150 flex items-center gap-1 ${
                  activeTab === 'template' 
                    ? 'bg-amber-500/15 text-amber-400' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Theme & Layout
              </button>
              <button
                id="control-tab-details"
                onClick={() => setActiveTab('details')}
                className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition duration-150 flex items-center gap-1 ${
                  activeTab === 'details' 
                    ? 'bg-amber-500/15 text-amber-400' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                Text Metadata
              </button>
              <button
                id="control-tab-design"
                onClick={() => setActiveTab('design')}
                className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition duration-150 flex items-center gap-1 ${
                  activeTab === 'design' 
                    ? 'bg-amber-500/15 text-amber-400' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Feather className="w-3.5 h-3.5" />
                Sign & Seal
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'template' && (
                <motion.div
                  key="template-options"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* Active template design section */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      1. Select Layout Template Style
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {CERTIFICATE_TEMPLATES.map((tpl) => {
                        const isSelected = config.template === tpl.id;
                        return (
                          <button
                            id={`tpl-btn-${tpl.id}`}
                            key={tpl.id}
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, template: tpl.id as any }))}
                            className={`p-2.5 rounded-xl border text-xs text-left transition flex items-center justify-between gap-3 ${
                              isSelected 
                                ? 'bg-slate-850 border-amber-500/50 text-slate-100 shadow-sm' 
                                : 'bg-slate-900/65 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                            }`}
                          >
                            <div>
                              <h4 className={`text-xs font-bold ${isSelected ? 'text-amber-400' : 'text-slate-255'}`}>{tpl.name}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{tpl.desc}</p>
                            </div>
                            <div className="shrink-0">
                              {isSelected ? (
                                <span className="h-5 w-5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center justify-center text-[10px] font-bold">✓</span>
                              ) : (
                                <span className="h-5 w-5 rounded-full border border-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-bold" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Themes */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      2. Select Accent Color Suite
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {THEME_COLORS.map((themeOption) => {
                        const isSelected = config.colorThemeId === themeOption.id;
                        return (
                          <button
                            id={`theme-btn-${themeOption.id}`}
                            key={themeOption.id}
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, colorThemeId: themeOption.id }))}
                            className={`p-2.5 rounded-xl border text-xs text-left transition flex items-center justify-between gap-3 ${
                              isSelected 
                                ? 'bg-slate-850 border-amber-500/50 text-slate-100 shadow-sm' 
                                : 'bg-slate-900/65 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {/* Swatch circle preview */}
                              <div className="flex -space-x-1 shrink-0">
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-950 block" style={{ backgroundColor: themeOption.primary }} />
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-950 block" style={{ backgroundColor: themeOption.secondary }} />
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-950 block" style={{ backgroundColor: themeOption.accent }} />
                              </div>
                              <span className="font-medium">{themeOption.name}</span>
                            </div>
                            
                            {isSelected && (
                              <span className="text-[10px] text-amber-400 font-medium">Selected</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'details' && (
                <motion.div
                  key="details-options"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  {/* Recipient Full name */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Recipient / Student Legal Name
                    </label>
                    <input
                      id="input-recipient-name"
                      type="text"
                      value={config.recipientName}
                      onChange={(e) => setConfig(prev => ({ ...prev, recipientName: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500/40 rounded-xl text-xs text-slate-100 outline-none transition"
                      placeholder="e.g. Eleanor Vance"
                    />
                  </div>                  {/* Administrative Configuration Message */}
                  <div className="bg-slate-950/60 border border-amber-500/10 p-3 rounded-xl flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Some metadata fields are customized globally by workspace administrators. To redesign layout fields, toggle the Admin Portal.
                    </p>
                  </div>

                  {/* Certificate Main Title */}
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Certificate Category Header 🔒
                    </label>
                    <input
                      id="input-certificate-title"
                      type="text"
                      disabled
                      value={config.title}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-900 text-slate-500 rounded-xl text-xs outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Subtitle */}
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Credential Subtitle Line 🔒
                    </label>
                    <input
                      id="input-certificate-subtitle"
                      type="text"
                      disabled
                      value={config.subtitle}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-900 text-slate-500 rounded-xl text-xs outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Issue Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest block mb-1 font-sans">
                        Issuance Date 🔒
                      </label>
                      <input
                        id="input-issue-date"
                        type="text"
                        disabled
                        value={config.issueDate}
                        className="w-full px-3 py-2 bg-slate-950/40 border border-slate-900 text-slate-500 rounded-xl text-xs outline-none cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 flex items-center justify-between font-mono">
                        <span>Credential ID</span>
                        <button 
                          id="btn-regenerate-id"
                          type="button" 
                          onClick={regenerateId}
                          className="hover:text-amber-400 transition"
                          title="Generate random credential"
                        >
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '4s' }} />
                        </button>
                      </label>
                      <input
                        id="input-cert-id"
                        type="text"
                        value={config.certificateId}
                        onChange={(e) => setConfig(prev => ({ ...prev, certificateId: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500/40 rounded-xl text-xs font-mono text-slate-400 outline-none transition"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'design' && (
                <motion.div
                  key="design-options"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  {/* Administrative Configuration Message */}
                  <div className="bg-slate-950/60 border border-amber-500/10 p-3 rounded-xl flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Signature blocks and seal stamps are locked to the administrative roster. Open the Admin Portal to alter these variables dynamically.
                    </p>
                  </div>

                  {/* Signature Text field */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Academic Dignitary Signature 🔒
                    </label>
                    <input
                      id="input-signature-text"
                      type="text"
                      disabled
                      value={config.signatureText}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-900 text-slate-500 rounded-xl text-xs outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Signature Title */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Signature Position / Title 🔒
                    </label>
                    <input
                      id="input-signature-title"
                      type="text"
                      disabled
                      value={config.signatureTitle}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-900 text-slate-500 rounded-xl text-xs outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Stamp/Seal customized text */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Seal Central Monogram Text 🔒
                    </label>
                    <input
                      id="input-seal-text"
                      type="text"
                      disabled
                      value={config.sealText}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-900 text-slate-500 rounded-xl text-xs outline-none cursor-not-allowed font-sans uppercase"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export Action Controls */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
              3. Compile & Export Credential Suite
            </h4>

            {exportMessage && (
              <div id="export-live-status" className="p-3 bg-indigo-950/40 border border-indigo-500/30 text-indigo-400 text-xs rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping inline-block" />
                <p className="font-medium">{exportMessage}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-export-png"
                disabled={isExporting}
                onClick={handleExportPNG}
                className="py-3 px-4 bg-slate-850 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-200 hover:text-white font-semibold text-xs rounded-xl transition duration-150 flex items-center justify-center gap-1.5 active:translate-y-px"
                title="Download high-resolution raster graphic image"
              >
                <Download className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Export PNG</span>
              </button>

              <button
                id="btn-export-pdf"
                disabled={isExporting}
                onClick={handleExportPDF}
                className="py-3 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 border border-transparent hover:border-transparent text-slate-950 disabled:opacity-50 font-bold text-xs rounded-xl transition duration-150 flex items-center justify-center gap-1.5 active:translate-y-px"
                title="Save as multi-layered high-fidelity landscape A4 PDF"
              >
                <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span>Export PDF</span>
              </button>
            </div>

            <div className="grid grid-cols-1 pt-1.5">
              <button
                id="btn-copy-address"
                onClick={handleCopyLink}
                className="w-full py-2 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[11px] rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isCopied ? 'Verification Link Copied!' : 'Copy Secure Verification Deep-Link'}</span>
              </button>
            </div>
          </div>
          
        </section>

        {/* Right Preview Arena (7 cols) */}
        <section id="workspace-preview-canvas" className="xl:col-span-7 flex flex-col items-center">
          
          <div className="w-full mb-3 flex items-center justify-between text-xs text-slate-400 px-1 font-sans">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Live Workspace Renderer
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Standard aspect ratio scale: 1.414 (A4 Landscape)
            </span>
          </div>

          {/* Scaled certificate viewport container */}
          <div className="w-full bg-slate-950 border border-slate-900/80 p-4 md:p-8 rounded-2xl flex items-center justify-center shadow-inner overflow-x-auto relative min-h-[400px]">
            
            {/* Ambient abstract grid light behind the preview */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.06),transparent_50%)] pointer-events-none" />

            {/* Transform Scaling wrapper for beautiful responsive fitting inside parent container */}
            <div className="max-w-full overflow-hidden flex justify-center py-2 shrink-0">
              <div className="scale-[0.5] sm:scale-[0.6] md:scale-[0.72] lg:scale-[0.88] xl:scale-[0.78] 2xl:scale-[0.95] origin-center shrink-0">
                <CertificateCanvas 
                  ref={certificateRef}
                  config={config} 
                  theme={activeTheme} 
                />
              </div>
            </div>
          </div>

          {/* Instant guidelines / helper tips to guide user customization */}
          <div className="w-full mt-4 bg-slate-900/40 border border-slate-900 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="font-sans">
              <p className="font-medium text-slate-305">How to design your perfect credential:</p>
              <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-500 text-[11px]">
                <li>Change layout templates in the <strong className="text-slate-400">Theme & Layout</strong> tab to see different aesthetic vibes.</li>
                <li>Verify your official student email is logged and ID values remain cryptographically safe.</li>
                <li>Ready? Download high-DPI <strong className="text-slate-400">PNG</strong> or vector-level standard <strong className="text-slate-400">PDF</strong> with full single-click buttons.</li>
              </ul>
            </div>
          </div>

        </section>

      </main>
      )}
    </div>
  );
}
