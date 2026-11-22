import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, FileCheck2, Clock, CheckCircle2, XCircle, Award, FileSpreadsheet, ArrowRight } from 'lucide-react';

interface SectionStat {
  section_code: string;
  room_no: string;
  class_teacher: string;
  count: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activatedStudents: 0,
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    issuedCertificates: 0,
  });
  const [sections, setSections] = useState<SectionStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [
        { data: classesData },
        { data: studentsData },
        { data: requestsData },
        { count: issuedCount },
      ] = await Promise.all([
        supabase.from('classes').select('*').order('section_code'),
        supabase.from('students').select('id, class_id, is_account_activated'),
        supabase.from('certificate_requests').select('id, status'),
        supabase.from('issued_certificates').select('*', { count: 'exact', head: true }),
      ]);

      const students = studentsData || [];
      const requests = requestsData || [];

      setStats({
        totalStudents: students.length,
        activatedStudents: students.filter((s) => s.is_account_activated).length,
        totalRequests: requests.length,
        pendingRequests: requests.filter((r) => ['Submitted', 'Under Review'].includes(r.status)).length,
        approvedRequests: requests.filter((r) => r.status === 'Approved').length,
        rejectedRequests: requests.filter((r) => r.status === 'Rejected').length,
        issuedCertificates: issuedCount || 0,
      });

      const secStats: SectionStat[] = (classesData || []).map((cls) => ({
        section_code: cls.section_code,
        room_no: cls.room_no || '—',
        class_teacher: cls.class_teacher || '—',
        count: students.filter((s) => s.class_id === cls.id).length,
      }));
      setSections(secStats);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading institutional metrics...</div>;
  }

  const cards = [
    { label: 'Total Students', value: stats.totalStudents, sub: `${stats.activatedStudents} accounts activated`, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Requests', value: stats.totalRequests, sub: 'All certificate categories', icon: FileCheck2, color: 'text-slate-700 bg-slate-100' },
    { label: 'Pending Review', value: stats.pendingRequests, sub: 'Awaiting admin action', icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Approved / Ready', value: stats.approvedRequests, sub: 'Ready for PDF issuance', icon: CheckCircle2, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Rejected Requests', value: stats.rejectedRequests, sub: 'Returned with remarks', icon: XCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Issued Certificates', value: stats.issuedCertificates, sub: 'Active & verifiable via QR', icon: Award, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Administrator Overview</h2>
          <p className="text-sm text-slate-600">Real-time student cohort and certificate issuance summary</p>
        </div>
        {stats.totalStudents === 0 && (
          <Link
            to="/admin/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9785D] hover:bg-[#c5654a] text-white text-sm font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import CAD.xlsx Students Now <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* KPI Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.label}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{c.value}</p>
                <p className="text-xs text-slate-500 mt-1">{c.sub}</p>
              </div>
              <div className={`p-3 rounded-xl ${c.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Section-wise Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Class-Wise Student Distribution — CSE (AI & DS)</h3>
            <p className="text-xs text-slate-500">Initial approved sections (CAD-1 through CAD-4)</p>
          </div>
          <Link to="/admin/students" className="text-xs font-semibold text-[#D9785D] hover:underline">
            View All Students →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Section</th>
                <th className="px-6 py-3">Room No</th>
                <th className="px-6 py-3">Class Teacher</th>
                <th className="px-6 py-3 text-right">Enrolled Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sections.map((sec) => (
                <tr key={sec.section_code} className="hover:bg-slate-50">
                  <td className="px-6 py-3.5 font-bold text-slate-900">{sec.section_code}</td>
                  <td className="px-6 py-3.5 text-slate-600">{sec.room_no}</td>
                  <td className="px-6 py-3.5 text-slate-700">{sec.class_teacher}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-slate-900">{sec.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
