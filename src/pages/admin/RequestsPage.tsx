import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CertificateRequest, CertificateTemplate } from '../../types/database';
import { generateCertificatePdfBytes } from '../../lib/pdfGenerator';
import { CheckCircle2, XCircle, Award, Clock, Search, FileText } from 'lucide-react';

export default function RequestsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('certificate_requests')
      .select('*, students(*, classes(*)), certificate_types(*)')
      .order('submitted_at', { ascending: false });
    setRequests((data as CertificateRequest[]) || []);
    setLoading(false);
  };

  const handleReject = async (req: CertificateRequest) => {
    const comment = (remarksMap[req.id] || '').trim();
    if (!comment) {
      alert('Please enter a rejection reason in the remarks box before rejecting.');
      return;
    }
    if (!profile) return;
    setProcessingId(req.id);
    try {
      await supabase
        .from('certificate_requests')
        .update({ status: 'Rejected', admin_remarks: comment, updated_at: new Date().toISOString() })
        .eq('id', req.id);

      await supabase.from('review_actions').insert({
        request_id: req.id,
        reviewer_id: profile.id,
        action: 'rejected',
        comments: comment,
      });

      if (req.students?.user_id) {
        await supabase.from('notifications').insert({
          recipient_user_id: req.students.user_id,
          title: `Certificate Request Rejected (${req.tracking_number})`,
          message: `Your request for ${req.certificate_types?.name} was rejected. Reason: ${comment}`,
          link: '/student/history',
        });
      }

      await supabase.from('audit_logs').insert({
        actor_id: profile.id,
        actor_role: profile.role,
        action: 'REQUEST_REJECTED',
        entity_type: 'certificate_requests',
        entity_id: req.id,
        details: { tracking_number: req.tracking_number, reason: comment },
      });

      await loadRequests();
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAndIssue = async (req: CertificateRequest) => {
    if (!profile || !req.students || !req.certificate_types) return;
    setProcessingId(req.id);
    try {
      const comment = (remarksMap[req.id] || 'Verified against institutional records and issued.').trim();

      // 1. Fetch active template for this certificate type
      const { data: tplData, error: tplErr } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('certificate_type_id', req.certificate_type_id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (tplErr || !tplData) throw new Error('No active template found for this certificate type.');
      const template = tplData as CertificateTemplate;

      // 2. Generate unique certificate number & unpredictable verification token
      const year = new Date().getFullYear();
      const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const certNumber = `VVITU-CERT-${year}-${randPart}`;
      const verifyToken = crypto.randomUUID().replace(/-/g, '').toUpperCase();
      const issuedDateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      // 3. Build A4 Landscape PDF with VVIT Logo & QR Code
      const pdfBytes = await generateCertificatePdfBytes({
        certificateNumber: certNumber,
        verificationToken: verifyToken,
        titleText: template.title_text,
        bodyTemplate: template.body_template,
        signatoryTitle: template.signatory_title,
        studentName: req.students.full_name,
        rollNumber: req.students.roll_number,
        hallTicketNo: req.students.hall_ticket_no || 'N/A',
        program: req.students.program,
        sectionCode: req.students.classes?.section_code || 'CSE-AI&DS',
        academicYear: req.form_data?.academic_year || req.students.classes?.academic_year || '2025-2026',
        purpose: req.purpose,
        issuedDate: issuedDateStr,
      });

      // 4. Upload PDF to private Supabase Storage bucket
      const storagePath = `${req.students.roll_number}/${certNumber}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from('certificates')
        .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

      if (uploadErr) throw uploadErr;

      // 5. Insert issued_certificates record
      const { data: issuedRow, error: issErr } = await supabase
        .from('issued_certificates')
        .insert({
          certificate_number: certNumber,
          verification_token: verifyToken,
          request_id: req.id,
          student_id: req.student_id,
          certificate_type_id: req.certificate_type_id,
          template_id: template.id,
          status: 'active',
          pdf_storage_path: storagePath,
          issued_by: profile.id,
        })
        .select()
        .single();

      if (issErr) throw issErr;

      // 6. Update request status to Issued & log review action
      await supabase
        .from('certificate_requests')
        .update({ status: 'Issued', admin_remarks: comment, updated_at: new Date().toISOString() })
        .eq('id', req.id);

      await supabase.from('review_actions').insert([
        { request_id: req.id, reviewer_id: profile.id, action: 'approved', comments: comment },
        { request_id: req.id, reviewer_id: profile.id, action: 'issued', comments: `Issued ${certNumber}` },
      ]);

      // 7. Notify student & record audit log
      if (req.students.user_id) {
        await supabase.from('notifications').insert({
          recipient_user_id: req.students.user_id,
          title: `Certificate Issued (${certNumber})`,
          message: `Your ${req.certificate_types.name} is ready for download in My Requests & Certificates.`,
          link: '/student/history',
        });
      }

      await supabase.from('audit_logs').insert({
        actor_id: profile.id,
        actor_role: profile.role,
        action: 'CERTIFICATE_ISSUED',
        entity_type: 'issued_certificates',
        entity_id: issuedRow.id,
        details: { certificate_number: certNumber, roll_number: req.students.roll_number },
      });

      alert(`Certificate ${certNumber} generated and issued successfully!`);
      await loadRequests();
    } catch (err: any) {
      alert('Issuance Error: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = requests.filter((r) => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      r.tracking_number.toLowerCase().includes(q) ||
      r.students?.roll_number.toLowerCase().includes(q) ||
      r.students?.full_name.toLowerCase().includes(q);
    return matchStatus && matchQ;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Certificate Request Approval & Issuance</h2>
        <p className="text-sm text-slate-600">
          Verify student eligibility, approve requests to auto-generate QR-secured A4 PDFs, or reject with comments.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Tracking No, Roll Number, or Student Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium bg-white"
        >
          <option value="ALL">All Requests ({requests.length})</option>
          <option value="Submitted">Submitted</option>
          <option value="Under Review">Under Review</option>
          <option value="Issued">Issued</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading requests...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          No certificate requests found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-900 text-white">
                      {req.tracking_number}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">{req.certificate_types?.name}</h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-[#D9785D]">
                      {req.students?.classes?.section_code}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mt-1.5">
                    {req.students?.full_name} • <span className="font-mono">{req.students?.roll_number}</span>{' '}
                    (HT: {req.students?.hall_ticket_no || 'N/A'})
                  </p>
                </div>

                <div>
                  {req.status === 'Issued' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> Issued
                    </span>
                  )}
                  {req.status === 'Rejected' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700">
                      <XCircle className="w-4 h-4" /> Rejected
                    </span>
                  )}
                  {['Submitted', 'Under Review', 'Approved'].includes(req.status) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                      <Clock className="w-4 h-4" /> {req.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl">
                <div>
                  <span className="text-slate-500 font-semibold">Stated Purpose:</span>{' '}
                  <span className="text-slate-900 font-medium">{req.purpose}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Additional Fields:</span>{' '}
                  <span className="text-slate-900 font-mono">
                    {Object.entries(req.form_data || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' | ') || 'None'}
                  </span>
                </div>
              </div>

              {['Submitted', 'Under Review', 'Approved'].includes(req.status) ? (
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <input
                    type="text"
                    placeholder="Enter approval remarks or mandatory rejection reason..."
                    value={remarksMap[req.id] || ''}
                    onChange={(e) => setRemarksMap({ ...remarksMap, [req.id]: e.target.value })}
                    className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                  <button
                    onClick={() => handleApproveAndIssue(req)}
                    disabled={processingId === req.id}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Award className="w-4 h-4" />
                    {processingId === req.id ? 'Generating PDF...' : 'Approve & Issue PDF'}
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    disabled={processingId === req.id}
                    className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              ) : (
                req.admin_remarks && (
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> <strong>Decision Remarks:</strong> {req.admin_remarks}
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
