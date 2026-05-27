import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, CheckCircle2, Bell, BarChart3, RotateCcw,
  Users, ShieldCheck, ArrowRight, Globe, Menu as MenuIcon, X,
  ClipboardList, Package, ChevronRight, Zap, Lock,
  GraduationCap, ClipboardCheck, Wrench, Cpu, Wifi, Activity, Server, Gauge,
  Monitor, Network, Mouse, HardDrive, Cable, Boxes
} from 'lucide-react'
import itsLogo from './assets/images/Tower2.png'
import ShapeGrid from './components/bits/ShapeGrid'
import SpotlightCard from './components/bits/SpotlightCard'
import StaggeredMenu from './components/bits/StaggeredMenu'
import { useLang } from './components/i18n/LangContext'

// ─── Per-page translations ────────────────────────────────────────────────────
const LP = {
  en: {
    navFeatures: 'Features', navHow: 'How It Works', navCapabilities: 'Capabilities',
    heroLabel: 'Laboratory Equipment Management',
    heroH1a: 'Borrow, Approve &', heroH1b: 'Track', heroH1c: 'Lab Equipment',
    heroSub: 'A smart platform purpose-built for managing lab equipment borrowing — connecting students, lecturers, and lab staff in one unified workflow.',
    heroCTA: 'Sign In Now', heroLearn: 'Explore Features',
    stat1: '50+ items', stat1Label: 'Equipment', stat2: '4-step', stat2Label: 'Borrow flow', stat3: 'Live', stat3Label: 'Tracking',
    featTitle: 'Everything Built In', featSub: 'The complete borrowing lifecycle — from a catalog browse to a verified return.',
    f1t: 'Equipment Catalog', f1d: 'Browse the full inventory with live availability, filtering, and detailed specs.',
    f2t: 'Borrow in Seconds', f2d: 'Fill in dates and purpose, submit, and your request enters the approval queue instantly.',
    f3t: 'Live Status Updates', f3d: 'Get push notifications the moment your request is approved, rejected, or ready for pickup.',
    f4t: 'Two-stage Approval', f4d: 'Requests pass through lecturer review then head-of-lab sign-off before any equipment leaves.',
    f5t: 'Reports & Analytics', f5d: 'Track borrow frequency, overdue returns, and equipment utilisation across the lab.',
    f6t: 'Return & Inventory Sync', f6d: 'Log returns, verify condition, and watch inventory update automatically in real time.',
    howTitle: 'How It Works', howSub: 'Four steps from request to return.',
    s1t: 'Browse & Request', s1d: 'Pick equipment from the catalog and submit a borrow request with dates and purpose.',
    s2t: 'Lecturer Review', s2d: 'Your assigned lecturer reviews and approves (or rejects) the request with notes.',
    s3t: 'Head Approval', s3d: 'The Head of Lab gives final sign-off, confirming the request meets lab policy.',
    s4t: 'Pickup & Return', s4d: 'Lab assistant hands over the equipment. You use it, bring it back, and the system closes the loop.',
    capTitle: 'From Request to Return', capSub: 'Every phase of the borrowing lifecycle — browse, request, approve, collect, and return — in one unified flow.',
    c1t: 'Browse & Request', c1d: 'Search the catalog, check live availability, and submit a borrow request in under a minute.',
    c2t: 'Review & Approve', c2d: 'Requests get lecturer review followed by head-of-lab sign-off before any item is released.',
    c3t: 'Pickup & Return', c3d: 'Lab staff prepares and hands over equipment; returns are logged and inventory updated instantly.',
    borrowTitle: 'What You Can Borrow',
    borrowSub: 'A diverse range of IT lab equipment available for student borrowing — from signal analyzers to embedded systems.',
    borrowLabel: 'Lab Equipment',
    cats: { Electronics: 'Electronics', Computing: 'Computing', Networking: 'Networking', Peripherals: 'Peripherals', Storage: 'Storage', Cables: 'Cables', Tools: 'Tools', Other: 'Other' },
    ctaTitle: 'Ready to Borrow?', ctaSub: 'Sign in to browse the catalog and submit your first borrow request.',
    ctaBtn: 'Sign In to Equimon', footer: '© 2025 Equimon · All rights reserved.',
    footerSub: 'Streamlining lab equipment borrowing for the modern academic institution.'
  },
  id: {
    navFeatures: 'Fitur', navHow: 'Cara Kerja', navCapabilities: 'Kemampuan',
    heroLabel: 'Sistem Manajemen Peralatan Lab',
    heroH1a: 'Pinjam, Setujui &', heroH1b: 'Kelola', heroH1c: 'Peralatan Lab',
    heroSub: 'Platform cerdas untuk peminjaman peralatan lab — menghubungkan mahasiswa, dosen, dan staf laboratorium dalam satu alur kerja.',
    heroCTA: 'Masuk Sekarang', heroLearn: 'Jelajahi Fitur',
    stat1: '50+', stat1Label: 'Peralatan', stat2: '4 langkah', stat2Label: 'Alur pinjam', stat3: 'Live', stat3Label: 'Pelacakan',
    featTitle: 'Semua Sudah Ada', featSub: 'Siklus peminjaman lengkap — dari penelusuran katalog hingga pengembalian terverifikasi.',
    f1t: 'Katalog Peralatan', f1d: 'Telusuri inventaris lengkap dengan ketersediaan langsung dan spesifikasi detail.',
    f2t: 'Pinjam dalam Detik', f2d: 'Isi tanggal dan tujuan, kirim, dan permintaan langsung masuk antrean persetujuan.',
    f3t: 'Update Status Langsung', f3d: 'Terima notifikasi segera saat permintaan disetujui, ditolak, atau siap diambil.',
    f4t: 'Persetujuan Dua Tahap', f4d: 'Permintaan melalui tinjauan dosen lalu persetujuan kepala lab sebelum peralatan diserahkan.',
    f5t: 'Laporan & Analitik', f5d: 'Lacak frekuensi peminjaman, keterlambatan pengembalian, dan utilisasi peralatan di lab.',
    f6t: 'Pengembalian & Sinkronisasi', f6d: 'Catat pengembalian, verifikasi kondisi, dan inventaris diperbarui otomatis secara real time.',
    howTitle: 'Cara Kerjanya', howSub: 'Empat langkah dari permintaan hingga pengembalian.',
    s1t: 'Telusuri & Minta', s1d: 'Pilih peralatan dari katalog dan ajukan permintaan dengan tanggal dan tujuan.',
    s2t: 'Tinjauan Dosen', s2d: 'Dosen meninjau dan menyetujui atau menolak permintaan dengan catatan.',
    s3t: 'Persetujuan Kepala', s3d: 'Kepala Lab memberikan tanda tangan akhir, memastikan permintaan sesuai kebijakan lab.',
    s4t: 'Ambil & Kembalikan', s4d: 'Asisten menyerahkan peralatan. Anda menggunakannya, mengembalikan, dan sistem menutup siklus.',
    capTitle: 'Dari Permintaan hingga Pengembalian', capSub: 'Setiap fase siklus peminjaman — telusuri, minta, setujui, ambil, dan kembalikan — dalam satu alur terpadu.',
    c1t: 'Telusuri & Minta', c1d: 'Cari di katalog, cek ketersediaan langsung, dan ajukan permintaan pinjam dalam hitungan detik.',
    c2t: 'Tinjauan & Persetujuan', c2d: 'Permintaan ditinjau dosen lalu disetujui kepala lab sebelum peralatan dikeluarkan.',
    c3t: 'Ambil & Kembalikan', c3d: 'Staf lab menyiapkan dan menyerahkan peralatan; pengembalian dicatat dan inventaris diperbarui.',
    borrowTitle: 'Apa yang Bisa Dipinjam',
    borrowSub: 'Beragam peralatan lab IT tersedia untuk peminjaman mahasiswa — dari analis sinyal hingga sistem embedded.',
    borrowLabel: 'Peralatan Lab',
    cats: { Electronics: 'Elektronik', Computing: 'Komputasi', Networking: 'Jaringan', Peripherals: 'Periferal', Storage: 'Penyimpanan', Cables: 'Kabel', Tools: 'Alat', Other: 'Lainnya' },
    ctaTitle: 'Siap Meminjam?', ctaSub: 'Masuk untuk menelusuri katalog dan mengajukan permintaan peminjaman pertama Anda.',
    ctaBtn: 'Masuk ke Equimon', footer: '© 2025 Equimon · Semua hak dilindungi.',
    footerSub: 'Menyederhanakan peminjaman peralatan lab untuk institusi akademik modern.'
  },
}

// ─── Feature icon map ─────────────────────────────────────────────────────────
// ─── Feature icon map ─────────────────────────────────────────────────────────
const FEATURE_ICONS = [Cpu, ClipboardList, Bell, Users, BarChart3, RotateCcw]
const FEATURE_COLORS = [
  'rgba(59,130,246,0.15)',   // blue
  'rgba(34,197,94,0.15)',    // green
  'rgba(245,158,11,0.15)',   // amber
  'rgba(139,92,246,0.15)',   // purple
  'rgba(236,72,153,0.15)',   // pink
  'rgba(20,184,166,0.15)',   // teal
]
const FEATURE_ICON_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6']

// ─── Reusable section title ───────────────────────────────────────────────────
const SectionTitle = ({ title, subtitle, center = true }) => (
  <div className={`mb-10 lg:mb-14 ${center ? 'text-center' : ''}`}>
    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#E2E8F0] mb-4 leading-tight">
      {title}
    </h2>
    {subtitle && <p className="text-[#475569] text-lg max-w-2xl mx-auto">{subtitle}</p>}
  </div>
)

// ─── Category metadata matching AddEquipment categoryConfig ──────────────────
const CATEGORY_META = {
  Electronics: { icon: Cpu,       color: '#3B82F6' },
  Computing:   { icon: Monitor,   color: '#8B5CF6' },
  Networking:  { icon: Network,   color: '#06B6D4' },
  Peripherals: { icon: Mouse,     color: '#6366F1' },
  Storage:     { icon: HardDrive, color: '#22C55E' },
  Cables:      { icon: Cable,     color: '#F97316' },
  Tools:       { icon: Wrench,    color: '#F59E0B' },
  Other:       { icon: Boxes,     color: '#64748B' },
}
const FALLBACK_CATEGORIES = Object.keys(CATEGORY_META).map(cat => ({
  category: cat, total: null, available: null,
}))

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const { lang, toggleLang } = useLang()
  const lp = LP[lang] || LP.en

  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const heroRef = useRef(null)
  const heroContentRef = useRef(null)

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const categoryItems = FALLBACK_CATEGORIES.map(({ category }) => ({
    category,
    ...CATEGORY_META[category],
  }))


 


  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // Hero entrance animation
  useEffect(() => {
    if (!heroContentRef.current) return
    const el = heroContentRef.current
    el.style.opacity = '0'
    el.style.transform = 'translateY(28px)'
    const t = setTimeout(() => {
      el.style.transition = 'opacity 0.85s cubic-bezier(0.16,1,0.3,1), transform 0.85s cubic-bezier(0.16,1,0.3,1)'
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    }, 120)
    return () => clearTimeout(t)
  }, [])

  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const mobileNavItems = [
    { label: lp.navFeatures, onClick: () => scrollTo('features') },
    { label: lp.navHow, onClick: () => scrollTo('how-it-works') },
    { label: lp.navCapabilities, onClick: () => scrollTo('capabilities') },
    { label: lp.heroCTA, onClick: () => navigate('/login') },
  ]

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-[#E2E8F0] overflow-x-hidden font-poppins">

      {/* ── Navbar ────────────────────────────────────────────────── */}
      <nav className={`glass-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-0 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={itsLogo} alt="ITS" className="w-auto h-8 object-contain -mr-3" style={{ filter: 'brightness(0) invert(1)' }} />
            <div className="hidden md:flex flex-col leading-tight">
              <span className="text-[#E2E8F0] font-bold text-lg tracking-tight">Equimon</span>
              <span className="text-[#475569] text-sm hidden lg:block">Laboratory Management System</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: lp.navFeatures, id: 'features' },
              { label: lp.navHow, id: 'how-it-works' },
              { label: lp.navCapabilities, id: 'capabilities' },
            ].map(({ label, id }) => (
              <button key={id} onClick={() => scrollTo(id)} className="nav-link bg-transparent border-0 cursor-pointer font-poppins">
                {label}
              </button>
            ))}
          </div>

          {/* Desktop Right actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#94A3B8] border border-[#2A2A3A] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all duration-250 bg-transparent cursor-pointer"
            >
              <Globe size={13} />
              <span>{lang === 'en' ? 'ID' : 'EN'}</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)', border: '1px solid rgba(255,255,255,0.12)', transition: 'filter 0.2s ease, opacity 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
            >
              {lp.heroCTA}
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/5 transition-all cursor-pointer"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>

      </nav>

      {/* ── Mobile side drawer ────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 transition-opacity duration-300"
        style={{
          zIndex: 95,
          background: 'rgba(0,0,0,0.6)',
          opacity: mobileMenuOpen ? 1 : 0,
          pointerEvents: mobileMenuOpen ? 'auto' : 'none',
        }}
        onClick={() => setMobileMenuOpen(false)}
      />
      {/* Drawer panel */}
      <div
        className="md:hidden fixed top-0 right-0 h-full w-72 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          zIndex: 100,
          background: 'rgba(10,10,15,0.92)',
          backdropFilter: 'blur(24px) saturate(200%)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Top accent line */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(to right, transparent, rgba(59,130,246,0.4), transparent)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <p className="text-base font-bold tracking-tight text-white">Equimon</p>
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Laboratory Management System</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#475569' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E2E8F0'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* Nav links */}
        <nav className="flex flex-col px-4 pt-5 gap-1 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.16em] uppercase px-3 mb-2" style={{ color: '#334155' }}>Sections</p>
          {[
            { label: lp.navFeatures, id: 'features', icon: Zap },
            { label: lp.navHow, id: 'how-it-works', icon: ChevronRight },
            { label: lp.navCapabilities, id: 'capabilities', icon: BarChart3 },
          ].map(({ label, id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { scrollTo(id); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 text-left px-3 py-3 rounded-xl text-sm bg-transparent cursor-pointer transition-all"
              style={{ color: '#64748B' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#E2E8F0'; e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <Icon size={13} style={{ color: '#60A5FA' }} />
              </span>
              {label}
            </button>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-4 pb-8 flex flex-col gap-3">
          <div className="h-px mb-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <button
            onClick={toggleLang}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all bg-transparent cursor-pointer"
            style={{ color: '#64748B', border: '1px solid rgba(42,42,58,0.8)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.color = '#60A5FA'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,42,58,0.8)'; e.currentTarget.style.color = '#64748B'; }}
          >
            <Globe size={13} />
            <span>{lang === 'en' ? 'Switch to ID' : 'Switch to EN'}</span>
          </button>
          <button
            onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)', border: '1px solid rgba(255,255,255,0.12)', transition: 'filter 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            {lp.heroCTA}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* ── HERO SECTION ──────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative w-full min-h-screen flex items-center overflow-hidden"
        style={{ paddingTop: '6rem' }}
      >
        {/* ShapeGrid background */}
        <div className="absolute inset-0 z-0">
          <ShapeGrid
            direction="diagonal"
            speed={0.45}
            borderColor="rgba(59, 130, 246, 0.14)"
            squareSize={46}
            hoverFillColor="rgba(59, 130, 246, 0.09)"
            shape="hexagon"
            hoverTrailAmount={5}
          />
        </div>

        {/* Radial blue glow */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 30% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)' }}
        />
        {/* Bottom gradient fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 z-[2] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #0A0A0F)' }}
        />

        {/* Hero content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 py-10 lg:py-16">
          <div ref={heroContentRef} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Left: Text */}
            <div className="flex flex-col gap-6">
              <div className="glass-badge w-fit">
                {lp.heroLabel}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight">
                <span className="text-[#E2E8F0]">{lp.heroH1a} </span>
                <span className="gradient-text">{lp.heroH1b}</span>
                <br />
                <span className="text-[#E2E8F0]">{lp.heroH1c}</span>
              </h1>

              <p className="text-[#64748B] text-base md:text-lg leading-relaxed max-w-xl">
                {lp.heroSub}
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)', border: '1px solid rgba(255,255,255,0.14)', transition: 'filter 0.2s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
                >
                  {lp.heroCTA}
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => scrollTo('features')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#2A2A3A] hover:border-[#3B82F6] text-[#94A3B8] hover:text-[#E2E8F0] font-semibold text-sm transition-all duration-300 cursor-pointer bg-transparent"
                  style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.02)' }}
                >
                  {lp.heroLearn}
                  <ChevronRight size={16} />
                </button>
              </div>

            </div>

            {/* Right: Floating UI mockup — content driven by LP translations */}
            <div className="flex justify-center lg:justify-end items-center">
              <div className="relative w-full max-w-[380px]" style={{ paddingBottom: '2.5rem' }}>

                {/* Main card: How It Works steps */}
                <div className="rounded-2xl p-5 float-animation" style={{
                  background: 'rgba(17,17,24,0.92)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <BookOpen size={15} color="#3B82F6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#E2E8F0]">{lp.howTitle}</div>
                      <div className="text-[10px] text-[#334155]">{lp.howSub}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {[
                      { step: '01', title: lp.s1t, desc: lp.s1d, icon: ClipboardList, color: '#3B82F6' },
                      { step: '02', title: lp.s2t, desc: lp.s2d, icon: ShieldCheck,   color: '#22C55E' },
                      { step: '03', title: lp.s3t, desc: lp.s3d, icon: CheckCircle2,  color: '#8B5CF6' },
                      { step: '04', title: lp.s4t, desc: lp.s4d, icon: Package,       color: '#F59E0B' },
                    ].map(({ step, title, desc, icon: Icon, color }) => (
                      <div key={step} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span className="text-[9px] font-bold mt-0.5 shrink-0 w-5" style={{ color: '#334155' }}>{step}</span>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}14` }}>
                          <Icon size={12} color={color} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] text-[#E2E8F0] font-semibold leading-tight">{title}</div>
                          <div className="text-[9px] text-[#334155] mt-0.5 leading-snug line-clamp-1">{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating badge — top right: featTitle */}
                <div className="absolute -top-3 -right-4 sm:-right-8 rounded-xl px-3 py-2.5 float-animation-delay hidden sm:block" style={{
                  background: 'rgba(13,13,20,0.97)',
                  border: '1px solid rgba(59,130,246,0.22)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  width: 196,
                }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
                      <Zap size={13} color="#3B82F6" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[#E2E8F0]">{lp.featTitle}</div>
                      <div className="text-[9px] text-[#475569]">{lp.featSub.split('—')[0].trim()}</div>
                    </div>
                  </div>
                </div>

                {/* Floating badge — bottom left: capabilities */}
                <div className="absolute -bottom-1 -left-4 sm:-left-8 rounded-xl px-3 py-2.5 hidden sm:block" style={{
                  background: 'rgba(13,13,20,0.97)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  width: 192,
                  animation: 'float-card 6s ease-in-out 3s infinite',
                }}>
                  <div className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#334155' }}>{lp.capTitle}</div>
                  {[
                    { label: lp.c1t, color: '#3B82F6' },
                    { label: lp.c2t, color: '#8B5CF6' },
                    { label: lp.c3t, color: '#22C55E' },
                  ].map(({ label, color }, i) => (
                    <div key={i} className="flex items-center gap-1.5 mb-1">
                      <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-[10px] text-[#475569] truncate">{label}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ──────────────────────────────────────── */}
      <section id="features" className="relative py-16 lg:py-24 px-6 lg:px-12">
        {/* Subtle background glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2A2A3A] to-transparent" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,0.04), transparent 60%)' }} />

        <div className="max-w-7xl mx-auto">
          <div className="reveal text-center mb-10 lg:mb-14">
            <SectionTitle title={lp.featTitle} subtitle={lp.featSub} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { t: lp.f1t, d: lp.f1d },
              { t: lp.f2t, d: lp.f2d },
              { t: lp.f3t, d: lp.f3d },
              { t: lp.f4t, d: lp.f4d },
              { t: lp.f5t, d: lp.f5d },
              { t: lp.f6t, d: lp.f6d },
            ].map((feat, i) => {
              const Icon = FEATURE_ICONS[i]
              return (
                <div key={i} className={`reveal reveal-delay-${i + 1}`}>
                  <SpotlightCard
                    spotlightColor={FEATURE_COLORS[i]}
                    className="h-full p-6"
                  >
                    <div className="flex flex-col gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: FEATURE_COLORS[i], border: `1px solid ${FEATURE_ICON_COLORS[i]}22` }}
                      >
                        <Icon size={20} color={FEATURE_ICON_COLORS[i]} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#E2E8F0] mb-1.5">{feat.t}</h3>
                        <p className="text-sm text-[#475569] leading-relaxed">{feat.d}</p>
                      </div>
                    </div>
                  </SpotlightCard>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── IT EQUIPMENT SHOWCASE ─────────────────────────────────── */}
      <section className="relative py-16 lg:py-24 px-6 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2A2A3A] to-transparent" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(245,158,11,0.04), transparent 60%)' }} />
        <div className="max-w-7xl mx-auto">
          <div className="reveal text-center mb-10 lg:mb-14">
            <SectionTitle
              title={lp.borrowTitle}
              subtitle={lp.borrowSub}
            />
          </div>

          {/* Category grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {categoryItems.map(({ category, icon: Icon, color }, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1}`}>
                <div
                  className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border border-[#1A1A24] text-center transition-all duration-300 cursor-default"
                  style={{ background: 'rgba(17,17,24,0.7)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `${color}40`
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.background = `${color}08`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#1A1A24'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.background = 'rgba(17,17,24,0.7)'
                  }}
                >
                  <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}28` }}>
                    <Icon size={16} className="md:hidden" color={color} strokeWidth={1.8} />
                    <Icon size={22} className="hidden md:block" color={color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#E2E8F0]">{lp.cats[category] ?? category}</div>
                    <div className="text-[10px] text-[#475569] mt-0.5">{lp.borrowLabel}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-16 lg:py-24 px-6 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2A2A3A] to-transparent" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(139,92,246,0.04), transparent 70%)' }} />

        <div className="max-w-7xl mx-auto">
          <div className="reveal text-center mb-10 lg:mb-16">
            <SectionTitle title={lp.howTitle} subtitle={lp.howSub} />
          </div>

          {/* Steps grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: lp.s1t, desc: lp.s1d, icon: BookOpen, color: '#3B82F6' },
              { step: '02', title: lp.s2t, desc: lp.s2d, icon: ShieldCheck, color: '#22C55E' },
              { step: '03', title: lp.s3t, desc: lp.s3d, icon: CheckCircle2, color: '#8B5CF6' },
              { step: '04', title: lp.s4t, desc: lp.s4d, icon: Package, color: '#F59E0B' },
            ].map(({ step, title, desc, icon: Icon, color }, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1}`}>
                <SpotlightCard spotlightColor={`${color}18`} className="h-full p-6 relative">
                  {/* Connector line (desktop only) */}
                  {i < 3 && (
                    <div
                      className="hidden lg:block absolute top-8 left-[calc(100%+0.75rem)] w-6 z-10"
                      style={{ height: 1, background: `linear-gradient(90deg, ${color}60, transparent)` }}
                    />
                  )}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="step-ring" style={{ borderColor: `${color}45`, color, background: `${color}10` }}>
                        {step}
                      </div>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                        <Icon size={18} color={color} strokeWidth={2} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#E2E8F0] mb-2">{title}</h3>
                      <p className="text-xs text-[#475569] leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ──────────────────────────────────────────── */}
      <section id="capabilities" className="relative py-16 lg:py-24 px-6 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2A2A3A] to-transparent" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(34,197,94,0.03), transparent 60%)' }} />

        <div className="max-w-7xl mx-auto">
          <div className="reveal text-center mb-10 lg:mb-16">
            <SectionTitle title={lp.capTitle} subtitle={lp.capSub} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                title: lp.c1t, desc: lp.c1d, color: '#3B82F6',
                icon: GraduationCap,
                items: lang === 'id'
                  ? ['Katalog peralatan IT', 'Pengajuan permintaan', 'Pantau status real-time', 'Pusat notifikasi', 'Riwayat peminjaman']
                  : ['IT equipment catalog', 'Request submission', 'Real-time status tracking', 'Notification center', 'Borrowing history'],
              },
              {
                title: lp.c2t, desc: lp.c2d, color: '#8B5CF6',
                icon: ClipboardCheck,
                items: lang === 'id'
                  ? ['Persetujuan tertunda', 'Riwayat persetujuan', 'Detail permintaan', 'Tindakan cepat', 'Kebijakan peralatan']
                  : ['Pending approvals', 'Approval history', 'Request details', 'Quick decisions', 'Equipment policies'],
              },
              {
                title: lp.c3t, desc: lp.c3d, color: '#22C55E',
                icon: Wrench,
                items: lang === 'id'
                  ? ['Manajemen inventaris', 'Persiapan & pengecekan', 'Proses pengembalian', 'Laporan & analitik', 'Pemeliharaan aset']
                  : ['Inventory management', 'Equipment prep & check', 'Return processing', 'Reports & analytics', 'Asset maintenance'],
              },
            ].map(({ title, desc, color, icon: Icon, items }, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1}`}>
                <SpotlightCard spotlightColor={`${color}14`} className="h-full p-7">
                  <div className="flex flex-col gap-5 h-full">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}12`, border: `1px solid ${color}28` }}>
                        <Icon size={22} color={color} strokeWidth={2} />
                      </div>
                      <h3 className="text-lg font-bold text-[#E2E8F0]">{title}</h3>
                    </div>
                    <p className="text-sm text-[#475569] leading-relaxed">{desc}</p>
                    {/* Feature list */}
                    <ul className="flex flex-col gap-2 mt-auto">
                      {items.map((item, j) => (
                        <li key={j} className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-sm text-[#64748B]">{item}</span>
                        </li>
                      ))}
                    </ul>

                  </div>
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ───────────────────────────────────────────── */}
      <section className="cta-section relative py-16 lg:py-24 px-6 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3B82F6]/30 to-transparent" />
        {/* Grid background */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <ShapeGrid
            direction="diagonal"
            speed={0.3}
            borderColor="rgba(139, 92, 246, 0.18)"
            squareSize={54}
            hoverFillColor="rgba(59, 130, 246, 0.1)"
            shape="square"
            hoverTrailAmount={3}
          />
        </div>
        <div className="cta-glow" />
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse 75% 80% at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-[#3B82F6]/20 bg-[#3B82F6]/06 text-[#60A5FA] text-xs font-semibold uppercase tracking-widest">
              <Zap size={12} />
              {lang === 'en' ? 'Get Started Today' : 'Mulai Sekarang'}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#E2E8F0] mb-4 leading-tight">
              {lp.ctaTitle}
            </h2>
            <p className="text-[#475569] text-base md:text-lg mb-8">{lp.ctaSub}</p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-white font-bold text-base cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)', border: '1px solid rgba(255,255,255,0.12)', transition: 'filter 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
            >
              {lp.ctaBtn}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="relative border-t border-[#111118] py-10 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={itsLogo} alt="ITS" className="hidden md:block w-auto h-12 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            <div>
              <span className="text-[#E2E8F0] font-bold text-sm">Equimon</span>
              <p className="text-[#2A2A3A] text-[11px] mt-0.5">{lp.footerSub}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleLang} className="text-xs text-[#2A2A3A] hover:text-[#475569] transition-colors cursor-pointer bg-transparent border-0 font-poppins">
              <Globe size={12} className="inline mr-1" />
              {lang === 'en' ? 'Bahasa Indonesia' : 'English'}
            </button>
            <span className="text-[#2A2A3A] text-xs">{lp.footer}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
