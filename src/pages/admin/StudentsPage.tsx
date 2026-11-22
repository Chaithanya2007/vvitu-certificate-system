import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { StudentRecord, ClassSection } from '../../types/database';
import { Search, CheckCircle2, Clock } from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: cls }, { data: std }] = await Promise.all([
      supabase.from('classes').select('*').order('section_code'),
      supabase.from('students').select('*, classes(*)').order('roll_number'),
    ]);
    setClasses((cls as ClassSection[]) || []);
    setStudents((std as StudentRecord[]) || []);
    setLoading(false);
  };

  const filtered = students.filter((s) => {
    const matchesSection = sectionFilter === 'ALL' || s.classes?.section_code === sectionFilter;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      s.roll_number.toLowerCase().includes(q) ||
      s.full_name.toLowerCase().includes(q) ||
      (s.hall_ticket_no && s.hall_ticket_no.toLowerCase().includes(q));
    return matchesSection && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Student & Class Directory</h2>
          <p className="text-sm text-slate-600">Search and verify imported student records across CAD-1 to CAD-4</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Roll Number, Student Name, or Hall Ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#D9785D] outline-none"
          />
        </div>
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium bg-white"
        >
          <option value="ALL">All Sections ({students.length})</option>
          {classes.map((c) => (
            <option key={c.id} value={c.section_code}>
              {c.section_code} (Room {c.room_no})
            </option>
          ))}
        </select>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Roll Number</th>
                <th className="px-5 py-3">Hall Ticket</th>
                <th className="px-5 py-3">Full Name</th>
                <th className="px-5 py-3">Section</th>
                <th className="px-5 py-3">Seat Type</th>
                <th className="px-5 py-3">Portal Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading students...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No students match your filter.</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-semibold text-slate-900">{s.roll_number}</td>
                    <td className="px-5 py-3 font-mono text-slate-600">{s.hall_ticket_no || '—'}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{s.full_name}</td>
                    <td className="px-5 py-3 font-semibold text-[#D9785D]">{s.classes?.section_code}</td>
                    <td className="px-5 py-3 text-slate-600">{s.seat_type}</td>
                    <td className="px-5 py-3">
                      {s.is_account_activated ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Activated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          <Clock className="w-3.5 h-3.5" /> Pending Setup
                        </span>
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
