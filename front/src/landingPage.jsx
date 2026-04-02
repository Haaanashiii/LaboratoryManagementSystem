import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import {
  CheckCircle, Package, Shield, ClipboardList, ArrowRight, 
  Zap, Cpu, FileBadge, RotateCcw, 
  Menu, X, Globe, Database, Bell, Lock, FileCheck, TrendingUp, Search,
  Laptop, Wifi, Server, HardDrive, Monitor, Cable, Layers, ChevronRight,
  Sparkles, BarChart3,
} from 'lucide-react';
import LandingBG from '@/components/layouts/LandingBG';
import { useLang } from '@/components/i18n/LangContext';
import { clearStoredAuth, getStoredToken, getStoredUser } from '@/api/apiClient';
import equimonLogo from '@/assets/images/Equimon Logo.png';

export default function Landing() {
  const { t, lang, toggleLang } = useLang();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [mobileOpen, setMobileOpen] = useState(false);

  const features = [
    { 
      icon: Database, 
      title: 'Centralized Inventory', 
      desc: 'Comprehensive database to record all laboratory equipment with detailed specifications, quantities, and availability status.' 
    },
    { 
      icon: ClipboardList, 
      title: 'Borrowing Requests', 
      desc: 'Streamlined request system allowing students to submit equipment borrowing requests with automatic tracking and notifications.' 
    },
    { 
      icon: FileCheck, 
      title: 'Lecturer Verification', 
      desc: 'Multi-level approval workflow ensuring all requests are verified by lecturers before equipment can be borrowed.' 
    },
    { 
      icon: Shield, 
      title: 'Equipment Tracking', 
      desc: 'Real-time monitoring of equipment status, location, and condition throughout the entire borrowing lifecycle.' 
    },
    { 
      icon: Bell, 
      title: 'Automated Notifications', 
      desc: 'Instant alerts for request updates, approvals, return reminders, and equipment availability changes.' 
    },
    { 
      icon: TrendingUp, 
      title: 'Analytics & Reports', 
      desc: 'Comprehensive insights on equipment utilization, borrowing patterns, and inventory management metrics.' 
    },
  ];

  const workflow = [
    {
      icon: Search,
      step: '01',
      title: t('browseCatalog'),
      desc: t('browseCatalogDesc'),
    },
    {
      icon: FileBadge,
      step: '02',
      title: t('approvalWorkflow'),
      desc: t('approvalWorkflowDesc'),
    },
    {
      icon: CheckCircle,
      step: '03',
      title: t('equipmentPreparationStep'),
      desc: t('equipmentPreparationDesc'),
    },
    {
      icon: RotateCcw,
      step: '04',
      title: t('returnAssessment'),
      desc: t('returnAssessmentDesc'),
    },
  ];

  const equipmentCategories = [
    { icon: Laptop, label: 'Laptops & PCs' },
    { icon: Cpu, label: t('electronics') },
    { icon: Wifi, label: 'Networking Gear' },
    { icon: Server, label: 'Servers & Racks' },
    { icon: Monitor, label: 'Displays' },
    { icon: HardDrive, label: 'Storage Devices' },
    { icon: Cable, label: 'Cables & Adapters' },
    { icon: Shield, label: t('safetyGear') },
  ];

  const capabilities = [
    { 
      icon: Lock, 
      title: 'Secure Authentication', 
      desc: 'Role-based access control ensuring users only see relevant features and data.' 
    },
    { 
      icon: Database, 
      title: 'Inventory Management', 
      desc: 'Complete equipment lifecycle management from acquisition to disposal.' 
    },
    { 
      icon: FileCheck, 
      title: 'Approval Workflows', 
      desc: 'Configurable multi-step approval processes with delegation support.' 
    },
    { 
      icon: TrendingUp, 
      title: 'Usage Analytics', 
      desc: 'Data-driven insights for better resource allocation and planning.' 
    },
  ];

  const navLinks = [
    { label: 'Features', href: '#features', id: 'features' },
    { label: 'How It Works', href: '#workflow', id: 'workflow' },
    { label: 'Capabilities', href: '#capabilities', id: 'capabilities' },
  ];

  useEffect(() => {
    if (navigationType === 'POP') {
      const hasToken = !!getStoredToken();
      const hasUser = !!getStoredUser();

      if (hasToken || hasUser) {
        clearStoredAuth();
        navigate('/login', { replace: true });
      }
    }
  }, [navigationType, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = ['features', 'workflow', 'capabilities', 'cta'];
    const observers = sections.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  // ── Fade-in on scroll ──
  useEffect(() => {
    const els = document.querySelectorAll('.fade-in-up');
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.7);opacity:0} }
        @keyframes gradient-x { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes slide-down { from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:translateY(0)} }
        .fade-in-up { opacity:0; transform:translateY(32px); transition:opacity .65s cubic-bezier(.16,1,.3,1), transform .65s cubic-bezier(.16,1,.3,1); }
        .fade-in-up.visible { opacity:1; transform:translateY(0); }
        .stagger-1 { transition-delay:.08s }
        .stagger-2 { transition-delay:.16s }
        .stagger-3 { transition-delay:.24s }
        .stagger-4 { transition-delay:.32s }
        .stagger-5 { transition-delay:.40s }
        .stagger-6 { transition-delay:.48s }
        .animated-gradient { background-size:200% 200%; animation:gradient-x 6s ease infinite; }
        .float-anim { animation:float 6s ease-in-out infinite; }
        .shimmer-text { background:linear-gradient(90deg,#60a5fa,#a78bfa,#38bdf8,#60a5fa); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:shimmer 4s linear infinite; }
        .hero-badge { animation:slide-down .6s cubic-bezier(.16,1,.3,1) both; }
        .card-glow:hover { box-shadow:0 0 32px 0 rgba(59,130,246,.18); }
      `}</style>

      {/* ── Orb background (full page) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <LandingBG />
      </div>

      {/* ── Top Navbar - Floating Panel ── */}
      <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-5xl transition-all duration-300 rounded-2xl ${
            scrolled
              ? 'bg-[#0a0f1e]/95 backdrop-blur-xl shadow-2xl shadow-black/60'
              : 'bg-[#0d1526]/80 backdrop-blur-md shadow-xl shadow-black/40'
          }`}
        >
        {/* Subtle top gradient line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent rounded-t-2xl" />

        <nav className="px-6 sm:px-10 h-16 flex items-center justify-between">

          {/* ── Brand ── */}
          <a href="#" className="flex items-center gap-3 group select-none">
            <div className="relative w-11 h-11">
              <div className="absolute inset-0 rounded-xl bg-blue-500/30 blur-md group-hover:bg-blue-400/40 transition-all" />
              <div className="relative w-11 h-11 rounded-xl flex items-center justify-center shadow-lg">
                <img src={equimonLogo} alt="Equimon Logo" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[17px] font-extrabold tracking-tight">
                Equi<span className="text-blue-400">mon</span>
              </span>
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.18em] mt-0.5">
                Lab Management
              </span>
            </div>
          </a>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden md:flex items-center bg-white/[0.03] border border-white/[0.06] rounded-full px-2 py-1.5 gap-1">
            <a
              href="#"
              onClick={e => { e.preventDefault(); setActiveSection('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`relative px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${activeSection === 'home' || activeSection === '' ? 'text-white bg-blue-600/80 shadow-md shadow-blue-700/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              Home
            </a>
            {navLinks.map(({ label, href, id }) => (
              <a
                key={id}
                href={href}
                className={`relative px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeSection === id
                    ? 'text-white bg-blue-600/80 shadow-md shadow-blue-700/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </a>
            ))}
          </div>

          {/* ── Right: CTA + Mobile toggle ── */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-all"
              title={lang === 'en' ? t('switchToIndonesian') : t('switchToEnglish')}
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-bold">{lang.toUpperCase()}</span>
            </button>

            <button
              onClick={() => navigate('/login')}
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-white px-5 py-2 rounded-full transition-all duration-200
                bg-gradient-to-r from-blue-600 to-indigo-600
                hover:from-blue-500 hover:to-indigo-500
                shadow-lg shadow-blue-700/30 hover:shadow-blue-500/40
                hover:-translate-y-0.5 active:translate-y-0"
            >
              {t('signIn')}
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* ── Mobile Dropdown ── */}
        <div
          className={`md:hidden transition-all duration-300 overflow-hidden ${
            mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pb-5 pt-2 border-t border-white/5 rounded-b-2xl bg-[#0a0f1e]/95 backdrop-blur-xl space-y-1">
            <a
              href="#"
              onClick={e => { e.preventDefault(); setActiveSection('home'); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeSection === 'home' || activeSection === '' ? 'text-white bg-blue-600/20 border border-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeSection === 'home' || activeSection === '' ? 'bg-blue-400' : 'bg-slate-600'}`} />
              Home
            </a>
            {navLinks.map(({ label, href, id }) => (
              <a
                key={id}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeSection === id
                    ? 'text-white bg-blue-600/20 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeSection === id ? 'bg-blue-400' : 'bg-slate-600'}`} />
                {label}
              </a>
            ))}
            <div className="pt-3 border-t border-white/5 space-y-2">
              {/* Mobile Language Switcher */}
              <button
                onClick={toggleLang}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-white px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all"
              >
                <Globe className="w-4 h-4" />
                <span className="font-bold">{lang.toUpperCase()}</span>
                <span className="text-xs opacity-70">({lang === 'en' ? t('switchToIndonesian') : t('switchToEnglish')})</span>
              </button>
              
              <button
                onClick={() => { setMobileOpen(false); navigate('/login'); }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-lg shadow-blue-700/30"
              >
                {t('signIn')} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-12 pt-36 pb-24 text-center max-w-5xl mx-auto">
        {/* Floating glow orbs */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-64 h-64 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="hero-badge inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full mb-8 border border-blue-500/20 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5" />
          {t('landingTagline')}
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-black leading-[1.15] tracking-tight mb-6 max-w-3xl mx-auto">
          <span className="shimmer-text text-3xl sm:text-4xl font-extrabold tracking-widest uppercase">Equimon</span>
          {' '}— Borrow equipment, get approvals fast, and track every request in one place.{ ' ' }
        </h1>

        <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('modernPlatformDesc')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="group inline-flex items-center gap-2 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all shadow-2xl shadow-blue-700/40 hover:shadow-blue-500/50 hover:-translate-y-0.5 animated-gradient"
            style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5,#0ea5e9)', backgroundSize:'200% 200%' }}
          >
            {t('getStarted')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="#features"
            className="inline-flex items-center gap-2 border border-white/10 hover:border-blue-500/40 bg-white/[0.03] hover:bg-blue-500/5 text-slate-300 hover:text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all backdrop-blur-sm hover:-translate-y-0.5"
          >
            {t('exploreFeatures')}
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* Stat chips */}
        <div className="mt-12 flex flex-wrap justify-center gap-3 text-xs font-semibold">
          {[
            { val: '500+', label: 'Devices Tracked' },
            { val: '3-Step', label: 'Approval Flow' },
            { val: '4 Roles', label: 'Access Levels' },
            { val: '99.9%', label: 'Uptime' },
          ].map(({ val, label }) => (
            <div key={label} className="flex items-center gap-2 bg-white/[0.04] border border-white/8 rounded-full px-4 py-1.5 text-slate-400">
              <span className="text-white font-bold">{val}</span> {label}
            </div>
          ))}
        </div>

        {/* Key Benefits */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          {[
            { Icon: Database, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10', title: t('featureCatalogTitle'), desc: t('featureCatalogDesc') },
            { Icon: FileCheck, color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/10', title: t('featureApprovalTitle'), desc: t('featureApprovalDesc') },
            { Icon: Shield, color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/10', title: t('featureStatusTitle'), desc: t('featureStatusDesc') },
          ].map(({ Icon, color, border, bg, title, desc }, i) => (
            <div key={title} className={`card-glow bg-[#0d1526]/70 backdrop-blur-sm border border-white/5 hover:${border} rounded-2xl p-6 transition-all hover:-translate-y-1`}>
              <div className={`w-10 h-10 ${bg} border ${border} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="text-white font-bold mb-1.5">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="relative z-10 px-4 sm:px-6 lg:px-12 py-24 max-w-7xl mx-auto">
        {/* Section divider glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        <div className="text-center mb-14 fade-in-up">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">
            <Sparkles className="w-3 h-3" /> {t('features')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {t('everythingYouNeedToRunLab')}{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              {t('runTheLab')}
            </span>
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            {t('equimonCoversLifecycle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className={`fade-in-up stagger-${Math.min(i + 1, 6)} group relative bg-gradient-to-br from-[#0d1526]/80 to-[#0a0f1e]/60 backdrop-blur-sm border border-white/5 hover:border-blue-500/30 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 card-glow`}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-300" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-bold text-base text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works / Workflow ── */}
      <section id="workflow" className="relative z-10 px-4 sm:px-6 lg:px-12 py-24 max-w-7xl mx-auto">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

        <div className="text-center mb-14 fade-in-up">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">
            <Layers className="w-3 h-3" /> {t('processLabel')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            How{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">Equimon</span>
            {' '}{t('howEquimonWorks')}
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            {t('requestToReturn')}
          </p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-blue-500/10 via-blue-500/40 to-blue-500/10" />
          {/* Connector dots */}
          {[0,1,2,3].map(i => (
            <div key={i} className="hidden lg:block absolute top-[36px] w-2 h-2 rounded-full bg-blue-400 ring-4 ring-blue-500/20" style={{ left: `calc(12.5% + ${i * 25}% - 4px)` }} />
          ))}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map(({ icon: Icon, step, title, desc }, i) => (
              <div key={step} className={`fade-in-up stagger-${i + 1} relative bg-gradient-to-b from-[#0d1526]/80 to-[#0a0f1e]/60 backdrop-blur-sm border border-white/5 hover:border-indigo-500/30 rounded-2xl p-6 transition-all duration-300 group hover:-translate-y-1.5 card-glow`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-2xl font-black text-white/10 group-hover:text-white/20 transition-colors">{step}</span>
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Equipment Categories ── */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 max-w-6xl mx-auto fade-in-up">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-cyan-400 mb-4">
            <Database className="w-3 h-3" /> {t('inventoryLabel')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">{t('whatsInCatalog')}</h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Equimon manages a broad range of IT assets across multiple categories.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {equipmentCategories.map(({ icon: Icon, label }, i) => (
            <div
              key={label}
              className="group flex items-center gap-2.5 bg-[#0d1526]/60 border border-white/5 hover:border-blue-500/40 hover:bg-blue-500/8 rounded-full px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-all duration-200 cursor-default"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <Icon className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ── System Capabilities ── */}
      <section id="capabilities" className="relative z-10 px-4 sm:px-6 lg:px-12 py-24 max-w-7xl mx-auto">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        <div className="text-center mb-14 fade-in-up">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-cyan-400 mb-4">
            <BarChart3 className="w-3 h-3" /> {t('capabilities')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {t('builtForEvery')}{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t('stakeholder')}
            </span>
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            {t('equimonAdapts')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {capabilities.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className={`fade-in-up stagger-${i + 1} group relative overflow-hidden bg-gradient-to-b from-blue-500/10 via-[#0d1526]/60 to-transparent backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-400/50 card-glow`}
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-extrabold text-white text-base mb-3">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="relative z-10 px-4 sm:px-6 lg:px-12 py-24 max-w-7xl mx-auto fade-in-up">
        <div className="relative overflow-hidden rounded-3xl border border-blue-500/25 bg-gradient-to-br from-blue-600/20 via-indigo-600/15 to-cyan-600/10 backdrop-blur-sm p-12 sm:p-20 text-center">
          {/* Animated glow orbs */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none float-anim" />
          <div className="absolute -bottom-24 right-1/4 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" style={{ animation: 'float 8s ease-in-out infinite reverse' }} />
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-300 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-blue-500/20 mb-6">
              <Sparkles className="w-3 h-3" /> Ready to begin?
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
              {t('readyToGetStarted')}
            </h2>
            <p className="text-slate-400 mb-10 max-w-md mx-auto text-base">
              {t('signInToAccess')}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="group inline-flex items-center gap-2 text-white font-bold px-12 py-4 rounded-2xl text-base transition-all shadow-2xl shadow-blue-700/40 hover:shadow-blue-500/60 hover:-translate-y-1 animated-gradient"
              style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5,#0ea5e9)', backgroundSize:'200% 200%' }}
            >
              {t('signInNow')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 bg-[#080c18]/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <img src={equimonLogo} alt="Equimon Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-lg font-extrabold">Equi<span className="text-blue-400">mon</span></span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              {t('footerTagline')}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">{t('navigationLabel')}</h4>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><a href="#features" className="hover:text-blue-400 transition-colors">{t('features')}</a></li>
              <li><a href="#workflow" className="hover:text-blue-400 transition-colors">{t('howItWorks')}</a></li>
              <li><a href="#capabilities" className="hover:text-blue-400 transition-colors">{t('capabilities')}</a></li>
              <li><a href="#cta" className="hover:text-blue-400 transition-colors">{t('getStarted')}</a></li>
            </ul>
          </div>

          {/* System info */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">{t('systemLabel')}</h4>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-400" /> {t('roleBasedAuth')}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-400" /> {t('auditTrailHistory')}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-400" /> {t('multiStepApprovals')}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-400" /> {t('realTimeStatusTracking')}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 px-4 sm:px-6 lg:px-12 py-5 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} <span className="text-slate-500 font-semibold">Equimon</span>. {t('allRightsReserved')}
          </p>
          <p className="text-slate-700 text-xs">{t('landingTagline')}</p>
        </div>
      </footer>
    </div>
  );
}