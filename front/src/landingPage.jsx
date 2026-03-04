import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { FlaskConical, CheckCircle, Users, BarChart3, Package, Shield, ClipboardList } from 'lucide-react';

const features = [
  { icon: Package, title: 'Equipment Catalog', desc: 'Browse and request lab equipment easily from a centralized catalog.' },
  { icon: ClipboardList, title: 'Multi-Step Approvals', desc: 'Structured workflow with lecturer and head-of-lab sign-off.' },
  { icon: Users, title: 'Role-Based Access', desc: 'Tailored dashboards for students, lecturers, assistants, and admins.' },
  { icon: BarChart3, title: 'Reports & Analytics', desc: 'Track borrowing trends and equipment utilization at a glance.' },
  { icon: Shield, title: 'Return Management', desc: 'Log equipment returns with condition assessment and remarks.' },
  { icon: CheckCircle, title: 'Real-Time Status', desc: 'Visual progress tracking for every borrow request.' },
];

export default function Landing() {
  const navigate = useNavigate();
  
  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <FlaskConical className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">LabEquip</span>
        </div>
        <Button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6">
          Sign In
        </Button>
      </nav>

      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-20 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-full mb-6 sm:mb-8 border border-blue-500/30">
          <FlaskConical className="w-4 h-4" />
          Laboratory Equipment Management System
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 sm:mb-6">
          Borrow Lab Equipment
          <span className="text-blue-400 block mt-2">Effortlessly</span>
        </h1>
        <p className="text-slate-300 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 px-4">
          A streamlined platform for borrowing, approving, and tracking laboratory equipment — built for students, lecturers, and lab staff.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={handleLogin} size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-10 h-12 text-base">
            Get Started
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-6 lg:px-12 py-12 sm:py-16 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Everything you need to manage the lab</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-slate-900">{title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-12 py-12 sm:py-16 text-center max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-2xl mx-auto shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-slate-900">Ready to get started?</h2>
          <p className="text-slate-600 mb-6 sm:mb-8">Sign in to access the dashboard and start managing equipment today.</p>
          <Button onClick={handleLogin} size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-10 h-12 text-base">
            Sign In Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 lg:px-12 py-8 border-t border-white/10 text-center">
        <p className="text-slate-400 text-sm mb-2">
          © {new Date().getFullYear()} LabEquip - Institut Teknologi Sepuluh Nopember
        </p>
        <p className="text-slate-500 text-xs">
          All rights reserved.
        </p>
      </footer>
    </div>
  );
}