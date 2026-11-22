import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileCheck2, QrCode, GraduationCap, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/vvit-logo.png" alt="VVIT University Logo" className="h-14 w-auto object-contain" />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#D9785D]">
                Vasireddy Venkatadri International Technological University
              </p>
              <h1 className="text-lg font-bold text-slate-900">Student Certificate Portal</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/verify" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-[#D9785D] transition">
              Verify Certificate
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-lg bg-[#D9785D] hover:bg-[#c5654a] text-white text-sm font-semibold shadow-sm transition flex items-center gap-2"
            >
              Portal Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-[#D9785D] text-xs font-semibold border border-orange-200 mb-6">
                <ShieldCheck className="w-4 h-4" /> Official Digital Issuance & Verification
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Fast, Verifiable Academic Certificates for <span className="text-[#D9785D]">VVITU</span> Students
              </h2>
              <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                Request Bonafide, Study, Course Completion, Character, and Conduct certificates online.
                Track real-time approval status and download QR-secured A4 PDF certificates anytime.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-md transition flex items-center gap-2"
                >
                  <GraduationCap className="w-5 h-5" /> Student & Admin Login
                </Link>
                <Link
                  to="/verify"
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold border border-slate-300 transition flex items-center gap-2"
                >
                  <QrCode className="w-5 h-5 text-[#D9785D]" /> Verify a Document
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-orange-50 text-[#D9785D]"><GraduationCap className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-900">1. Student Roll-Number Access</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Activate your account once using your Roll Number & Hall Ticket Number, then submit certificate requests in seconds.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-700"><FileCheck2 className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-900">2. Institutional Verification & Approval</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Every request is audited against official VVITU records by authorized administrators before PDF generation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700"><QrCode className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-slate-900">3. Tamper-Evident QR Verification</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Every issued PDF carries a unique cryptographic verification reference scannable by employers and agencies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        Vasireddy Venkatadri International Technological University (VVITU) • Nambur, Guntur District, Andhra Pradesh
      </footer>
    </div>
  );
}
