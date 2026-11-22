import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { CertificateRequest, IssuedCertificate } from '../../types/database';
import { FilePlus2, Clock, Award, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function StudentDashboard() {
  const { student } = useAuth();
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [issued, setIssued] = useState<IssuedCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    Promise.all([
      supabase
        .from('certificate_requests')
        .select('*, certificate_types(name)')
        .eq('student_id', student.id)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('issued_certificates')
        .select('*, certificate_types(name)')
        .eq('student_id', student.id)
        .order('issued_at', { ascending: false }),
    ]).then(([reqRes, issRes]) => {
      setRequests((reqRes.data as CertificateRequest[]) || []);
      setIssued((issRes.data as IssuedCertificate[]) || []);
      setLoading(false);
    });
  }, [student]);

  if (!student) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm">
        Your student record is still linking. Please refresh the page or contact the VVITU Certificate Office.
      </div>
    );
  }

  const pendingCount = requests.filter((r) => ['Submitted', 'Under Review', 'Approved'].includes(r.status)).length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  return (
    <div className="space-y-8">
      {/* Institutional Identity Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#D9785D]">
              Verified Institutional Student Profile
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{student.full_name}</h2>
          </div>
          <Link
            to="/student/new-request"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D9785D] hover:bg-[#c5654a] text-white text-sm font-bold shadow-sm transition"
          >
            <FilePlus2 className="w-4 h-4" /> Request New Certificate
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-5 text-sm">
          <div>
            <p className="text-xs text-slate-500">Roll Number</p>
            <p className="font-mono font-bold text-slate-900">{student.roll_number}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Hall Ticket No</p>
            <p className="font-mono font-semibold text-slate-800">{student.hall_ticket_no || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Department</p>
            <p className="font-semibold text-slate-800">{student.classes?.department || 'CSE (AI & DS)'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Class / Section</p>
            <p className="font-bold text-[#D9785D]">{student.classes?.section_code || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Seat Type</p>
            <p className="font-semibold text-slate-800">{student.seat_type || 'Unspecified'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              {student.enrollment_status}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <strong>Program:</strong> {student.program} • <strong>Academic Year:</strong> {student.classes?.academic_year || '2025-2026'}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Active Requests</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Clock className="w-6 h-6" /></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Issued Certificates</p>
            <p className="text-3xl font-extrabold text-emerald-700 mt-1">{issued.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><Award className="w-6 h-6" /></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Rejected / Returned</p>
            <p className="text-3xl font-extrabold text-red-600 mt-1">{rejectedCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-red-50 text-red-600"><XCircle className="w-6 h-6" /></div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Recent Certificate Requests</h3>
          <Link to="/student/history" className="text-xs font-semibold text-[#D9785D] hover:underline flex items-center gap-1">
            View All & Download PDFs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading your requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            You have not submitted any certificate requests yet. Click <strong>Request New Certificate</strong> above to begin.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {requests.slice(0, 5).map((r) => (
              <div key={r.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{r.certificate_types?.name}</p>
                  <p className="text-xs text-slate-500">
                    Tracking: <span className="font-mono font-semibold">{r.tracking_number}</span> • Purpose: {r.purpose}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 self-start">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D9785D]" /> {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
