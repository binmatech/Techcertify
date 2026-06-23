import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Award, Calendar, Mail, ArrowLeft, 
  RefreshCw, ShieldAlert, BookOpen, GraduationCap, Plus, CheckCircle, Clock, UserCheck, Tag, Info, Trash2,
  Sliders, Eye, Save, Check, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Course } from '../types';
import CertificateCanvas from './CertificateCanvas';

interface AdminDashboardProps {
  onBack: () => void;
  courses: Course[];
  onReloadCourses: () => void;
}

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  selectedCourseIds: string[];
  isAdmin: boolean;
}

export default function AdminDashboard({ onBack, courses = [], onReloadCourses }: AdminDashboardProps) {
  const [activePanel, setActivePanel] = useState<'students' | 'courses' | 'design'>('students');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentsError, setStudentsError] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');

  // Course management form state
  const [showAddCourseForm, setShowAddCourseForm] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseCategory, setCourseCategory] = useState('Development');
  const [courseDuration, setCourseDuration] = useState('');
  const [courseInstructor, setCourseInstructor] = useState('');
  
  // Feedback states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Course catalogue filter
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  // Course purging states
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgingCourses, setPurgingCourses] = useState(false);
  const [purgeError, setPurgeError] = useState('');
  const [purgeSuccess, setPurgeSuccess] = useState('');

  // Selected individual course deletion state
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [courseActionError, setCourseActionError] = useState('');
  const [courseActionSuccess, setCourseActionSuccess] = useState('');

  // Student deletion states
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [studentActionError, setStudentActionError] = useState('');
  const [studentActionSuccess, setStudentActionSuccess] = useState('');

  // Dynamic Certificate Design Customizer States
  const [designerTitle, setDesignerTitle] = useState('CERTIFICATE OF COMPLETION');
  const [designerSubtitle, setDesignerSubtitle] = useState('OFFICIAL STUDENT ACHIEVEMENT CREDENTIAL');
  const [designerSignatureText, setDesignerSignatureText] = useState('Dr. Sarah Jenkins');
  const [designerSignatureTitle, setDesignerSignatureTitle] = useState('Academic Director & Lead Dean');
  const [designerSealText, setDesignerSealText] = useState('VERIFIED');
  const [designerRecipientPrefix, setDesignerRecipientPrefix] = useState('This is proudly presented to');
  const [designerBodyText, setDesignerBodyText] = useState('for successfully completing all academic requirements, practical assessments, and hands-on laboratory exercises for the specialized curriculum in');
  const [designerDateLabel, setDesignerDateLabel] = useState('Date of Issuance');
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showId, setShowId] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [showSeal, setShowSeal] = useState(true);
  const [designerLogoUrl, setDesignerLogoUrl] = useState('');
  const [showLogo, setShowLogo] = useState(true);
  const [designerLogoSize, setDesignerLogoSize] = useState(56);

  const [savingDesign, setSavingDesign] = useState(false);
  const [designError, setDesignError] = useState('');
  const [designSuccess, setDesignSuccess] = useState('');

  const PREVIEW_THEME = {
    id: 'emerald',
    name: 'Imperial Emerald',
    primary: '#064E3B',
    secondary: '#065F46',
    accent: '#A67C1E',
    border: '#10B981',
    text: '#064E3B',
    background: '#F0FDF4',
    gradient: 'from-emerald-950 via-teal-900 to-stone-900'
  };

  const fetchCertificateDesign = async () => {
    try {
      const response = await fetch('/api/certificate-design');
      if (response.ok) {
        const data = await response.json();
        if (data.design) {
          setDesignerTitle(data.design.title || 'CERTIFICATE OF COMPLETION');
          setDesignerSubtitle(data.design.subtitle || 'OFFICIAL STUDENT ACHIEVEMENT CREDENTIAL');
          setDesignerSignatureText(data.design.signatureText || 'Dr. Sarah Jenkins');
          setDesignerSignatureTitle(data.design.signatureTitle || 'Academic Director & Lead Dean');
          setDesignerSealText(data.design.sealText || 'VERIFIED');
          setDesignerRecipientPrefix(data.design.recipientPrefix || 'This is proudly presented to');
          setDesignerBodyText(data.design.bodyText || 'for successfully completing all academic requirements, practical assessments, and hands-on laboratory exercises for the specialized curriculum in');
          setDesignerDateLabel(data.design.dateLabel || 'Date of Issuance');
          setShowSubtitle(data.design.showSubtitle !== undefined ? data.design.showSubtitle : true);
          setShowDate(data.design.showDate !== undefined ? data.design.showDate : true);
          setShowId(data.design.showId !== undefined ? data.design.showId : true);
          setShowSignature(data.design.showSignature !== undefined ? data.design.showSignature : true);
          setShowSeal(data.design.showSeal !== undefined ? data.design.showSeal : true);
          setDesignerLogoUrl(data.design.logoUrl || '');
          setShowLogo(data.design.showLogo !== undefined ? data.design.showLogo : true);
          setDesignerLogoSize(data.design.logoSize !== undefined ? Number(data.design.logoSize) : 56);
        }
      }
    } catch (err) {
      console.error("Failed loading certificate design:", err);
    }
  };

  useEffect(() => {
    fetchCertificateDesign();
  }, []);

  const [dragActive, setDragActive] = useState(false);

  const handleLogoUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file. (e.g., PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const scaleSize = MAX_WIDTH / img.width;
        
        if (img.width > MAX_WIDTH) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/png');
          setDesignerLogoUrl(base64);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSaveCertificateDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    setDesignError('');
    setDesignSuccess('');
    setSavingDesign(true);

    try {
      const token = localStorage.getItem('certifysuite_token');
      const response = await fetch('/api/admin/certificate-design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: designerTitle,
          subtitle: designerSubtitle,
          signatureText: designerSignatureText,
          signatureTitle: designerSignatureTitle,
          sealText: designerSealText,
          recipientPrefix: designerRecipientPrefix,
          bodyText: designerBodyText,
          dateLabel: designerDateLabel,
          showSubtitle,
          showDate,
          showId,
          showSignature,
          showSeal,
          logoUrl: designerLogoUrl,
          showLogo,
          logoSize: designerLogoSize,
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to persist customized certificate layout.');
      }

      setDesignSuccess('Certificate design & visible fields saved successfully!');
      setTimeout(() => setDesignSuccess(''), 4050);
    } catch (err: any) {
      setDesignError(err.message || 'Server rejected certificate design update.');
    } finally {
      setSavingDesign(false);
    }
  };

  const handleDeleteIndividualCourse = async (courseId: string) => {
    setCourseActionError('');
    setCourseActionSuccess('');
    setDeletingCourseId(courseId);
    try {
      const token = localStorage.getItem('certifysuite_token');
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete selected course.');
      }
      setCourseActionSuccess('Selected course has been deleted from catalog.');
      if (onReloadCourses) {
        onReloadCourses();
      }
      setTimeout(() => {
        setCourseActionSuccess('');
      }, 3000);
    } catch (err: any) {
      setCourseActionError(err.message || 'Server rejected selected course deletion.');
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handlePurgeAllCourses = async () => {
    setPurgeError('');
    setPurgeSuccess('');
    setPurgingCourses(true);
    try {
      const token = localStorage.getItem('certifysuite_token');
      const response = await fetch('/api/admin/courses', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear courses catalog.');
      }
      setPurgeSuccess('All academic courses cleared successfully.');
      if (onReloadCourses) {
        onReloadCourses();
      }
      setTimeout(() => {
        setShowPurgeConfirm(false);
        setPurgeSuccess('');
      }, 2000);
    } catch (err: any) {
      setPurgeError(err.message || 'Server rejected administrative purge request.');
    } finally {
      setPurgingCourses(false);
    }
  };

  const handleDeleteStudentClick = (studentId: string, email: string) => {
    if (email === "nuddywale@gmail.com") {
      setStudentActionError("Safety Alert: System administrator accounts cannot be deleted to prevent locking out this workspace.");
      return;
    }

    if (confirmDeleteId === studentId) {
      executeDeleteStudent(studentId);
    } else {
      setConfirmDeleteId(studentId);
      setTimeout(() => {
        setConfirmDeleteId(prev => prev === studentId ? null : prev);
      }, 4000);
    }
  };

  const executeDeleteStudent = async (studentId: string) => {
    setStudentActionError('');
    setStudentActionSuccess('');
    setDeletingStudentId(studentId);
    setConfirmDeleteId(null);

    try {
      const token = localStorage.getItem('certifysuite_token');
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete selected student from database.');
      }
      setStudentActionSuccess('The student catalog registration was permanently deleted from the database database.');
      fetchStudents();
      setTimeout(() => {
        setStudentActionSuccess('');
      }, 4000);
    } catch (err: any) {
      setStudentActionError(err.message || 'Server rejected selected student deletion action.');
      setTimeout(() => {
        setStudentActionError('');
      }, 5000);
    } finally {
      setDeletingStudentId(null);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    setStudentsError('');
    try {
      const token = localStorage.getItem('certifysuite_token');
      const response = await fetch('/api/admin/students', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to retrieve registered students.');
      }
      setStudents(data.students || []);
    } catch (err: any) {
      console.error(err);
      setStudentsError(err.message || 'Administrative student query rejected.');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCourse = 
      selectedCourseFilter === 'all' || 
      student.selectedCourseIds.includes(selectedCourseFilter);

    return matchesSearch && matchesCourse;
  });

  // Filter courses
  const filteredCourses = courses.filter(course => {
    const query = courseSearchQuery.toLowerCase();
    return (
      course.title.toLowerCase().includes(query) ||
      course.code.toLowerCase().includes(query) ||
      course.category.toLowerCase().includes(query) ||
      course.instructor.toLowerCase().includes(query)
    );
  });

  // KPI Calculations
  const totalStudentsCount = students.length;
  const adminCount = students.filter(s => s.isAdmin).length;
  const totalEnrollments = students.reduce((sum, s) => sum + (s.selectedCourseIds?.length || 0), 0);

  // Helper to map course ID to Title
  const getCourseTitle = (courseId: string) => {
    const found = courses.find(c => c.id === courseId);
    return found ? found.title : courseId;
  };

  // Submit adding new course
  const handleAddCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!courseTitle.trim() || !courseCode.trim() || !courseDuration.trim() || !courseInstructor.trim()) {
      setFormError('Please fill out all fields carefully.');
      return;
    }

    setFormLoading(true);
    try {
      const token = localStorage.getItem('certifysuite_token');
      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: courseTitle.trim(),
          code: courseCode.trim(),
          category: courseCategory,
          duration: courseDuration.trim(),
          instructor: courseInstructor.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register the course record.');
      }

      setFormSuccess(`Course "${data.course?.title}" registered successfully!`);
      
      // Clear form inputs
      setCourseTitle('');
      setCourseCode('');
      setCourseDuration('');
      setCourseInstructor('');
      
      // Reload parent's dynamic courses catalog
      if (onReloadCourses) {
        onReloadCourses();
      }

      // Hide form after brief timeout
      setTimeout(() => {
        setShowAddCourseForm(false);
        setFormSuccess('');
      }, 2000);

    } catch (err: any) {
      setFormError(err.message || 'System was unable to add course record.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto p-4 md:p-6 space-y-6">
      
      {/* Back button, Tabs, and Title */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            id="admin-btn-back"
            onClick={onBack}
            className="p-2.5 bg-slate-905 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 rounded-xl transition flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Switch to Designer</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-slate-100">Administrator Command Console</h2>
              <span className="text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-550/20 rounded-full shrink-0">
                Authorized Ops
              </span>
            </div>
            <p className="text-xs text-slate-400">Manage global student accounts, curriculum cataloging, live certifications and syllabus metrics.</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-950 border border-slate-800/80 p-1.5 rounded-2xl w-full lg:w-auto self-stretch lg:self-auto gap-1">
          <button
            id="admin-tab-students-toggle"
            onClick={() => setActivePanel('students')}
            className={`flex-1 lg:flex-none px-4 py-2 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-2 ${
              activePanel === 'students' 
                ? 'bg-amber-500 text-slate-950 shadow-md animate-fadeIn' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students Directory</span>
          </button>
          
          <button
            id="admin-tab-courses-toggle"
            onClick={() => setActivePanel('courses')}
            className={`flex-1 lg:flex-none px-4 py-2 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-2 ${
              activePanel === 'courses' 
                ? 'bg-amber-500 text-slate-950 shadow-md animate-fadeIn' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Course Catalog ({courses.length})</span>
          </button>

          <button
            id="admin-tab-design-toggle"
            onClick={() => setActivePanel('design')}
            className={`flex-1 lg:flex-none px-4 py-2 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-2 ${
              activePanel === 'design' 
                ? 'bg-amber-500 text-slate-950 shadow-md animate-fadeIn' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Certificate Designer</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-lg backdrop-blur">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Registered Accounts</p>
            <p className="text-2xl font-bold block text-slate-105 mt-0.5">{loadingStudents ? '...' : totalStudentsCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-lg backdrop-blur">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Combined Enrollments</p>
            <p className="text-2xl font-bold block text-slate-105 mt-0.5">{loadingStudents ? '...' : totalEnrollments}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-lg backdrop-blur">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Registered Courses</p>
            <p className="text-2xl font-bold block text-slate-105 mt-0.5">{courses.length}</p>
          </div>
        </div>
      </div>

      {/* PANEL 1: STUDENTS DIRECTORY */}
      {activePanel === 'students' && (
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur overflow-hidden">
          
          {/* Student Filter Toolbar */}
          <div className="p-4 md:p-5 border-b border-slate-800 flex flex-col md:flex-row gap-3.5 justify-between items-center bg-slate-950/20">
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-search-input"
                type="text"
                placeholder="Search students by name or email details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2 bg-slate-950 border border-slate-850 focus:border-amber-500/40 rounded-xl text-xs text-slate-100 outline-none transition placeholder:text-slate-600 font-sans"
              />
            </div>

            <div className="flex gap-2.5 w-full md:w-auto items-center justify-end">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 whitespace-nowrap">Filter by Course:</span>
              <select
                id="admin-course-filter"
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-305 outline-none transition focus:border-amber-500/45 cursor-pointer max-w-xs font-sans font-medium"
              >
                <option value="all">All Enrolled Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>

              <button
                id="admin-btn-refresh"
                onClick={fetchStudents}
                disabled={loadingStudents}
                className="p-2.5 hover:bg-slate-950 bg-slate-950 text-slate-400 hover:text-slate-205 border border-slate-850 rounded-xl transition disabled:opacity-50"
                title="Reload Student List"
              >
                <RefreshCw className={`w-4 h-4 ${loadingStudents ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Student Action Feedback Banners */}
          {(studentActionSuccess || studentActionError) && (
            <div className="px-5 pt-4">
              {studentActionSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{studentActionSuccess}</span>
                </div>
              )}
              {studentActionError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{studentActionError}</span>
                </div>
              )}
            </div>
          )}

          {/* List Content */}
          {studentsError ? (
            <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-950/10">
              <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-rose-400">Administrative Lookup Failed</p>
              <p className="text-xs text-slate-500">{studentsError}</p>
            </div>
          ) : loadingStudents ? (
            <div className="p-20 text-center text-slate-500 space-y-3 bg-slate-950/10 animate-pulse">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto text-opacity-80" style={{ animationDuration: '2s' }} />
              <p className="text-xs tracking-wide">Syncing secure student identity logs from Atlas central registries...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2 bg-slate-950/10">
              <Users className="w-8 h-8 mx-auto text-slate-705 mb-2" />
              <p className="text-sm font-medium text-slate-400">No student profiles found</p>
              <p className="text-xs text-slate-600">Try adjusting your query string parameters or course selection filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    <th className="py-3.5 px-5">Student Registered Identity</th>
                    <th className="py-3.5 px-5">Administrative Status</th>
                    <th className="py-3.5 px-5">Onboarding Date</th>
                    <th className="py-3.5 px-5">Course Enrollment Catalog</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-950/40 transition">
                      {/* Name & Mail */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                            {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-100">{student.name}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-mono">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{student.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="py-4 px-5">
                        {student.isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            ★ System Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                            Student Guest
                          </span>
                        )}
                      </td>

                      {/* Onboarding Log */}
                      <td className="py-4 px-5">
                        <p className="text-xs text-slate-300 flex items-center gap-1.5 font-sans">
                          <Calendar className="w-3 h-3 text-slate-550 shrink-0" />
                          <span>{student.registeredAt}</span>
                        </p>
                      </td>

                      {/* Selected Courses */}
                      <td className="py-4 px-5 max-w-xs md:max-w-md">
                        <div className="flex flex-wrap gap-1.5">
                          {student.selectedCourseIds && student.selectedCourseIds.length > 0 ? (
                            student.selectedCourseIds.map(cId => (
                              <span 
                                key={cId}
                                className="text-[9px] font-mono tracking-wider font-semibold text-slate-300 bg-slate-950 py-0.5 px-2 rounded-md border border-slate-800/85 shrink-0 hover:border-slate-700 hover:text-amber-400 cursor-help transition"
                                title={getCourseTitle(cId)}
                              >
                                {cId}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10.5px] italic text-slate-600 font-sans">No enrolled tracks</span>
                          )}
                        </div>
                      </td>

                      {/* Deletion Actions */}
                      <td className="py-4 px-5 text-right">
                        {student.email !== "nuddywale@gmail.com" ? (
                          <button
                            id={`admin-delete-student-${student.id}`}
                            onClick={() => handleDeleteStudentClick(student.id, student.email)}
                            disabled={deletingStudentId === student.id}
                            className={`p-1.5 px-3 rounded-xl transition text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                              confirmDeleteId === student.id
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                : 'bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent'
                            }`}
                            title={confirmDeleteId === student.id ? "Click again to confirm registration deletion" : "Delete student profile"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>
                              {deletingStudentId === student.id 
                                ? 'Deleting...' 
                                : confirmDeleteId === student.id 
                                  ? 'Confirm delete?' 
                                  : 'Delete'}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider italic">Protected Admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PANEL 2: COURSE CATALOG MANAGER */}
      {activePanel === 'courses' && (
        <div className="space-y-6">
          
          {/* Form expander command card */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 backdrop-blur shadow-lg">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-102 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span>Certified Syllabus Configuration</span>
              </h3>
              <p className="text-xs text-slate-400">Launch new micro-credentials, declare syllabus identifiers, and expand course selections.</p>
            </div>
            
            <div className="flex gap-2.5 w-full md:w-auto items-center justify-end">
              {courses.length > 0 && (
                <button
                  id="admin-btn-purge-courses"
                  onClick={() => {
                    setShowPurgeConfirm(!showPurgeConfirm);
                    setPurgeError('');
                    setPurgeSuccess('');
                    setShowAddCourseForm(false);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                    showPurgeConfirm
                      ? 'bg-rose-500 hover:bg-rose-600 text-white border-transparent'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{showPurgeConfirm ? 'Cancel Purge' : 'Purge All Courses'}</span>
                </button>
              )}
              
              <button
                id="admin-btn-toggle-course-form"
                onClick={() => {
                  setShowAddCourseForm(!showAddCourseForm);
                  setFormError('');
                  setFormSuccess('');
                  setShowPurgeConfirm(false);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                  showAddCourseForm 
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border-rose-500/35' 
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-transparent shadow-md font-extrabold'
                }`}
              >
                <Plus className={`w-4 h-4 transition duration-155 ${showAddCourseForm ? 'rotate-45' : ''}`} />
                <span>{showAddCourseForm ? 'Close Dispatch desk' : 'Dispatch New Course'}</span>
              </button>
            </div>
          </div>

          {/* Purge catalog confirmation sheet */}
          <AnimatePresence>
            {showPurgeConfirm && (
              <motion.div
                id="admin-purge-confirm-banner"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-rose-955/20 border border-rose-500/30 p-5 rounded-2xl space-y-4 shadow-xl backdrop-blur max-w-4xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-500/15 text-rose-400 rounded-xl">
                      <ShieldAlert className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs uppercase font-black text-rose-400 tracking-wider">CRITICAL IRREVERSIBLE OPERATION WARNING</h4>
                      <p className="text-xs text-rose-200 mt-1">
                        You are initiating a global system clean-slate purge of all registered academic curriculum catalogs.
                      </p>
                    </div>
                  </div>

                  {purgeError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-450 text-xs font-medium">
                      {purgeError}
                    </div>
                  )}

                  {purgeSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-555/25 rounded-xl text-emerald-400 text-xs font-semibold animate-bounce">
                      {purgeSuccess}
                    </div>
                  )}

                  <div className="text-xs text-slate-400">
                    This action will purge exactly <span className="font-bold text-rose-400 font-mono">{courses.length}</span> listed track(s) from production databases. In-progress student enrollments may lose their parent course identifiers.
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-rose-500/15">
                    <button
                      id="btn-cancel-purge"
                      type="button"
                      disabled={purgingCourses}
                      onClick={() => setShowPurgeConfirm(false)}
                      className="px-4 py-2 bg-transparent text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-900 rounded-xl border border-slate-800 transition"
                    >
                      Dismiss safely
                    </button>
                    
                    <button
                      id="btn-confirm-purge"
                      type="button"
                      disabled={purgingCourses}
                      onClick={handlePurgeAllCourses}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      {purgingCourses ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Purging Catalog...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Yes, Delete All Courses</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Interactive Course Form Desk */}
          <AnimatePresence>
            {showAddCourseForm && (
              <motion.div
                id="admin-add-course-form-container"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <form 
                  id="admin-add-course-form"
                  onSubmit={handleAddCourseSubmit}
                  className="bg-slate-900/80 border border-slate-800 p-5 md:p-6 rounded-2xl space-y-4 shadow-xl backdrop-blur max-w-4xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <h4 className="text-xs uppercase font-black text-amber-400 tracking-widest">certified curriculum setup sheet</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Syllabus Registry Entry</span>
                  </div>

                  {formError && (
                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="font-medium">{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-550/20 rounded-xl text-emerald-405 text-xs flex items-center gap-2.5 animate-bounce">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold">{formSuccess}</span>
                    </div>
                  )}

                  {/* Form grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Course Code */}
                    <div className="space-y-1.5">
                      <label htmlFor="input-course-code" className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Unique Course Code</label>
                      <input
                        id="input-course-code"
                        type="text"
                        placeholder="e.g. CS-RE-502, CS-FS-202"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-amber-500/40 font-mono tracking-wider"
                      />
                    </div>

                    {/* Course Title */}
                    <div className="space-y-1.5">
                      <label htmlFor="input-course-title" className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Academic Course Title</label>
                      <input
                        id="input-course-title"
                        type="text"
                        placeholder="e.g. Distributed Consensus Systems"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-605 outline-none focus:border-amber-500/40"
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                      <label htmlFor="input-course-category" className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Discipline Category</label>
                      <select
                        id="input-course-category"
                        value={courseCategory}
                        onChange={(e) => setCourseCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-amber-500/45 cursor-pointer font-medium"
                      >
                        <option value="Development">Development (Tech)</option>
                        <option value="Design">Design (Creative)</option>
                        <option value="Data Science">Data Science & AI</option>
                        <option value="Business">Business & PM</option>
                        <option value="Other">Custom Track (Other)</option>
                      </select>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                      <label htmlFor="input-course-duration" className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Duration / Workload</label>
                      <input
                        id="input-course-duration"
                        type="text"
                        placeholder="e.g. 48 Hours, 12 Weeks"
                        value={courseDuration}
                        onChange={(e) => setCourseDuration(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-605 outline-none focus:border-amber-500/40"
                      />
                    </div>

                    {/* Instructor */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="input-course-instructor" className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Lead Instructor Name</label>
                      <input
                        id="input-course-instructor"
                        type="text"
                        placeholder="e.g. Dr. Arthur Pendragon, Alex Rivera"
                        value={courseInstructor}
                        onChange={(e) => setCourseInstructor(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-605 outline-none focus:border-amber-500/40"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/80">
                    <button
                      id="btn-cancel-course-form"
                      type="button"
                      onClick={() => setShowAddCourseForm(false)}
                      className="px-4 py-2 bg-transparent text-slate-405 hover:text-slate-200 text-xs font-semibold hover:bg-slate-950 rounded-xl border border-slate-800/70 transition"
                    >
                      Cancel
                    </button>
                    
                    <button
                      id="btn-submit-course-form"
                      type="submit"
                      disabled={formLoading}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      {formLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Launch Certified Course</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List of active courses currently in the model catalog */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur overflow-hidden">
            
            {/* search toolbar */}
            <div className="p-4 md:p-5 border-b border-slate-800 flex flex-col md:flex-row gap-3.5 justify-between items-center bg-slate-950/20">
              <div className="relative w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-courses-search"
                  type="text"
                  placeholder="Filter curriculum by title, category, code, or faculty..."
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2 bg-slate-950 border border-slate-850 focus:border-amber-500/40 rounded-xl text-xs text-slate-100 outline-none transition placeholder:text-slate-600 font-sans"
                />
              </div>

              <div className="text-[11px] text-slate-505 font-medium flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-550 shrink-0" />
                <span>Showing {filteredCourses.length} of {courses.length} listed programs in catalog.</span>
              </div>
            </div>

            {courseActionError && (
              <div className="p-3.5 m-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-450 text-xs flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-medium">{courseActionError}</span>
              </div>
            )}

            {courseActionSuccess && (
              <div className="p-3.5 m-4 bg-emerald-500/10 border border-emerald-550/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{courseActionSuccess}</span>
              </div>
            )}

            {filteredCourses.length === 0 ? (
              <div className="p-16 text-center text-slate-500 space-y-2 bg-slate-950/10">
                <BookOpen className="w-8 h-8 mx-auto text-slate-705 mb-2" />
                <p className="text-sm font-medium text-slate-400">No matching certified programs</p>
                <p className="text-xs text-slate-600">No certified curriculum matched your keyword parameter description.</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                      <th className="py-3.5 px-5">Syllabus Info</th>
                      <th className="py-3.5 px-5">Certificate Track Code</th>
                      <th className="py-3.5 px-5">Duration Workload</th>
                      <th className="py-3.5 px-5">Discipline Stream</th>
                      <th className="py-3.5 px-5">Assigned Head Faculty</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {filteredCourses.map((course) => (
                      <tr key={course.id} className="hover:bg-slate-950/40 transition">
                        {/* Course Title */}
                        <td className="py-4 px-5">
                          <div>
                            <p className="text-xs font-bold text-slate-150">{course.title}</p>
                            <p className="text-[9.5px] text-slate-505 mt-0.5 select-all font-mono uppercase font-semibold">Slug ID: {course.id}</p>
                          </div>
                        </td>

                        {/* Block Code */}
                        <td className="py-4 px-5">
                          <span className="inline-block text-[10.5px] font-mono tracking-wider font-bold bg-slate-950 px-2.5 py-1 rounded border border-slate-800/80 text-amber-400 select-all">
                            {course.code}
                          </span>
                        </td>

                        {/* duration limit */}
                        <td className="py-4 px-5">
                          <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-550 shrink-0" />
                            <span>{course.duration}</span>
                          </p>
                        </td>

                        {/* stream category */}
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-350">
                            <Tag className="w-3 h-3 text-slate-550 shrink-0" />
                            <span>{course.category}</span>
                          </span>
                        </td>

                        {/* Instructor */}
                        <td className="py-4 px-5">
                          <p className="text-xs font-semibold text-slate-305 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{course.instructor}</span>
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <button
                            id={`admin-delete-course-${course.id}`}
                            onClick={() => handleDeleteIndividualCourse(course.id)}
                            disabled={deletingCourseId === course.id}
                            className="p-1.5 px-3 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/25 hover:border-transparent rounded-xl transition text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Delete this course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{deletingCourseId === course.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL 3: CERTIFICATE DESIGNER */}
      {activePanel === 'design' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 backdrop-blur shadow-lg">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                <span>Certificate Customization Workspace</span>
              </h3>
              <p className="text-xs text-slate-400">Design the global certificate layout, edit signature rosters, and toggle field visibilities for the standard certificate templates.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* Column 1: Editor Form Controls */}
            <form onSubmit={handleSaveCertificateDesign} className="xl:col-span-5 space-y-6">
              
              {/* Feedback banners */}
              {designSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-450 p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{designSuccess}</span>
                </motion.div>
              )}

              {designError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{designError}</span>
                </motion.div>
              )}

              {/* Text Fields design section */}
              <div className="bg-slate-900/60 border border-slate-800/85 p-5 rounded-2xl space-y-4 shadow-lg backdrop-blur">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800/60 pb-2.5 mb-1">
                  <span>1. Typography & Text Fields</span>
                </h3>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Certificate Main Title</label>
                    <input
                      id="designer-input-title"
                      type="text"
                      value={designerTitle}
                      onChange={(e) => setDesignerTitle(e.target.value)}
                      placeholder="e.g. CERTIFICATE OF COMPLETION"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Subtitle & Category Flag</label>
                      <button
                        id="designer-toggle-subtitle"
                        type="button"
                        onClick={() => setShowSubtitle(!showSubtitle)}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded transition ${
                          showSubtitle ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {showSubtitle ? 'VISIBLE' : 'HIDDEN'}
                      </button>
                    </div>
                    <input
                      id="designer-input-subtitle"
                      type="text"
                      disabled={!showSubtitle}
                      value={designerSubtitle}
                      onChange={(e) => setDesignerSubtitle(e.target.value)}
                      placeholder="e.g. OFFICIAL STUDENT ACHIEVEMENT CREDENTIAL"
                      className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Signature Name</label>
                        <button
                          id="designer-toggle-signature"
                          type="button"
                          onClick={() => setShowSignature(!showSignature)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded transition ${
                            showSignature ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {showSignature ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <input
                        id="designer-input-sig-text"
                        type="text"
                        disabled={!showSignature}
                        value={designerSignatureText}
                        onChange={(e) => setDesignerSignatureText(e.target.value)}
                        placeholder="e.g. Dr. Sarah Jenkins"
                        className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Signature Title</label>
                      <input
                        id="designer-input-sig-title"
                        type="text"
                        disabled={!showSignature}
                        value={designerSignatureTitle}
                        onChange={(e) => setDesignerSignatureTitle(e.target.value)}
                        placeholder="e.g. Academic Director"
                        className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Gold Seal Text</label>
                        <button
                          id="designer-toggle-seal"
                          type="button"
                          onClick={() => setShowSeal(!showSeal)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded transition ${
                            showSeal ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {showSeal ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <input
                        id="designer-input-seal-text"
                        type="text"
                        disabled={!showSeal}
                        value={designerSealText}
                        onChange={(e) => setDesignerSealText(e.target.value)}
                        placeholder="e.g. VERIFIED"
                        className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Date of Issuance</label>
                        <button
                          id="designer-toggle-date"
                          type="button"
                          onClick={() => setShowDate(!showDate)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded transition ${
                            showDate ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {showDate ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div className="w-full bg-slate-950/30 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-400 select-none">
                        {showDate ? 'Current System Date' : 'Hidden'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Recipient Presentation Intro</label>
                    <input
                      id="designer-input-recipient-prefix"
                      type="text"
                      value={designerRecipientPrefix}
                      onChange={(e) => setDesignerRecipientPrefix(e.target.value)}
                      placeholder="e.g. This is proudly presented to"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Body Explanation Citation Text</label>
                    <textarea
                      id="designer-input-body-text"
                      rows={2}
                      value={designerBodyText}
                      onChange={(e) => setDesignerBodyText(e.target.value)}
                      placeholder="e.g. for successfully completing all academic requirements..."
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Date Stamp Label</label>
                    <input
                      id="designer-input-date-label"
                      type="text"
                      disabled={!showDate}
                      value={designerDateLabel}
                      onChange={(e) => setDesignerDateLabel(e.target.value)}
                      placeholder="e.g. Date of Issuance"
                      className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Institute Logo Upload Box */}
              <div className="bg-slate-900/60 border border-slate-800/85 p-5 rounded-2xl space-y-4 shadow-lg backdrop-blur">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800/60 pb-2.5 mb-1">
                  <span>3. Certificate Institution Logo</span>
                </h3>

                <div className="space-y-3.5">
                  {/* Drag and Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition relative flex flex-col items-center justify-center min-h-[115px] ${
                      dragActive 
                        ? "border-amber-500 bg-amber-500/10" 
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                    }`}
                  >
                    {designerLogoUrl ? (
                      <div className="flex flex-col items-center gap-2 z-10 w-full">
                        <img 
                          src={designerLogoUrl} 
                          alt="Logo Preview" 
                          className="h-10 max-w-[180px] object-contain rounded bg-slate-900 p-1 border border-slate-850" 
                        />
                        <button
                          type="button"
                          onClick={() => setDesignerLogoUrl('')}
                          className="bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg transition"
                        >
                          Remove Logo
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                        <div className="p-2 rounded-xl bg-slate-905 border border-slate-850">
                          <Upload className="w-5 h-5 text-slate-405" />
                        </div>
                        <p className="text-[11px] text-slate-300 font-semibold animate-pulse">
                          Click to upload / drag & drop logo
                        </p>
                        <p className="text-[9px] text-slate-500">
                          Supports PNG, JPG, WEBP, SVG
                        </p>
                      </div>
                    )}
                    
                    <input
                      id="designer-logo-file-picker"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleLogoUpload(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  {/* Backup Direct Image URL Slot */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Backup Image URL / Base64</label>
                    <input
                      id="designer-input-logo-url"
                      type="text"
                      value={designerLogoUrl}
                      onChange={(e) => setDesignerLogoUrl(e.target.value)}
                      placeholder="Paste direct secure image URL or raw base64 data..."
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition"
                    />
                  </div>

                  {/* Logo Size Adjustment Slider */}
                  <div className="pt-3.5 border-t border-slate-800/40">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Logo Height (Size)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {designerLogoSize}px
                        </span>
                        <button
                          type="button"
                          onClick={() => setDesignerLogoSize(56)}
                          className="text-[9px] font-bold text-slate-500 hover:text-slate-350 transition uppercase tracking-wider"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono text-slate-600">20px</span>
                      <input
                        id="designer-input-logo-size"
                        type="range"
                        min="20"
                        max="150"
                        value={designerLogoSize}
                        onChange={(e) => setDesignerLogoSize(Number(e.target.value))}
                        className="flex-1 accent-amber-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[9px] font-mono text-slate-600">150px</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field Visibility Checklist */}
              <div className="bg-slate-900/60 border border-slate-800/85 p-5 rounded-2xl space-y-4 shadow-lg backdrop-blur">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800/60 pb-2.5 mb-1">
                  <span>2. Field Visibility & Layout Rules</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  
                  {/* Toggle Subtitle */}
                  <button
                    id="designer-checkbox-subtitle"
                    type="button"
                    onClick={() => setShowSubtitle(!showSubtitle)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      showSubtitle 
                        ? 'bg-amber-500/5 border-amber-550/30 text-amber-100'
                        : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      showSubtitle ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {showSubtitle && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="leading-tight">
                      <p className="font-bold text-[11px]">Show Subtitle</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Title subtitle block</p>
                    </div>
                  </button>

                  {/* Toggle Date */}
                  <button
                    id="designer-checkbox-date"
                    type="button"
                    onClick={() => setShowDate(!showDate)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      showDate 
                        ? 'bg-amber-500/5 border-amber-550/30 text-amber-100'
                        : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      showDate ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {showDate && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="leading-tight">
                      <p className="font-bold text-[11px]">Show Date</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Issuance date stamp</p>
                    </div>
                  </button>

                  {/* Toggle ID */}
                  <button
                    id="designer-checkbox-id"
                    type="button"
                    onClick={() => setShowId(!showId)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      showId 
                        ? 'bg-amber-500/5 border-amber-550/30 text-amber-100'
                        : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      showId ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {showId && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="leading-tight">
                      <p className="font-bold text-[11px]">Show Credential ID</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Credential ID footer</p>
                    </div>
                  </button>

                  {/* Toggle Signature */}
                  <button
                    id="designer-checkbox-signature"
                    type="button"
                    onClick={() => setShowSignature(!showSignature)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      showSignature 
                        ? 'bg-amber-500/5 border-amber-550/30 text-amber-100'
                        : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      showSignature ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {showSignature && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="leading-tight">
                      <p className="font-bold text-[11px]">Show Signature</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Lead dean signatures</p>
                    </div>
                  </button>

                  {/* Toggle Seal */}
                  <button
                    id="designer-checkbox-seal"
                    type="button"
                    onClick={() => setShowSeal(!showSeal)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      showSeal 
                        ? 'bg-amber-500/5 border-amber-550/30 text-amber-100'
                        : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      showSeal ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {showSeal && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="leading-tight">
                      <p className="font-bold text-[11px]">Show Seal Stamp</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Center golden seal watermark</p>
                    </div>
                  </button>

                  {/* Toggle Logo */}
                  <button
                    id="designer-checkbox-logo"
                    type="button"
                    onClick={() => setShowLogo(!showLogo)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      showLogo 
                        ? 'bg-amber-500/5 border-amber-550/30 text-amber-100'
                        : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      showLogo ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {showLogo && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="leading-tight">
                      <p className="font-bold text-[11px]">Show Custom Logo</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Primary uploaded logo icon</p>
                    </div>
                  </button>

                </div>

                <div className="pt-2">
                  <button
                    id="designer-btn-submit-layout"
                    type="submit"
                    disabled={savingDesign}
                    className="w-full bg-amber-500 hover:bg-amber-450 text-slate-950 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingDesign ? 'Saving Changes...' : 'Save Certificate Layout Design'}</span>
                  </button>
                </div>

              </div>

            </form>

            {/* Column 2: Live View preview frame */}
            <div className="xl:col-span-7 space-y-3 xl:sticky xl:top-6">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-extrabold uppercase text-amber-500/90 tracking-widest flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Live Design Canvas Preview
                </span>
                <span className="text-[9px] text-slate-500 font-mono tracking-wider">
                  Dimensions: 1000 x 700 px (3:2)
                </span>
              </div>

              {/* Monitor frame wrapper */}
              <div className="bg-slate-950 p-2.5 md:p-3 rounded-3xl border border-slate-800/80 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                  <span className="text-[8px] text-slate-600 font-mono">CLIENT RENDER SIMULATION</span>
                </div>

                {/* Aspect ratio bounding box for certificate preview */}
                <div className="aspect-[3/2] w-full rounded-2xl border border-slate-805/50 overflow-hidden relative shadow-inner bg-slate-900 mt-2">
                  <CertificateCanvas
                    config={{
                      title: designerTitle,
                      subtitle: designerSubtitle,
                      recipientName: "ALEXANDER MERCER",
                      courseTitle: "Premium Micro-Credentials & Software Engineering Mastery",
                      issueDate: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }),
                      certificateId: "CERT-992-UXGD7",
                      signatureText: designerSignatureText,
                      signatureTitle: designerSignatureTitle,
                      sealText: designerSealText,
                      template: "classic",
                      colorThemeId: "navy",
                      showSubtitle,
                      showDate,
                      showId,
                      showSignature,
                      showSeal,
                      recipientPrefix: designerRecipientPrefix,
                      bodyText: designerBodyText,
                      dateLabel: designerDateLabel,
                      logoUrl: designerLogoUrl,
                      showLogo,
                      logoSize: designerLogoSize,
                    }}
                    theme={PREVIEW_THEME}
                  />
                </div>

                <div className="mt-3 text-center">
                  <p className="text-[10px] text-slate-500 leading-normal max-w-md mx-auto">
                    This live demo maps simulated student records. Any changes saved here immediately update the layout certificate for all registered students automatically.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
