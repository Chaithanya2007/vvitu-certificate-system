import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, ShieldX, RefreshCw, Search, ArrowLeft } from 'lucide-react';

interface VerificationResult {
  certificate_number: string;
  status: 'active' | 'revoked' | 'replaced';
  student_name: string;
  roll_number: string;
  program: string;
  section_code: string;
  certificate_type: string;
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
}

export default function VerifyPage() {
  const { token } = useParams<{ token?: string }>();
  const [query, setQuery] = useState(token || '');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      setQuery(token);
      runVerification(token);
    }
  }, [token]);

  const runVerification = async (lookupCode: string) => {
    if (!lookupCode.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc('verify_certificate_public', {
        lookup_code: lookupCode.trim(),
      });
      if (error) throw error;
      if (!data || data.length === 0) {
        setNotFound(true);
      } else {
        setResult(data[0] as VerificationResult);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runVerification(query);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/vvit-logo.png" alt="VVITU" className="h-12 w-auto object-contain" />
            <div>
              <p className="text-[11px] font-bold uppercase text-[#D9785D]">VVITU Official Verification</p>
              <h1 className="text-base font-extrabold text-slate-900">Certificate Authenticity Portal</h1>
            </div>
          </div>
          <Link to="/" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Portal Home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900">Verify an Issued Certificate</h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter the Certificate Number (e.g. VVITU-CERT-2026-XXXXXX) or scan the QR code printed on the document.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              placeholder="Enter Certificate Number or Verification Reference..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-[#D9785D] outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition"
            >
              <Search className="w-4 h-4" /> {loading ? 'Checking...' : 'Verify'}
            </button>
          </form>
        </div>

        {notFound && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center space-y-2">
            <ShieldX className="w-12 h-12 text-red-600 mx-auto" />
            <h3 className="text-lg font-extrabold text-red-900">Invalid or Unrecognized Certificate Reference</h3>
            <p className="text-xs text-red-700">
              No certificate matching <strong>{query}</strong> exists in the official VVITU registry.
            </p>
          </div>
        )}

        {result && (
          <div
            className={`rounded-2xl border-2 p-6 sm:p-8 shadow-md space-y-5 bg-white ${
              result.status === 'active'
                ? 'border-emerald-500'
                : result.status === 'revoked'
                ? 'border-red-500'
                : 'border-amber-500'
            }`}
          >
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              {result.status === 'active' && <ShieldCheck className="w-10 h-10 text-emerald-600 shrink-0" />}
              {result.status === 'revoked' && <ShieldX className="w-10 h-10 text-red-600 shrink-0" />}
              {result.status === 'replaced' && <RefreshCw className="w-10 h-10 text-amber-600 shrink-0" />}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Verification Status</p>
                <h3
                  className={`text-xl font-extrabold uppercase ${
                    result.status === 'active'
                      ? 'text-emerald-700'
                      : result.status === 'revoked'
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}
                >
                  {result.status === 'active'
                    ? 'VALID & AUTHENTIC CERTIFICATE'
                    : result.status === 'revoked'
                    ? 'REVOKED BY INSTITUTION'
                    : 'REPLACED BY NEWER CERTIFICATE'}
                </h3>
              </div>
            </div>

            {result.status === 'revoked' && result.revocation_reason && (
              <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs">
                <strong>Revocation Reason:</strong> {result.revocation_reason}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Certificate Number</p>
                <p className="font-mono font-bold text-slate-900">{result.certificate_number}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Certificate Type</p>
                <p className="font-bold text-slate-900">{result.certificate_type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Student Name</p>
                <p className="font-bold text-slate-900">{result.student_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Roll Number & Section</p>
                <p className="font-mono font-semibold text-slate-800">
                  {result.roll_number} ({result.section_code})
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Program & Institution</p>
                <p className="font-semibold text-slate-800">
                  {result.program} — Vasireddy Venkatadri International Technological University (VVITU)
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Date of Issue</p>
                <p className="font-semibold text-slate-800">
                  {new Date(result.issued_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
