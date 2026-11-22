import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { CertificateType } from '../../types/database';
import { Send, AlertCircle, ShieldAlert } from 'lucide-react';

export default function NewRequestPage() {
  const { student, user } = useAuth();
  const navigate = useNavigate();
  const [types, setTypes] = useState<CertificateType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('certificate_types')
      .select('*')
      .eq('is_active', true)
      .order('created_at')
      .then(({ data }) => {
        const list = (data as CertificateType[]) || [];
        setTypes(list);
        if (list.length > 0) handleSelectType(list[0]);
      });
  }, []);

  const handleSelectType = (t: CertificateType) => {
    setSelectedTypeId(t.id);
    const defaults: Record<string, string> = {};
    (t.required_fields || []).forEach((f) => {
      defaults[f.name] = f.default || (f.options ? f.options[0] : '');
    });
    setFormData(defaults);
  };

  const selectedType = types.find((t) => t.id === selectedTypeId);
  const isEligible =
    student && selectedType
      ? selectedType.eligible_statuses.includes(student.enrollment_status)
      : false;

  const generateTrackingNumber = () => {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `REQ-${new Date().getFullYear()}-${rand}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !selectedType || !isEligible) return;
    setError(null);
    setSubmitting(true);

    try {
      const tracking = generateTrackingNumber();
      const { data: inserted, error: insErr } = await supabase
        .from('certificate_requests')
        .insert({
          tracking_number: tracking,
          student_id: student.id,
          certificate_type_id: selectedType.id,
          purpose: purpose.trim(),
          form_data: formData,
          status: 'Submitted',
        })
        .select()
        .single();

      if (insErr) throw insErr;

      await supabase.from('audit_logs').insert({
        actor_id: user?.id || null,
        actor_role: 'student',
        action: 'CERTIFICATE_REQUEST_SUBMITTED',
        entity_type: 'certificate_requests',
        entity_id: inserted.id,
        details: { tracking_number: tracking, certificate_type: selectedType.name },
      });

      navigate('/student/history');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Request a Certificate</h2>
        <p className="text-sm text-slate-600">
          Select an eligible certificate category and provide accurate purpose details for VVITU office verification.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2">1. Select Certificate Type</label>
          <div className="grid sm:grid-cols-2 gap-3">
            {types.map((t) => {
              const eligible = student ? t.eligible_statuses.includes(student.enrollment_status) : false;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectType(t)}
                  className={`p-4 rounded-xl border text-left transition ${
                    selectedTypeId === t.id
                      ? 'border-[#D9785D] bg-orange-50/60 ring-2 ring-[#D9785D]/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    {!eligible && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Not Eligible
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {selectedType && !isEligible && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Eligibility Notice</p>
              <p className="text-xs mt-0.5">
                <strong>{selectedType.name}</strong> is restricted to students with status:{' '}
                <strong>{selectedType.eligible_statuses.join(', ')}</strong>. Your current status is{' '}
                <strong>{student?.enrollment_status}</strong>.
              </p>
            </div>
          </div>
        )}

        {selectedType && isEligible && (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                2. Purpose of Certificate <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Applying for AP Jagananna Vidya Deevena Scholarship / Passport Verification"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D9785D] outline-none"
              />
            </div>

            {(selectedType.required_fields || []).map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-bold text-slate-800 mb-1">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white"
                  >
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    required
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#D9785D] hover:bg-[#c5654a] text-white text-sm font-bold shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {submitting ? 'Submitting Request...' : 'Submit Certificate Request'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
