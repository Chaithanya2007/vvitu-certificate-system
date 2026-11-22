import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { CertificateRequest, IssuedCertificate } from '../../types/database';
import { Download, Filter, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function MyRequestsPage() {
  const { student } = useAuth();
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [issuedMap, setIssuedMap] = useState<Record<string, IssuedCertificate>>({});
  const [statusFilter, setStatusFilter] = useState('ALL');
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
        .select('*')
        .eq('student_id', student.id),
    ]).then(([reqRes, issRes]) => {
      setRequests((reqRes.data as CertificateRequest[]) || []);
      const map: Record<string, IssuedCertificate> = {};
      ((issRes.data as IssuedCertificate[]) || []).forEach((ic) => {
        map[ic.request_id] = ic;
      });
      setIssuedMap(map);
      setLoading(false);
    });
  }, [student]);

  const handleDownloadPdf = async (cert: IssuedCertificate) => {
    if (!cert.pdf_storage_path) {
      alert('PDF file is still being finalized. Please try again in a moment.');
      return;
    }
    const { data, error } = await supabase.storage
      .from('certificates')
      .createSignedUrl(cert.pdf_storage_path, 300);

    if (error || !data?.signedUrl) {
      alert('Unable to generate secure download link: ' + (error?.message || 'Unknown error'));
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const filtered = requests.filter((r) => statusFilter === 'ALL' || r.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">My Requests & Issued Certificates</h2>
          <p className="text-sm text-slate-600">Track approval progress, read staff remarks, and download official PDFs</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Issued">Issued</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading your certificate history...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          No certificate requests found for the selected filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => {
            const cert = issuedMap[req.id];
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">{req.certificate_types?.name}</h3>
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {req.tracking_number}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Submitted: {new Date(req.submitted_at).toLocaleString()} • Purpose: {req.purpose}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {req.status === 'Issued' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Issued
                      </span>
                    )}
                    {req.status === 'Rejected' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700">
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                      </span>
                    )}
                    {['Submitted', 'Under Review', 'Approved'].includes(req.status) && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                        <Clock className="w-3.5 h-3.5" /> {req.status}
                      </span>
                    )}

                    {cert && cert.status === 'active' && (
                      <button
                        onClick={() => handleDownloadPdf(cert)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </button>
                    )}
                  </div>
                </div>

                {req.admin_remarks && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      req.status === 'Rejected'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Administrator Remarks:</strong> {req.admin_remarks}
                    </div>
                  </div>
                )}

                {cert && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span>
                      Certificate ID: <strong className="font-mono text-slate-900">{cert.certificate_number}</strong>
                    </span>
                    <span>
                      Document Status:{' '}
                      <strong className={cert.status === 'active' ? 'text-emerald-700 uppercase' : 'text-red-600 uppercase'}>
                        {cert.status}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
