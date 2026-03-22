import React, { useState, useEffect } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import {
  FlaskConical, CheckCircle, Package, Shield, ClipboardList, ArrowRight, 
  Zap, Microscope, Cpu, MousePointerClick, FileBadge, RotateCcw, 
  Menu, X, Globe, Database, Bell, Lock, FileCheck, TrendingUp, Search,
} from 'lucide-react';
import LandingBG from '@/components/layouts/LandingBG';
import { useLang } from '@/components/i18n/LangContext';
import { clearStoredAuth, getStoredToken } from '@/api/apiClient';
import equimonLogo from '@/assets/images/Equimon Logo.png';

export default function Landing() {
  const { t, lang, toggleLang } = useLang();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
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
    { icon: Microscope, label: t('microscopes') },
    { icon: FlaskConical, label: t('glassware') },
    { icon: Cpu, label: t('electronics') },
    { icon: Zap, label: t('powerTools') },
    { icon: Package, label: t('measurement') },
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
      const hasUser = !!localStorage.getItem('currentUser');

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

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">

      {/* ── Orb background (full page) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <LandingBG />
      </div>

      {/* ── Top Navbar - Fixed ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-[#0a0f1e]/95 backdrop-blur-xl border-b border-white/8 shadow-2xl shadow-black/40'
            : 'bg-[#0a0f1e]/70 backdrop-blur-md border-b border-white/5'
        }`}
      >
        {/* Subtle top gradient line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between">

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
          <div className="px-4 pb-5 pt-2 border-t border-white/5 bg-[#0a0f1e]/95 backdrop-blur-xl space-y-1">
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
      </header>

      {/* ── Hero Section ── */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-12 pt-32 pb-20 text-center max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full mb-8 border border-blue-500/20 backdrop-blur-sm">
          <Zap className="w-3.5 h-3.5" />
          {t('landingTagline')}
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
          {t('labInventoryBorrowing')}
        </h1>

        <p className="text-slate-400 text-base sm:text-lg lg:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
          {t('modernPlatformDesc')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all shadow-2xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            {t('getStarted')} <ArrowRight className="w-5 h-5" />
          </button>
          <a
            href="#features"
            className="inline-flex items-center gap-2 border border-white/10 hover:border-white/25 text-slate-300 hover:text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all backdrop-blur-sm hover:-translate-y-0.5"
          >
            {t('exploreFeatures')}
          </a>
        </div>

        {/* Key Benefits */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-[#0d1526]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
            <Database className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-white font-bold mb-2">{t('featureCatalogTitle')}</h3>
            <p className="text-slate-400 text-sm">{t('featureCatalogDesc')}</p>
          </div>
          <div className="bg-[#0d1526]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
            <FileCheck className="w-8 h-8 text-indigo-400 mb-3" />
            <h3 className="text-white font-bold mb-2">{t('featureApprovalTitle')}</h3>
            <p className="text-slate-400 text-sm">{t('featureApprovalDesc')}</p>
          </div>
          <div className="bg-[#0d1526]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
            <Shield className="w-8 h-8 text-cyan-400 mb-3" />
            <h3 className="text-white font-bold mb-2">{t('featureStatusTitle')}</h3>
            <p className="text-slate-400 text-sm">{t('featureStatusDesc')}</p>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('features')}</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {t('everythingYouNeedToRunLab')}{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t('runTheLab')}
            </span>
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            {t('equimonCoversLifecycle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group relative bg-[#0d1526]/60 backdrop-blur-sm border border-white/5 hover:border-blue-500/30 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 group-hover:bg-blue-500/20 transition-colors">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-bold text-base text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works / Workflow ── */}
      <section id="workflow" className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('processLabel')}</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {t('howEquimonWorks')}
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            {t('requestToReturn')}
          </p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="relative bg-[#0d1526]/60 backdrop-blur-sm border border-white/5 hover:border-blue-500/20 rounded-2xl p-6 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-xs font-black text-blue-500/50 tracking-widest">{step}</span>
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Equipment Categories ── */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-12 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('inventoryLabel')}</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">{t('whatsInCatalog')}</h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            {t('manageBroadRange')}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {equipmentCategories.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 bg-[#0d1526]/60 border border-white/5 hover:border-blue-500/30 rounded-full px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-all cursor-default">
              <Icon className="w-4 h-4 text-blue-400" />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ── System Capabilities ── */}
      <section id="capabilities" className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('capabilities')}</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {t('builtForEvery')}{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t('stakeholder')}
            </span>
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            {t('equimonAdapts')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {capabilities.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="relative bg-gradient-to-b from-blue-500/10 to-transparent backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-blue-400/40">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-extrabold text-white text-base mb-3">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent backdrop-blur-sm p-10 sm:p-16 text-center">
          {/* Glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{t('readyToGetStarted')}</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              {t('signInToAccess')}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-10 py-3.5 rounded-xl text-base transition-all shadow-2xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              {t('signInNow')} <ArrowRight className="w-5 h-5" />
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