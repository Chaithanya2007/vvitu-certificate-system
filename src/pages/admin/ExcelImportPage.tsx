import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Upload, CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, ShieldAlert } from 'lucide-react';

interface ParsedStudentRow {
  section_code: string;
  excel_row: number;
  hall_ticket_no: string;
  roll_number: string;
  full_name: string;
  program: string;
  seat_type: string;
  status: 'valid' | 'warning' | 'skip' | 'duplicate';
  warnings: string[];
}

const ALLOWED_SHEETS = ['CAD-1', 'CAD-2', 'CAD-3', 'CAD-4'];
const STANDARD_PROGRAM = 'B.Tech - Computer Science and Engineering (AI & DS)';

export default function ExcelImportPage() {
  const { profile } = useAuth();
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [excludedSheets, setExcludedSheets] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<{ imported: number; warnings: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setReport(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Fetch existing roll numbers from DB to detect duplicates
      const { data: existingStudents } = await supabase.from('students').select('roll_number');
      const existingRolls = new Set((existingStudents || []).map((s) => s.roll_number.toUpperCase()));

      const excluded = workbook.SheetNames.filter((name) => !ALLOWED_SHEETS.includes(name.trim().toUpperCase()));
      setExcludedSheets(excluded);

      const parsed: ParsedStudentRow[] = [];
      const seenInFile = new Set<string>();

      for (const sheetName of workbook.SheetNames) {
        const cleanSheet = sheetName.trim().toUpperCase();
        if (!ALLOWED_SHEETS.includes(cleanSheet)) continue;

        const ws = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

        // Header row is at index 7 (Row 8 in Excel), student records start at index 8 (Row 9)
        for (let i = 8; i < rawRows.length; i++) {
          const r = rawRows[i];
          if (!r || r.every((cell) => String(cell).trim() === '')) continue;

          const hallTicket = String(r[1] ?? '').trim();
          const rollNo = String(r[2] ?? '').trim().toUpperCase();
          const fullName = String(r[3] ?? '').trim().toUpperCase();
          let program = String(r[4] ?? '').trim();
          let seatType = String(r[5] ?? '').trim();
          const excelRowNum = i + 1;

          // Skip trailing stray rows (e.g., CAD-4 row 92 where roll & name are empty)
          if (!rollNo && !fullName) {
            parsed.push({
              section_code: cleanSheet,
              excel_row: excelRowNum,
              hall_ticket_no: hallTicket,
              roll_number: '—',
              full_name: '(Trailing empty/footer cell)',
              program: '—',
              seat_type: seatType || '—',
              status: 'skip',
              warnings: ['Skipped non-student footer row'],
            });
            continue;
          }

          const rowWarnings: string[] = [];

          // Normalize known anomalies without inventing student data
          if (!program || program.toUpperCase() === fullName) {
            rowWarnings.push(`Corrected corrupted Program value ("${program || 'Empty'}") to standard CSE (AI & DS)`);
            program = STANDARD_PROGRAM;
          } else if (program.toLowerCase().includes('computer science')) {
            program = STANDARD_PROGRAM;
          }

          if (!seatType) {
            rowWarnings.push('Missing Seat Type in Excel — preserved as "Unspecified"');
            seatType = 'Unspecified';
          } else if (seatType.toUpperCase() === 'M') {
            rowWarnings.push('Normalized shorthand Seat Type "M" to "Management"');
            seatType = 'Management';
          }

          if (!hallTicket) {
            rowWarnings.push('Missing Hall Ticket Number');
          }

          let status: ParsedStudentRow['status'] = rowWarnings.length > 0 ? 'warning' : 'valid';
          if (existingRolls.has(rollNo) || seenInFile.has(rollNo)) {
            status = 'duplicate';
            rowWarnings.push('Duplicate Roll Number — will be skipped to prevent duplicate account');
          } else {
            seenInFile.add(rollNo);
          }

          parsed.push({
            section_code: cleanSheet,
            excel_row: excelRowNum,
            hall_ticket_no: hallTicket,
            roll_number: rollNo,
            full_name: fullName,
            program,
            seat_type: seatType,
            status,
            warnings: rowWarnings,
          });
        }
      }

      setRows(parsed);
    } catch (err: any) {
      setError('Failed to parse Excel workbook: ' + err.message);
    }
  };

  const handleConfirmImport = async () => {
    const validToImport = rows.filter((r) => r.status === 'valid' || r.status === 'warning');
    if (validToImport.length === 0) {
      setError('No new valid student records available to import.');
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const { data: classesData, error: clsErr } = await supabase.from('classes').select('id, section_code');
      if (clsErr) throw clsErr;

      const classMap = new Map<string, string>(
        (classesData || []).map((c) => [c.section_code.toUpperCase(), c.id])
      );

      const payload = validToImport.map((r) => {
        const classId = classMap.get(r.section_code);
        if (!classId) throw new Error(`Section ${r.section_code} not found in classes table.`);
        return {
          roll_number: r.roll_number,
          hall_ticket_no: r.hall_ticket_no || null,
          full_name: r.full_name,
          class_id: classId,
          program: r.program,
          seat_type: r.seat_type,
          enrollment_status: 'Active',
          data_warnings: r.warnings.length > 0 ? r.warnings.join('; ') : null,
        };
      });

      // Insert in batches of 100
      for (let i = 0; i < payload.length; i += 100) {
        const batch = payload.slice(i, i + 100);
        const { error: insErr } = await supabase.from('students').insert(batch);
        if (insErr) throw insErr;
      }

      const warningCount = validToImport.filter((r) => r.status === 'warning').length;
      const skippedCount = rows.filter((r) => r.status === 'skip' || r.status === 'duplicate').length;

      await supabase.from('import_logs').insert({
        imported_by: profile?.id || null,
        file_name: fileName,
        total_rows: rows.length,
        imported_count: validToImport.length,
        warning_count: warningCount,
        skipped_count: skippedCount,
        report_json: {
          excluded_sheets: excludedSheets,
          flagged_rows: rows.filter((r) => r.warnings.length > 0),
        },
      });

      await supabase.from('audit_logs').insert({
        actor_id: profile?.id || null,
        actor_role: profile?.role || 'admin',
        action: 'EXCEL_STUDENT_IMPORT',
        entity_type: 'students',
        details: { file_name: fileName, imported: validToImport.length, excluded_sheets: excludedSheets },
      });

      setReport({ imported: validToImport.length, warnings: warningCount, skipped: skippedCount });
      setRows([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const validCount = rows.filter((r) => r.status === 'valid').length;
  const warnCount = rows.filter((r) => r.status === 'warning').length;
  const skipDupCount = rows.filter((r) => r.status === 'skip' || r.status === 'duplicate').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Validated Student Excel Importer</h2>
        <p className="text-sm text-slate-600">
          Upload <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">CAD.xlsx</code> to preview, validate, and import CAD-1 through CAD-4 student records.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
        <FileSpreadsheet className="w-12 h-12 text-[#D9785D] mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-800">Select your institutional Excel workbook (.xlsx)</p>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Automatically imports CAD-1, CAD-2, CAD-3, CAD-4 and excludes MEC-2 per initial release policy.
        </p>
        <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer transition">
          <Upload className="w-4 h-4" /> Choose CAD.xlsx File
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {report && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
          <p className="font-bold text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Import Completed Successfully!
          </p>
          <p className="text-sm">
            • <strong>{report.imported}</strong> students imported into PostgreSQL ({report.warnings} with normalized data warnings).
          </p>
          <p className="text-sm">• <strong>{report.skipped}</strong> duplicate/footer rows safely skipped.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                Clean Valid: {validCount}
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                Flagged & Normalized: {warnCount}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                Skipped / Duplicate: {skipDupCount}
              </span>
              {excludedSheets.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> Excluded Sheets: {excludedSheets.join(', ')}
                </span>
              )}
            </div>

            <button
              onClick={handleConfirmImport}
              disabled={importing || validCount + warnCount === 0}
              className="px-6 py-2.5 rounded-xl bg-[#D9785D] hover:bg-[#c5654a] text-white text-sm font-bold shadow transition disabled:opacity-50"
            >
              {importing ? 'Importing to Database...' : `Confirm & Import ${validCount + warnCount} Students`}
            </button>
          </div>

          {/* Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600">
              Import Validation Preview ({fileName})
            </div>
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Section</th>
                    <th className="px-4 py-2.5">Roll Number</th>
                    <th className="px-4 py-2.5">Hall Ticket</th>
                    <th className="px-4 py-2.5">Student Name</th>
                    <th className="px-4 py-2.5">Seat Type</th>
                    <th className="px-4 py-2.5">Validation Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((r, idx) => (
                    <tr key={idx} className={r.status === 'warning' ? 'bg-amber-50/50' : r.status !== 'valid' ? 'bg-slate-50 text-slate-400' : ''}>
                      <td className="px-4 py-2.5 font-semibold">
                        {r.status === 'valid' && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</span>}
                        {r.status === 'warning' && <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Warning</span>}
                        {(r.status === 'skip' || r.status === 'duplicate') && <span className="text-slate-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {r.status}</span>}
                      </td>
                      <td className="px-4 py-2.5 font-bold">{r.section_code}</td>
                      <td className="px-4 py-2.5 font-mono">{r.roll_number}</td>
                      <td className="px-4 py-2.5 font-mono">{r.hall_ticket_no || '—'}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{r.full_name}</td>
                      <td className="px-4 py-2.5">{r.seat_type}</td>
                      <td className="px-4 py-2.5 text-amber-800">{r.warnings.join('; ') || 'OK'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
