import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FlaskConical, BookOpen, CheckCircle2, Bell, BarChart3, RotateCcw,
  Users, ShieldCheck, ArrowRight, Globe, Menu as MenuIcon,
  ClipboardList, Package, ChevronRight, Zap, Lock,
  GraduationCap, ClipboardCheck, Wrench, Cpu, Wifi, Activity, Server, Gauge
} from 'lucide-react'
import equimonLogo from './assets/images/Equimon Logo.png'
import ShapeGrid from './components/bits/ShapeGrid'
import SpotlightCard from './components/bits/SpotlightCard'
import CardSwap, { Card } from './components/bits/CardSwap'
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
    stat1: '50+ items', stat1Label: 'Equipment', stat2: '5', stat2Label: 'User roles', stat3: 'Live', stat3Label: 'Tracking',
    featTitle: 'Everything Built In', featSub: 'End-to-end lab equipment management — from browsing to returning.',
    f1t: 'Equipment Catalog', f1d: 'Browse the full inventory with live availability, filtering, and detailed specs.',
    f2t: 'Smart Borrowing', f2d: 'Submit borrow requests in seconds. Full history, status, and duration tracking.',
    f3t: 'Real-time Tracking', f3d: 'Get instant push notifications at every step of the borrowing lifecycle.',
    f4t: 'Multi-role Access', f4d: '5 distinct role dashboards — tailored views for every type of user.',
    f5t: 'Reports & Analytics', f5d: 'Generate usage reports, track trends, and export data for institutional records.',
    f6t: 'Return Management', f6d: 'Log equipment returns, check conditions, and update inventory automatically.',
    howTitle: 'How It Works', howSub: 'Four steps from request to return.',
    s1t: 'Browse & Request', s1d: 'Pick equipment from the catalog and submit a borrow request with dates and purpose.',
    s2t: 'Lecturer Review', s2d: 'Your assigned lecturer reviews and approves (or rejects) the request with notes.',
    s3t: 'Head Approval', s3d: 'The Head of Lab performs final approval, verifying all institutional policies.',
    s4t: 'Pickup & Return', s4d: 'Lab assistant prepares the equipment. You pick up, use it, and return.',
    capTitle: 'Built for Every Role', capSub: 'Tailored dashboards and workflows for every person in the lab ecosystem.',
    c1t: 'Students', c1d: 'Submit requests and track your borrowings from a clean personal dashboard.',
    c2t: 'Lecturers & Head', c2d: 'Review pending approvals and manage equipment authorizations at scale.',
    c3t: 'Lab Assistants & Admin', c3d: 'Prepare equipment, process returns, and maintain the complete inventory.',
    ctaTitle: 'Ready to Get Started?', ctaSub: 'Sign in to access your role-specific dashboard.',
    ctaBtn: 'Sign In to Equimon', footer: '© 2025 Equimon · All rights reserved.',
    footerSub: 'Streamlining lab management for the modern academic institution.',
  },
  id: {
    navFeatures: 'Fitur', navHow: 'Cara Kerja', navCapabilities: 'Kemampuan',
    heroLabel: 'Sistem Manajemen Peralatan Lab',
    heroH1a: 'Pinjam, Setujui &', heroH1b: 'Kelola', heroH1c: 'Peralatan Lab',
    heroSub: 'Platform cerdas untuk peminjaman peralatan lab — menghubungkan mahasiswa, dosen, dan staf laboratorium dalam satu alur kerja.',
    heroCTA: 'Masuk Sekarang', heroLearn: 'Jelajahi Fitur',
    stat1: '50+', stat1Label: 'Peralatan', stat2: '5', stat2Label: 'Peran pengguna', stat3: 'Live', stat3Label: 'Pelacakan',
    featTitle: 'Semua Sudah Ada', featSub: 'Manajemen end-to-end dari penelusuran hingga pengembalian.',
    f1t: 'Katalog Peralatan', f1d: 'Telusuri inventaris lengkap dengan ketersediaan langsung dan spesifikasi detail.',
    f2t: 'Peminjaman Cerdas', f2d: 'Ajukan permintaan dalam hitungan detik dengan pelacakan riwayat dan status.',
    f3t: 'Pelacakan Real-time', f3d: 'Terima notifikasi instan di setiap langkah siklus peminjaman.',
    f4t: 'Akses Multi-peran', f4d: '5 dashboard peran berbeda — tampilan khusus untuk setiap jenis pengguna.',
    f5t: 'Laporan & Analitik', f5d: 'Buat laporan penggunaan, lacak tren, dan ekspor data untuk pencatatan institusi.',
    f6t: 'Manajemen Pengembalian', f6d: 'Catat pengembalian, cek kondisi, dan perbarui inventaris secara otomatis.',
    howTitle: 'Cara Kerjanya', howSub: 'Empat langkah dari permintaan hingga pengembalian.',
    s1t: 'Telusuri & Minta', s1d: 'Pilih peralatan dari katalog dan ajukan permintaan dengan tanggal dan tujuan.',
    s2t: 'Tinjauan Dosen', s2d: 'Dosen meninjau dan menyetujui atau menolak permintaan dengan catatan.',
    s3t: 'Persetujuan Kepala', s3d: 'Kepala Lab melakukan persetujuan akhir sesuai kebijakan institusi.',
    s4t: 'Ambil & Kembalikan', s4d: 'Asisten menyiapkan peralatan. Anda mengambil, menggunakan, dan mengembalikan.',
    capTitle: 'Untuk Setiap Peran', capSub: 'Dashboard dan alur kerja yang disesuaikan untuk setiap orang di ekosistem lab.',
    c1t: 'Mahasiswa', c1d: 'Ajukan permintaan dan pantau peminjaman dari dashboard pribadi yang bersih.',
    c2t: 'Dosen & Kepala Lab', c2d: 'Tinjau persetujuan tertunda dan kelola otorisasi peralatan.',
    c3t: 'Asisten & Admin', c3d: 'Siapkan peralatan, proses pengembalian, dan kelola inventaris lengkap.',
    ctaTitle: 'Siap Memulai?', ctaSub: 'Masuk untuk mengakses dashboard sesuai peran Anda.',
    ctaBtn: 'Masuk ke Equimon', footer: '© 2025 Equimon · Semua hak dilindungi.',
    footerSub: 'Menyederhanakan manajemen lab untuk institusi akademik modern.',
  },
}

// ─── Feature icon map ─────────────────────────────────────────────────────────
const FEATURE_ICONS = [FlaskConical, ClipboardList, Bell, Users, BarChart3, RotateCcw]
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
  <div className={`mb-14 ${center ? 'text-center' : ''}`}>
    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#E2E8F0] mb-4 leading-tight">
      {title}
    </h2>
    {subtitle && <p className="text-[#475569] text-lg max-w-2xl mx-auto">{subtitle}</p>}
  </div>
)

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const { lang, toggleLang } = useLang()
  const lp = LP[lang] || LP.en

  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const heroRef = useRef(null)
  const heroContentRef = useRef(null)

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Scroll-reveal with IntersectionObserver
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

      {/* ── Mobile StaggeredMenu ───────────────────────────────────── */}
      {isMobile && (
        <StaggeredMenu
          items={mobileNavItems}
          accentColor="#3B82F6"
          menuButtonColor="#E2E8F0"
          openMenuButtonColor="#E2E8F0"
          colors={['rgba(17,17,30,0.93)', 'rgba(10,10,18,0.97)']}
          displayItemNumbering
          logoContent={
            <div className="flex items-center gap-2">
              <img src={equimonLogo} alt="Equimon" className="w-7 h-7 rounded-lg object-contain" style={{ background: 'rgba(255,255,255,0.95)', padding: '2px' }} />
              <span className="text-[#E2E8F0] text-sm font-bold tracking-tight">Equimon</span>
            </div>
          }
        />
      )}

      {/* ── Desktop Glass Navbar ───────────────────────────────────── */}
      {!isMobile && (
        <nav className={`glass-nav ${scrolled ? 'scrolled' : ''}`}>
          <div className="flex items-center justify-between px-6 py-3">
            {/* Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img src={equimonLogo} alt="Equimon" className="w-9 h-9 rounded-xl object-contain shadow-lg shadow-blue-500/20" style={{ background: 'rgba(255,255,255,0.95)', padding: '3px' }} />
              <div>
                <span className="text-[#E2E8F0] font-bold text-sm tracking-tight">Equimon</span>
                <span className="text-[#475569] text-xs ml-2 hidden lg:inline">Lab Management</span>
              </div>
            </div>

            {/* Nav Links */}
            <div className="flex items-center gap-8">
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

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLang}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#94A3B8] border border-[#2A2A3A] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all duration-250 bg-transparent cursor-pointer"
              >
                <Globe size={13} />
                <span>{lang === 'en' ? 'ID' : 'EN'}</span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold transition-all duration-250 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 cursor-pointer"
              >
                <Lock size={13} />
                {lp.heroCTA}
              </button>
            </div>
          </div>
        </nav>
      )}

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
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 py-16">
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
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 cursor-pointer"
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

              {/* Stats row */}
              <div className="flex items-center flex-wrap gap-6 pt-2">
                {[
                  { val: lp.stat1, label: lp.stat1Label },
                  { val: lp.stat2, label: lp.stat2Label },
                  { val: lp.stat3, label: lp.stat3Label },
                ].map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div className="stat-divider" />}
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-[#3B82F6]">{s.val}</span>
                      <span className="text-xs text-[#475569] font-medium">{s.label}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Right: CardSwap */}
            <div className="flex justify-center lg:justify-end items-center float-animation">
              <div style={{ position: 'relative', width: 400, height: 380, overflow: 'visible' }}>
                <CardSwap
                  width={400}
                  height={300}
                  cardDistance={26}
                  verticalDistance={18}
                  delay={4200}
                  pauseOnHover
                  skewAmount={4}
                  easing="elastic"
                >
                  {/* Card 1: Equipment Catalog */}
                  <Card style={{ width: 380, height: 300 }}>
                    <div className="p-5 h-full flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 flex items-center justify-center">
                          <FlaskConical size={16} color="#3B82F6" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#E2E8F0]">Equipment Catalog</div>
                          <div className="text-[10px] text-[#475569]">Live availability</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        {[
                          { name: 'Microscope Pro Set', status: 'Ready', avail: true },
                          { name: 'Centrifuge X-200', status: 'Ready', avail: true },
                          { name: 'Spectrophotometer', status: 'Borrowed', avail: false },
                          { name: 'PCR Thermocycler', status: 'Ready', avail: true },
                          { name: 'pH Meter Digital', status: 'Ready', avail: true },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1A1A24]">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${item.avail ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'}`} />
                              <span className="text-[11px] text-[#94A3B8]">{item.name}</span>
                            </div>
                            <span className={`hero-card-badge ${!item.avail ? 'borrowed' : ''}`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Card 2: Borrow Request */}
                  <Card style={{ width: 380, height: 300 }}>
                    <div className="p-5 h-full flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-[#22C55E]/15 flex items-center justify-center">
                          <ClipboardList size={16} color="#22C55E" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#E2E8F0]">New Borrow Request</div>
                          <div className="text-[10px] text-[#475569]">Just submitted</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        {[
                          { label: 'Equipment', val: 'Microscope Pro Set' },
                          { label: 'Duration', val: 'Mar 15 → Mar 18, 2025' },
                          { label: 'Purpose', val: 'Lab Assignment #3' },
                          { label: 'Requester', val: 'Ahmad Rizki' },
                        ].map((row, i) => (
                          <div key={i} className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-[#2A2A3A] uppercase tracking-wider">{row.label}</span>
                            <span className="text-[11px] text-[#94A3B8] font-medium">{row.val}</span>
                          </div>
                        ))}
                        <div className="mt-auto pt-2">
                          <span className="hero-card-badge pending">● Awaiting Lecturer Review</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Card 3: Approval Flow */}
                  <Card style={{ width: 380, height: 300 }}>
                    <div className="p-5 h-full flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 flex items-center justify-center">
                          <CheckCircle2 size={16} color="#8B5CF6" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#E2E8F0]">Approval Progress</div>
                          <div className="text-[10px] text-[#475569]">Step 2 of 4</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2.5 flex-1">
                        {[
                          { step: 1, label: 'Submitted', status: 'done' },
                          { step: 2, label: 'Lecturer Review', status: 'active' },
                          { step: 3, label: 'Head of Lab', status: 'pending' },
                          { step: 4, label: 'Ready for Pickup', status: 'pending' },
                        ].map(({ step, label, status }) => (
                          <div key={step} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              status === 'done' ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30'
                              : status === 'active' ? 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40'
                              : 'bg-[#2A2A3A] text-[#475569] border border-[#3A3A5A]'
                            }`}>
                              {status === 'done' ? '✓' : step}
                            </div>
                            <span className={`text-[11px] font-medium ${
                              status === 'done' ? 'text-[#22C55E]'
                              : status === 'active' ? 'text-[#60A5FA]'
                              : 'text-[#475569]'
                            }`}>{label}</span>
                            {status === 'active' && (
                              <span className="ml-auto text-[9px] font-medium text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-full border border-[#3B82F6]/20">In Review</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Card 4: Dashboard */}
                  <Card style={{ width: 380, height: 300 }}>
                    <div className="p-5 h-full flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 flex items-center justify-center">
                          <BarChart3 size={16} color="#F59E0B" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#E2E8F0]">Lab Overview</div>
                          <div className="text-[10px] text-[#475569]">Today's stats</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        {[
                          { label: 'Total Equipment', val: '48', color: '#3B82F6' },
                          { label: 'Available', val: '36', color: '#22C55E' },
                          { label: 'Active Loans', val: '12', color: '#F59E0B' },
                          { label: 'Pending Review', val: '5', color: '#8B5CF6' },
                        ].map((stat, i) => (
                          <div key={i} className="rounded-xl p-3 flex flex-col gap-1" style={{ background: `${stat.color}0d`, border: `1px solid ${stat.color}22` }}>
                            <span className="text-xl font-bold" style={{ color: stat.color }}>{stat.val}</span>
                            <span className="text-[10px] text-[#475569]">{stat.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </CardSwap>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ───────────────────────────────────────────── */}
      <div className="relative py-10 border-y border-[#111118]" style={{ background: 'rgba(17,17,24,0.8)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { val: '48+', label: lang === 'en' ? 'Lab Equipment Items' : 'Item Peralatan Lab', color: '#3B82F6' },
              { val: '5', label: lang === 'en' ? 'Distinct User Roles' : 'Peran Pengguna', color: '#22C55E' },
              { val: '4-Step', label: lang === 'en' ? 'Approval Workflow' : 'Alur Persetujuan', color: '#8B5CF6' },
              { val: '100%', label: lang === 'en' ? 'Real-time Updates' : 'Pembaruan Real-time', color: '#F59E0B' },
            ].map(({ val, label, color }, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-2xl md:text-3xl font-bold" style={{ color }}>{val}</span>
                <span className="text-xs text-[#475569] font-medium tracking-wide uppercase">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURES SECTION ──────────────────────────────────────── */}
      <section id="features" className="relative py-24 px-6 lg:px-12">
        {/* Subtle background glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2A2A3A] to-transparent" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,0.04), transparent 60%)' }} />

        <div className="max-w-7xl mx-auto">
          <div className="reveal text-center mb-14">
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
      <section className="relative py-24 px-6 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2A2A3A] to-transparent" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(245,158,11,0.04), transparent 60%)' }} />
        <div className="max-w-7xl mx-auto">
          <div className="reveal text-center mb-14">
            <SectionTitle
              title={lang === 'en' ? 'What You Can Borrow' : 'Apa yang Bisa Dipinjam'}
              subtitle={lang === 'en' ? 'A diverse range of IT lab equipment available for student borrowing — from signal analyzers to embedded systems.' : 'Beragam peralatan lab IT tersedia untuk peminjaman mahasiswa — dari analis sinyal hingga sistem embedded.'}
            />
          </div>

          {/* Featured equipment grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {[
              { name: 'Oscilloscope', icon: Activity, color: '#3B82F6', sub: 'Signal Analysis' },
              { name: 'Arduino Kit', icon: Cpu, color: '#22C55E', sub: 'Microcontrollers' },
              { name: 'Network Analyzer', icon: Wifi, color: '#8B5CF6', sub: 'Protocol Testing' },
              { name: 'Raspberry Pi', icon: Server, color: '#F59E0B', sub: 'SBC Computing' },
              { name: 'Multimeter', icon: Gauge, color: '#EC4899', sub: 'Measurement' },
              { name: 'Soldering Set', icon: Wrench, color: '#14B8A6', sub: 'PCB Assembly' },
            ].map(({ name, icon: Icon, color, sub }, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1}`}>
                <div
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-[#1A1A24] text-center transition-all duration-300 cursor-default"
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
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}28` }}>
                    <Icon size={22} color={color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#E2E8F0]">{name}</div>
                    <div className="text-[10px] text-[#475569] mt-0.5">{sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional equipment tags */}
          <div className="flex flex-wrap gap-2 justify-center pt-8 border-t border-[#111118]">
            {[
              'Function Generator', 'LCR Meter', 'Spectrum Analyzer', 'FPGA Board',
              'Servo Motor Set', 'Sensor Kit', 'Logic Analyzer', 'DC Motor Driver',
              'RF Signal Generator', 'Digital Caliper', 'Benchtop Power Supply', 'Protocol Analyzer',
              'Signal Generator', 'Network Switch', 'Thermal Camera',
            ].map((item, i) => (
              <span key={i} className="px-3 py-1.5 text-xs text-[#475569] border border-[#1A1A24] rounded-full" style={{ background: 'rgba(17,17,24,0.5)' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-24 px-6 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2A2A3A] to-transparent" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(139,92,246,0.04), transparent 70%)' }} />

        <div className="max-w-7xl mx-auto">
          <div className="reveal text-center mb-16">
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
      <section id="capabilities" className="relative py-24 px-6 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2A2A3A] to-transparent" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(34,197,94,0.03), transparent 60%)' }} />

        <div className="max-w-7xl mx-auto">
          <div className="reveal text-center mb-16">
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
                    {/* CTA */}
                    <button
                      onClick={() => navigate('/login')}
                      className="mt-4 w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-250 cursor-pointer"
                      style={{
                        background: `${color}12`,
                        border: `1px solid ${color}28`,
                        color,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = `${color}22`
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = `${color}12`
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      {lp.heroCTA} →
                    </button>
                  </div>
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ───────────────────────────────────────────── */}
      <section className="cta-section relative py-24 px-6 lg:px-12">
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
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-base transition-all duration-300 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 cursor-pointer"
            >
              <Lock size={16} />
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
            <img src={equimonLogo} alt="Equimon" className="w-8 h-8 rounded-lg object-contain" style={{ background: 'rgba(255,255,255,0.95)', padding: '2px' }} />
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
