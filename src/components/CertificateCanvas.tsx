import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Award, ShieldCheck, Milestone, CheckCircle2, Bookmark, GraduationCap } from 'lucide-react';
import { CertificateConfig, ThemeColor } from '../types';

interface CertificateCanvasProps {
  config: CertificateConfig;
  theme: ThemeColor;
}

export interface CertificateCanvasHandle {
  getDomNode: () => HTMLDivElement | null;
}

const CertificateCanvas = forwardRef<CertificateCanvasHandle, CertificateCanvasProps>(
  ({ config, theme }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getDomNode: () => containerRef.current,
    }));

    // Convert hex colors or generate styled tags
    const renderTemplate = () => {
      switch (config.template) {
        case 'classic':
          return (
            <div 
              className="w-full h-full p-11 relative flex flex-col justify-between border-8 border-double overflow-hidden select-none transition-colors duration-300"
              style={{ 
                backgroundColor: theme.background,
                borderColor: theme.secondary,
              }}
            >
              {/* Outer double border */}
              <div 
                className="absolute inset-2 border-2" 
                style={{ borderColor: theme.accent }}
              />

              {/* Decorative corner accents */}
              <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4" style={{ borderColor: theme.accent }} />
              <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4" style={{ borderColor: theme.accent }} />
              <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4" style={{ borderColor: theme.accent }} />
              <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4" style={{ borderColor: theme.accent }} />

              {/* Top Section */}
              <div className="text-center mt-4">
                <div className="flex justify-center mb-2 items-center" style={{ minHeight: `${config.logoSize || 56}px` }}>
                  {config.showLogo !== false && config.logoUrl ? (
                    <img 
                      src={config.logoUrl} 
                      alt="Logo" 
                      className="object-contain" 
                      style={{ height: `${config.logoSize || 56}px`, maxWidth: '240px' }}
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <GraduationCap className="w-12 h-12" style={{ color: theme.secondary }} />
                  )}
                </div>
                <h1 
                  className="font-serif text-3xl font-bold tracking-widest uppercase mb-1"
                  style={{ color: theme.primary }}
                >
                  {config.title}
                </h1>
                <p 
                  className="text-[11px] uppercase tracking-[0.25em] font-medium"
                  style={{ color: theme.accent }}
                >
                  {config.subtitle || 'credential of completion'}
                </p>
              </div>

              {/* Recipient Section */}
              <div className="text-center my-4">
                <p className="font-serif italic text-sm text-slate-500 mb-2">{config.recipientPrefix || 'This is proudly presented to'}</p>
                <div className="inline-block relative mb-3 px-12 pb-4">
                  <h2 
                    className="font-serif text-4xl font-extrabold tracking-wide"
                    style={{ color: theme.primary }}
                  >
                    {config.recipientName || 'Your Name'}
                  </h2>
                  <div 
                    className="absolute bottom-0 left-4 right-4 h-[2px]"
                    style={{ backgroundColor: theme.accent }}
                  />
                </div>
                <p className="text-slate-600 text-xs max-w-lg mx-auto leading-relaxed font-sans mt-2">
                  {config.bodyText || 'for successfully completing all academic requirements, practical assessments, and hands-on laboratory exercises for the specialized curriculum in:'}
                </p>
                <p 
                  className="text-lg font-bold tracking-tight mt-3 font-serif"
                  style={{ color: theme.secondary }}
                >
                  {config.courseTitle}
                </p>
              </div>

              {/* Bottom detail row */}
              <div className="grid grid-cols-3 items-end pt-2 border-t border-slate-200/80 mt-2">
                {/* Issue date */}
                <div className="text-left font-sans">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{config.dateLabel || 'Date of Issuance'}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-1">{config.issueDate}</p>
                </div>

                {/* Seal container */}
                <div className="flex justify-center relative">
                  <div className="absolute -top-12 flex items-center justify-center">
                    <div 
                      className="w-20 h-20 rounded-full border-4 flex items-center justify-center flex-col shadow-md relative bg-white"
                      style={{ borderColor: theme.accent, color: theme.primary }}
                    >
                      {/* Ribbon left */}
                      <div className="absolute top-14 -left-1 w-6 h-10 bg-amber-600 rounded-b opacity-85 rotate-[15deg] -z-10" />
                      {/* Ribbon right */}
                      <div className="absolute top-14 -right-1 w-6 h-10 bg-amber-500 rounded-b opacity-85 rotate-[-15deg] -z-10" />
                      
                      <Award className="w-8 h-8" style={{ color: theme.accent }} />
                      <span className="text-[7px] font-bold tracking-widest uppercase mt-0.5" style={{ color: theme.text }}>
                        {config.sealText || 'VERIFIED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signature */}
                <div className="text-right font-sans">
                  <div 
                    className="font-serif italic text-lg pr-2 leading-none"
                    style={{ color: theme.secondary }}
                  >
                    {config.signatureText}
                  </div>
                  <div className="h-0.5 w-32 ml-auto my-1.5 bg-slate-300" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{config.signatureTitle}</p>
                </div>
              </div>

              {/* Absolute ID Code */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center px-4">
                <span className="text-[8px] font-mono text-slate-400">
                  REF: {config.certificateId}
                </span>
                <span className="text-[8px] font-mono text-emerald-600 flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> SECURE DEPLOYED DEEPLINK
                </span>
              </div>
            </div>
          );

        case 'modern':
          return (
            <div 
              className="w-full h-full p-11 relative flex flex-col justify-between overflow-hidden select-none transition-colors duration-300 border-t-[14px]"
              style={{ 
                borderTopColor: theme.secondary,
                backgroundColor: '#FFFFFF',
              }}
            >
              {/* Subtle tech background grids */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-50 pointer-events-none" />

              {/* Top Header */}
              <div className="flex justify-between items-start z-10">
                <div className="text-left">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">verification pass</span>
                  </div>
                  <h1 
                    className="font-sans font-black text-2xl tracking-tight uppercase"
                    style={{ color: theme.primary }}
                  >
                    {config.title}
                  </h1>
                  <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200 uppercase tracking-wider mt-1.5 inline-block">
                    {config.subtitle || 'technology credential'}
                  </span>
                </div>

                <div className="text-right font-mono text-[9px] text-slate-400 flex flex-col items-end">
                  {config.showLogo !== false && config.logoUrl && (
                    <div className="mb-2">
                      <img 
                        src={config.logoUrl} 
                        alt="Logo" 
                        className="object-contain" 
                        style={{ height: `${Math.round((config.logoSize || 56) * 0.72)}px`, maxWidth: '160px' }}
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  )}
                  <p>CERTIFICATE ID</p>
                  <p className="font-bold text-slate-800 mt-0.5">{config.certificateId}</p>
                </div>
              </div>

              {/* Recipient Box */}
              <div className="my-3 z-10">
                <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1">{config.recipientPrefix || 'academic recipient'}</p>
                <h2 
                  className="font-sans text-3xl font-extrabold tracking-tight"
                  style={{ color: theme.primary }}
                >
                  {config.recipientName || 'Your Name'}
                </h2>
                
                <div className="h-[2px] w-full my-3 bg-slate-100" />

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8">
                    <p className="text-slate-500 text-xs font-sans leading-relaxed">
                      {config.bodyText || 'has demonstrated competence and successful syllabus completion for the tech stack track specified below. Issued under digital cryptographic signing.'}
                    </p>
                    <p 
                      className="text-base font-bold text-slate-900 mt-2 font-mono flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-3 bg-indigo-600 block shrink-0" style={{ backgroundColor: theme.secondary }} />
                      {config.courseTitle}
                    </p>
                  </div>

                  <div className="col-span-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col justify-between">
                    <div>
                      <p className="text-[8px] font-mono text-slate-400 uppercase">credential grade</p>
                      <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">GRADE A+ (PASS)</p>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[8px] font-mono text-emerald-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verified Certificate
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Tech Grid */}
              <div className="grid grid-cols-3 items-center border-t border-slate-100 pt-3 z-10">
                <div className="text-left">
                  <p className="text-[8px] font-mono text-slate-400">{config.dateLabel || 'ISSUE TIMELINE'}</p>
                  <p className="text-xs font-mono font-medium text-slate-600 mt-0.5">{config.issueDate}</p>
                </div>

                <div className="flex justify-center">
                  <div className="flex items-center gap-2">
                    {/* Simulated barcode */}
                    <div className="flex gap-0.5 items-center bg-slate-50 p-1 rounded border border-slate-100">
                      <div className="w-0.5 h-6 bg-slate-800" />
                      <div className="w-1 h-6 bg-slate-800" />
                      <div className="w-0.5 h-6 bg-slate-300" />
                      <div className="w-1.5 h-6 bg-slate-800" />
                      <div className="w-0.5 h-6 bg-slate-800" />
                      <div className="w-1 h-6 bg-slate-400" />
                      <div className="w-0.5 h-6 bg-slate-800" />
                      <div className="w-1 h-6 bg-slate-850" />
                    </div>
                    <div className="text-[8px] font-mono text-slate-400">
                      <p>COMPILER</p>
                      <p className="font-bold text-slate-700">SHA256:OK</p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[8px] font-mono text-slate-400">DULY VALIDATED BY</p>
                  <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">{config.signatureText}</p>
                  <p className="text-[8px] text-slate-400 tracking-tight">{config.signatureTitle}</p>
                </div>
              </div>
            </div>
          );

        case 'luxury':
          return (
            <div 
              style={{ backgroundColor: theme.primary }}
              className="w-full h-full p-12 relative flex flex-col justify-between overflow-hidden select-none transition-colors duration-300 text-amber-100"
            >
              {/* Luxury gold floral mesh background overlay */}
              <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" style={{ backgroundColor: theme.secondary }} />
              
              {/* Regal golden borders */}
              <div className="absolute inset-3 border-[3px] border-amber-400/40" />
              <div className="absolute inset-4.5 border border-amber-400/20" />

              {/* Corner floral geometry */}
              <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-amber-400" />
              <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-amber-400" />
              <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-amber-400" />
              <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-amber-400" />

              {/* Content Header */}
              <div className="text-center mt-3 z-10">
                {config.showLogo !== false && config.logoUrl ? (
                  <div className="flex justify-center mb-1.5 items-center" style={{ minHeight: `${config.logoSize || 48}px` }}>
                    <img 
                      src={config.logoUrl} 
                      alt="Logo" 
                      className="object-contain filter brightness-110 saturate-120 Contrast-125" 
                      style={{ height: `${config.logoSize || 48}px`, maxWidth: '220px' }}
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                ) : (
                  <span className="text-[10px] tracking-[0.4em] text-amber-400 font-serif uppercase block mb-1">highly esteemed merit</span>
                )}
                <h1 
                  className="font-serif text-3xl font-bold tracking-widest text-amber-300 uppercase leading-none"
                >
                  {config.title}
                </h1>
                <div className="w-24 h-[1px] bg-amber-400/60 mx-auto mt-2.5" />
              </div>

              {/* Main certificate block */}
              <div className="text-center my-2 z-10">
                <p className="font-serif italic text-xs text-amber-200/80">{config.recipientPrefix || 'With highest honors and commendations, this diploma is bestowed upon'}</p>
                <h2 
                  className="font-serif text-3.5xl font-extrabold tracking-wider text-white mt-1 mb-2 filter drop-shadow"
                >
                  {config.recipientName || 'Your Name'}
                </h2>
                <p className="text-amber-100/70 text-[10px] max-w-md mx-auto leading-relaxed">
                  {config.bodyText || 'who has successfully rendered full dedication, scholarly academic rigor, and excelled in the advanced curriculum of excellence for'}
                </p>
                <p 
                  className="text-base font-bold text-amber-300 tracking-wide mt-2 font-serif"
                >
                  — {config.courseTitle} —
                </p>
              </div>

              {/* Luxury Footer row */}
              <div className="grid grid-cols-3 items-end pt-2 border-t border-amber-400/10 z-10">
                <div className="text-left">
                  <p className="text-[8px] text-amber-400/80 uppercase tracking-widest font-serif">{config.dateLabel || 'DATE BESTOWED'}</p>
                  <p className="text-xs text-stone-200 mt-0.5">{config.issueDate}</p>
                </div>

                <div className="flex justify-center">
                  <div className="relative">
                    {/* Prestigious crest */}
                    <div className="w-16 h-16 rounded-full border-2 border-amber-400 flex items-center justify-center bg-stone-950/40 shadow-xl">
                      <div className="w-13 h-13 rounded-full border border-amber-500/20 flex items-center justify-center flex-col">
                        <GraduationCap className="w-6 h-6 text-amber-400" />
                        <span className="text-[6px] tracking-widest font-serif text-amber-200 mt-0.5">EXCELLENCE</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-serif italic text-sm text-amber-200">{config.signatureText}</p>
                  <div className="h-[1px] w-28 ml-auto my-1 bg-amber-400/30" />
                  <p className="text-[8px] text-amber-400/80 uppercase tracking-wider font-serif">{config.signatureTitle}</p>
                </div>
              </div>

              {/* Elegant security ID watermark */}
              <div className="absolute bottom-2 left-6 right-6 flex justify-between text-[7px] text-amber-500/50 uppercase font-mono tracking-widest">
                <span>SECURE RECORD: {config.certificateId}</span>
                <span>STATE LICENSURE ARCHIVE</span>
              </div>
            </div>
          );

        case 'abstract':
          return (
            <div 
              className="w-full h-full p-11 relative flex flex-col justify-between overflow-hidden select-none transition-colors duration-300"
              style={{ backgroundColor: theme.background }}
            >
              {/* Creative color wave overlays */}
              <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-indigo-500/10 blur-2xl -mr-16 -mt-16 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full bg-amber-500/10 blur-2xl -ml-20 -mb-20 pointer-events-none" />
              
              {/* Organic border design */}
              <div className="absolute inset-4 rounded-xl border-2 border-dashed opacity-40" style={{ borderColor: theme.border }} />

              <div className="text-center z-10 mt-2">
                <div className="flex justify-center mb-1.5 items-center" style={{ minHeight: `${config.logoSize || 40}px` }}>
                  {config.showLogo !== false && config.logoUrl ? (
                    <img 
                      src={config.logoUrl} 
                      alt="Logo" 
                      className="object-contain" 
                      style={{ height: `${config.logoSize || 40}px`, maxWidth: '200px' }}
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="inline-block p-1 bg-slate-100 rounded-full border border-slate-200">
                      <span className="px-2.5 py-0.5 bg-white text-[9px] font-bold uppercase rounded-full text-indigo-600 block shadow-sm border border-slate-100">
                        curriculum pass
                      </span>
                    </div>
                  )}
                </div>
                <h1 
                  className="text-2.5xl font-extrabold tracking-tight"
                  style={{ color: theme.primary }}
                >
                  {config.title}
                </h1>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  {config.subtitle || 'creators, builders & coders track'}
                </p>
              </div>

              <div className="text-center my-3 z-10">
                <p className="text-xs text-slate-400">{config.recipientPrefix || 'Awarded to the inspiring mind of'}</p>
                <div className="my-2.5 relative inline-block">
                  <h2 
                    className="text-3.5xl font-black tracking-tight px-6 z-10 relative"
                    style={{ color: theme.primary }}
                  >
                    {config.recipientName || 'Your Name'}
                  </h2>
                  <div className="absolute bottom-1 left-0 right-0 h-3 opacity-35 -z-10 rounded-sm" style={{ backgroundColor: theme.border }} />
                </div>
                
                <p className="text-xs max-w-md mx-auto text-slate-600 leading-normal">
                  {config.bodyText || 'for successfully completing all collaborative projects, agile sprints, and comprehensive modules for:'}
                </p>
                <p 
                  className="text-base font-extrabold mt-2 hover:scale-102 transition duration-200 inline-block"
                  style={{ color: theme.secondary }}
                >
                  {config.courseTitle}
                </p>
              </div>

              <div className="grid grid-cols-12 gap-2 border-t border-slate-200/50 pt-3 items-center z-10">
                <div className="col-span-4 text-left">
                  <p className="text-[8px] text-slate-400 uppercase font-bold">{config.dateLabel || 'completed date'}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{config.issueDate}</p>
                </div>

                <div className="col-span-4 flex justify-center">
                  {/* Abstract colorful badge */}
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white rotate-[12deg] shadow-lg"
                    style={{ backgroundColor: theme.secondary }}
                  >
                    <GraduationCap className="w-5 h-5 -rotate-[12deg]" />
                  </div>
                </div>

                <div className="col-span-4 text-right">
                  <p className="text-[8px] text-slate-400 uppercase font-bold">certified by</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{config.signatureText}</p>
                  <p className="text-[8px] text-slate-500">{config.signatureTitle}</p>
                </div>
              </div>

              {/* Simple card footer */}
              <div className="absolute bottom-1 right-6 text-[8px] font-semibold text-slate-300">
                ID: {config.certificateId}
              </div>
            </div>
          );



        default:
          return null;
      }
    };

    return (
      <div className="origin-center select-none overflow-hidden shrink-0 border border-slate-750 rounded-2xl shadow-2xl relative bg-white">
        {/* Aspect Ratio A4 landscape framework box */}
        <div 
          ref={containerRef}
          id="certificate-exportable-node"
          className="w-[841px] h-[595px]" // Standard A4 base landscape layout width
        >
          {renderTemplate()}
        </div>
      </div>
    );
  }
);

CertificateCanvas.displayName = 'CertificateCanvas';

export default CertificateCanvas;
