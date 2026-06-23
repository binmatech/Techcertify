import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import { User, CertificateConfig } from './types';
import { ShieldAlert, RefreshCw, ShieldCheck, Download, Award, ArrowLeft } from 'lucide-react';
import { html2canvasPatched as html2canvas } from './lib/html2canvas-patch';
import { jsPDF } from 'jspdf';
import CertificateCanvas from './components/CertificateCanvas';
import { THEME_COLORS } from './data';

// Public certificate verification page inside App.tsx
function PublicVerificationPage({ certId, onBack }: { certId: string; onBack: () => void }) {
  const [config, setConfig] = useState<CertificateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    const loadDesignAndStudent = async () => {
      try {
        const res = await fetch('/api/certificate-design');
        if (res.ok) {
          const data = await res.json();
          if (data.design) {
            setConfig({
              title: data.design.title || 'CERTIFICATE OF COMPLETION',
              subtitle: data.design.subtitle || 'OFFICIAL STUDENT ACHIEVEMENT CREDENTIAL',
              recipientName: 'ALEXANDER MERCER', // Meritorious verification record placeholder
              courseTitle: 'Advanced Software Engineering & Architecture',
              issueDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              certificateId: certId,
              signatureText: data.design.signatureText || 'Dr. Sarah Jenkins',
              signatureTitle: data.design.signatureTitle || 'Academic Director & Lead Dean',
              sealText: data.design.sealText || 'VERIFIED',
              template: data.design.template || 'classic',
              colorThemeId: data.design.colorThemeId || 'navy',
              recipientPrefix: data.design.recipientPrefix || 'This is proudly presented to',
              bodyText: data.design.bodyText || 'for successfully completing all academic requirements...',
              dateLabel: data.design.dateLabel || 'Date of Issuance',
              showSubtitle: data.design.showSubtitle !== false,
              showDate: data.design.showDate !== false,
              showId: data.design.showId !== false,
              showSignature: data.design.showSignature !== false,
              showSeal: data.design.showSeal !== false,
              logoUrl: data.design.logoUrl || '',
              showLogo: data.design.showLogo !== false,
              logoSize: data.design.logoSize !== undefined ? Number(data.design.logoSize) : 56,
            });
          }
        }
      } catch (err) {
        console.error("Failed loading verified asset:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDesignAndStudent();
  }, [certId]);

  const handleDownloadPDF = async () => {
    if (exporting) return;
    setExporting(true);
    setSavedMsg('Generating High-DPI Credential Asset...');

    let clone: HTMLDivElement | null = null;
    try {
      const element = document.getElementById('certificate-exportable-node');
      if (!element) throw new Error('Preview canvas element not found');

      // Clone the node to bypass parent transform/scale styles
      clone = element.cloneNode(true) as HTMLDivElement;
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
        scale: 3, // 3x scale for beautiful rendering
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
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Fit 841x595 accurately in standard A4 sheet
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
      pdf.save(`Verified_Credential_${certId}.pdf`);
      setSavedMsg('Verification PDF Downloaded!');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (err) {
      console.error(err);
      setSavedMsg('Failed to download PDF.');
    } finally {
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm">Cryptographic Verification in Progress...</p>
      </div>
    );
  }

  const activeTheme = THEME_COLORS.find(t => t.id === config?.colorThemeId) || THEME_COLORS[0];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center px-4 py-8 md:py-16 selection:bg-amber-400 selection:text-slate-950 font-sans">
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Verification Status Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl bg-slate-900 border border-emerald-500/20 gap-4 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10 tracking-widest">VERIFIED ACADEMIC CREDENTIAL</span>
                <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/10 tracking-widest">ACTIVE</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight mt-1">Official Verification Hash: {certId}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Validated on CertifySuite Ledger. Security keys correspond accurately.</p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleDownloadPDF}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-755 text-slate-200 border border-slate-750 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Verify & Download PDF</span>
            </button>
            <button
              onClick={onBack}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-450 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Portal</span>
            </button>
          </div>
        </div>

        {savedMsg && (
          <div className="p-3 text-center text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl transition animate-pulse">
            {savedMsg}
          </div>
        )}

        {/* Certificate Rendering Wrapper */}
        <div className="bg-slate-950 border border-slate-900 p-3 md:p-6 rounded-3xl flex justify-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.04),transparent_50%)] pointer-events-none" />
          <div className="scale-[0.45] sm:scale-[0.6] md:scale-[0.72] lg:scale-[0.88] xl:scale-[0.98] origin-center shrink-0">
            {config && (
              <CertificateCanvas
                config={config}
                theme={activeTheme}
              />
            )}
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-600 font-mono">
          CertifySuite Security Ledger • Cryptographically Sealed Code 102A8-4B
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [verifyCertId, setVerifyCertId] = useState<string | null>(null);

  // Check URL pathname for /verify/:id routes on load
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/verify/')) {
      const parts = path.split('/verify/');
      const id = parts[parts.length - 1];
      if (id && id.trim()) {
        setVerifyCertId(id.toUpperCase());
      }
    }
  }, []);

  // Attempt to restore session on startup
  useEffect(() => {
    const token = localStorage.getItem('certifysuite_token');
    if (!token) {
      setInitializing(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Stored authentication session has expired.');
      }
      return res.json();
    })
    .then(data => {
      setCurrentUser(data.user);
    })
    .catch(err => {
      console.warn("Auth restoration rejected:", err);
      // Clean up stale token
      localStorage.removeItem('certifysuite_token');
    })
    .finally(() => {
      setInitializing(false);
    });
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('certifysuite_token');
    setCurrentUser(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-sans tracking-tight">Syncing Certificate Security Protocol...</p>
      </div>
    );
  }

  // Render Public Verification Screen if routing targets it
  if (verifyCertId) {
    return (
      <div id="app-root-wrapper" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950">
        <PublicVerificationPage 
          certId={verifyCertId} 
          onBack={() => {
            setVerifyCertId(null);
            // Dynamic pushstate cleanup to keep layout URL neat and clean
            window.history.pushState({}, '', '/');
          }} 
        />
      </div>
    );
  }

  return (
    <div id="app-root-wrapper" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950">
      {currentUser ? (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </div>
  );
}
