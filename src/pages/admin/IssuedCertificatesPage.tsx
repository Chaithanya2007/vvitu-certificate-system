import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { IssuedCertificate, CertificateTemplate } from '../../types/database';
import { generateCertificatePdfBytes } from '../../lib/pdfGenerator';
import { Download, Ban, RefreshCw, Search, ExternalLink } from 'lucide-react';

export default function IssuedCertificatesPage() {
  const { profile } = useAuth();
  const [certs, setCerts] = useState<IssuedCertificate[]>([]);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCerts();
  }, []);

  const loadCerts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('issued_certificates')
      .select('*, students(*, classes(*)), certificate_types(*)')
      .order('issued_at', { ascending: false });
    setCerts((data as IssuedCertificate[]) || []);
    setLoading(false);
  };

  const handleDownload = async (c: IssuedCertificate) => {
    if (!c.pdf_storage_path) return;
    const { data, error } = await supabase.storage.from('certificates').createSignedUrl(c.pdf_storage_path, 300);
    if (error || !data?.signedUrl) {
      alert('Download error: ' + error?.message);
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleRevoke = async (c: IssuedCertificate) => {
    const reason = window.prompt(`Enter mandatory revocation reason for ${c.certificate_number}:`);
    if (!reason || !reason.trim() || !profile) return;
    setBusyId(c.id);
    try {
      await supabase
        .from('issued_certificates')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revocation_reason: reason.trim(),
        })
        .eq('id', c.id);

      await supabase.from('audit_logs').insert({
        actor_id: profile.id,
        actor_role: profile.role,
        action: 'CERTIFICATE_REVOKED',
        entity_type: 'issued_certificates',
        entity_id: c.id,
        details: { certificate_number: c.certificate_number, reason: reason.trim() },
      });

      await loadCerts();
    } finally {
      setBusyId(null);
    }
  };

  const handleReissue = async (c: IssuedCertificate) => {
    if (!profile || !c.students || !c.certificate_types) return;
    if (!window.confirm(`Mark ${c.certificate_number} as REPLACED and issue a new certificate PDF?`)) return;

    setBusyId(c.id);
    try {
      const { data: tplData } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('certificate_type_id', c.certificate_type_id)
        .eq('is_active', true)
        .limit(1)
        .single();

      const template = tplData as CertificateTemplate;
      const { data: reqData } = await supabase
        .from('certificate_requests')
        .select('purpose, form_data')
        .eq('id', c.request_id)
        .single();

      const year = new Date().getFullYear();
      const newCertNum = `VVITU-CERT-${year}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const newToken = crypto.randomUUID().replace(/-/g, '').toUpperCase();
      const issuedDateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const pdfBytes = await generateCertificatePdfBytes({
        certificateNumber: newCertNum,
        verificationToken: newToken,
        titleText: template.title_text,
        bodyTemplate: template.body_template,
        signatoryTitle: template.signatory_title,
        studentName: c.students.full_name,
        rollNumber: c.students.roll_number,
        hallTicketNo: c.students.hall_ticket_no || 'N/A',
        program: c.students.program,
        sectionCode: c.students.classes?.section_code || 'CSE-AI&DS',
        academicYear: reqData?.form_data?.academic_year || '2025-2026',
        purpose: reqData?.purpose || 'Reissued Institutional Record',
        issuedDate: issuedDateStr,
      });

      const storagePath = `${c.students.roll_number}/${newCertNum}.pdf`;
      await supabase.storage
        .from('certificates')
        .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

      const { data: newCert } = await supabase
        .from('issued_certificates')
        .insert({
          certificate_number: newCertNum,
          verification_token: newToken,
          request_id: c.request_id,
          student_id: c.student_id,
          certificate_type_id: c.certificate_type_id,
          template_id: template.id,
          status: 'active',
          pdf_storage_path: storagePath,
          issued_by: profile.id,
        })
        .select()
        .single();

      if (newCert) {
        await supabase
          .from('issued_certificates')
          .update({ status: 'replaced', replaced_by_cert_id: newCert.id })
          .eq('id', c.id);
      }

      await supabase.from('audit_logs').insert({
        actor_id: profile.id,
        actor_role: profile.role,
        action: 'CERTIFICATE_REISSUED',
        entity_type: 'issued_certificates',
        entity_id: c.id,
        details: { old_cert: c.certificate_number, new_cert: newCertNum },
      });

      await loadCerts();
    } finally {
      setBusyId(null);
    }
  };

  const filtered = certs.filter((c) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      c.certificate_number.toLowerCase().includes(q) ||
      c.students?.roll_number.toLowerCase().includes(q) ||
      c.students?.full_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Issued Certificates Registry</h2>
        <p className="text-sm text-slate-600">
          Inspect issued PDFs, test live QR verification links, revoke invalid records, or reissue replacements.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-7 top-7" />
        <input
          type="text"
          placeholder="Search by Certificate ID, Roll Number, or Student Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Certificate No</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Issued Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading registry...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No certificates issued yet.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.certificate_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{c.students?.full_name}</p>
                      <p className="font-mono text-slate-500">{c.students?.roll_number}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{c.certificate_types?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(c.issued_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : c.status === 'revoked'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <a
                        href={`/verify/${c.verification_token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Verify
                      </a>
                      <button
                        onClick={() => handleDownload(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                      {c.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleReissue(c)}
                            disabled={busyId === c.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Reissue
                          </button>
                          <button
                            onClick={() => handleRevoke(c)}
                            disabled={busyId === c.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-semibold"
                          >
                            <Ban className="w-3.5 h-3.5" /> Revoke
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
