import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical, CheckCircle, Users, BarChart3, Package, Shield,
  ClipboardList, ArrowRight, Zap, BookOpen, Microscope, Cpu,
  GraduationCap, UserCheck, Wrench, ChevronRight, Star,
  MousePointerClick, FileBadge, RotateCcw, Menu, X, Globe,
} from 'lucide-react';
import LandingBG from '@/components/layouts/LandingBG';
import { useLang } from '@/components/i18n/LangContext';

export default function Landing() {
  const { t, lang, toggleLang } = useLang();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const features = [
    { icon: Package, title: t('featureCatalogTitle'), desc: t('featureCatalogDesc') },
    { icon: ClipboardList, title: t('featureApprovalTitle'), desc: t('featureApprovalDesc') },
    { icon: Users, title: t('featureRoleTitle'), desc: t('featureRoleDesc') },
    { icon: BarChart3, title: t('featureReportsTitle'), desc: t('featureReportsDesc') },
    { icon: Shield, title: t('featureReturnTitle'), desc: t('featureReturnDesc') },
    { icon: CheckCircle, title: t('featureStatusTitle'), desc: t('featureStatusDesc') },
  ];

  const stats = [
    { value: '500+', label: t('equipmentItems') },
    { value: '1,200+', label: t('borrowRequests') },
    { value: '4', label: t('userRoles') },
    { value: '99.9%', label: t('uptime') },
  ];

  const steps = [
    {
      icon: MousePointerClick,
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
      icon: Wrench,
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

  const roles = [
    {
      icon: GraduationCap,
      role: t('studentRole'),
      color: 'from-blue-500/20 to-blue-600/5',
      border: 'border-blue-500/20',
      iconColor: 'text-blue-400',
      perks: [t('studentPerk1'), t('studentPerk2'), t('studentPerk3'), t('studentPerk4')],
    },
    {
      icon: BookOpen,
      role: t('lecturerRole'),
      color: 'from-indigo-500/20 to-indigo-600/5',
      border: 'border-indigo-500/20',
      iconColor: 'text-indigo-400',
      perks: [t('lecturerPerk1'), t('lecturerPerk2'), t('lecturerPerk3'), t('lecturerPerk4')],
    },
    {
      icon: UserCheck,
      role: t('labHeadRole'),
      color: 'from-violet-500/20 to-violet-600/5',
      border: 'border-violet-500/20',
      iconColor: 'text-violet-400',
      perks: [t('labHeadPerk1'), t('labHeadPerk2'), t('labHeadPerk3'), t('labHeadPerk4')],
    },
    {
      icon: Wrench,
      role: t('labAssistantRole'),
      color: 'from-cyan-500/20 to-cyan-600/5',
      border: 'border-cyan-500/20',
      iconColor: 'text-cyan-400',
      perks: [t('labAssistantPerk1'), t('labAssistantPerk2'), t('labAssistantPerk3'), t('labAssistantPerk4')],
    },
  ];

  const testimonials = [
    {
      name: t('testimonial1Name'),
      role: t('testimonial1Role'),
      text: t('testimonial1Text'),
    },
    {
      name: t('testimonial2Name'),
      role: t('testimonial2Role'),
      text: t('testimonial2Text'),
    },
    {
      name: t('testimonial3Name'),
      role: t('testimonial3Role'),
      text: t('testimonial3Text'),
    },
  ];

  const equipmentCategories = [
    { icon: Microscope, label: t('microscopes') },
    { icon: FlaskConical, label: t('glassware') },
    { icon: Cpu, label: t('electronics') },
    { icon: Zap, label: t('powerTools') },
    { icon: BarChart3, label: t('measurement') },
    { icon: Shield, label: t('safetyGear') },
  ];

  const navLinks = [
    { label: t('features'), href: '#features', id: 'features' },
    { label: t('howItWorks'), href: '#how-it-works', id: 'how-it-works' },
    { label: t('roles'), href: '#roles', id: 'roles' },
    { label: t('stats'), href: '#stats', id: 'stats' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = ['features', 'how-it-works', 'roles', 'stats', 'cta'];
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

      {/* ── Top Navbar ── */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-[#0a0f1e]/90 backdrop-blur-xl border-b border-white/8 shadow-2xl shadow-black/40'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        {/* Subtle top gradient line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between">

          {/* ── Brand ── */}
          <a href="#" className="flex items-center gap-3 group select-none">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-xl bg-blue-500/30 blur-md group-hover:bg-blue-400/40 transition-all" />
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[17px] font-extrabold tracking-tight">
                Equi<span className="text-blue-400">mon</span>
              </span>
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.18em] mt-0.5">
                {t('labManagement')}
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
              title={lang === 'en' ? 'Switch to Indonesian' : 'Switch to English'}
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
                <span className="text-xs opacity-70">({lang === 'en' ? 'Switch to Indonesian' : 'Switch to English'})</span>
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
      <section className="relative z-10 px-4 sm:px-6 lg:px-12 pt-24 pb-20 text-center max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full mb-8 border border-blue-500/20 backdrop-blur-sm">
          <Zap className="w-3.5 h-3.5" />
          {t('labInventoryBorrowing')}
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
          {t('manageLabGear')}
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            {t('withEquimon')}
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
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
      </section>

      {/* ── Stats Bar ── */}
      <section id="stats" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 mb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          {stats.map(({ value, label }) => (
            <div key={label} className="bg-[#0d1526]/80 backdrop-blur-sm p-6 text-center">
              <p className="text-3xl font-extrabold text-white mb-1">{value}</p>
              <p className="text-slate-500 text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="relative z-10 px-4 sm:px-6 lg:px-12 py-16 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {t('everythingYouNeedToRunLab')}{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t('runTheLab')}
            </span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
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

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('processLabel')}</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {t('howItWorks')}{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Equimon</span>
            {' '}{t('howEquimonWorks')}
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            {t('requestToReturn')}
          </p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ icon: Icon, step, title, desc }) => (
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

      {/* ── Roles ── */}
      <section id="roles" className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('whoItsFor')}</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {t('builtForEvery')}{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{t('stakeholder')}</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            {t('equimonAdapts')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map(({ icon: Icon, role, color, border, iconColor, perks }) => (
            <div key={role} className={`relative bg-gradient-to-b ${color} backdrop-blur-sm border ${border} rounded-2xl p-6 transition-all hover:-translate-y-1`}>
              <div className={`w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <h3 className="font-extrabold text-white text-lg mb-4">{role}</h3>
              <ul className="space-y-2">
                {perks.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm text-slate-400">
                    <ChevronRight className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Equipment Categories ── */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-12 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('inventoryLabel')}</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">{t('whatsInCatalog')}</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">{t('manageBroadRange')}</p>
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

      {/* ── Testimonials ── */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">{t('testimonialsLabel')}</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{t('lovedByLabUsers')}</h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">{t('communityFeedback')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(({ name, role, text }) => (
            <div key={name} className="bg-[#0d1526]/60 backdrop-blur-sm border border-white/5 hover:border-blue-500/20 rounded-2xl p-6 transition-all hover:-translate-y-1">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-blue-400 text-blue-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">"{text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-black">
                  {name.charAt(0)}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{name}</p>
                  <p className="text-slate-500 text-xs">{role}</p>
                </div>
              </div>
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-white" />
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
              {['#features', '#how-it-works', '#roles', '#stats', '#cta'].map(href => (
                <li key={href}>
                  <a href={href} className="hover:text-blue-400 transition-colors capitalize">
                    {href.replace('#', '').replace(/-/g, ' ')}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* System info */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">{t('systemLabel')}</h4>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {t('roleBasedAuth')}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {t('auditTrailHistory')}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {t('multiStepApprovals')}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {t('realTimeStatusTracking')}</li>
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