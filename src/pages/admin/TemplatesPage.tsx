import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CertificateType, CertificateTemplate } from '../../types/database';
import { Save, CheckCircle2, Plus } from 'lucide-react';

export default function TemplatesPage() {
  const [types, setTypes] = useState<CertificateType[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [titleText, setTitleText] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [signatoryTitle, setSignatoryTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  // Add new custom certificate type
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [{ data: tData }, { data: tplData }] = await Promise.all([
      supabase.from('certificate_types').select('*').order('created_at'),
      supabase.from('certificate_templates').select('*').eq('is_active', true),
    ]);
    const list = (tData as CertificateType[]) || [];
    const tpls = (tplData as CertificateTemplate[]) || [];
    setTypes(list);
    setTemplates(tpls);

    if (list.length > 0 && !selectedTypeId) {
      selectType(list[0].id, tpls);
    }
  };

  const selectType = (typeId: string, tplList = templates) => {
    setSelectedTypeId(typeId);
    setSavedBanner(false);
    const tpl = tplList.find((t) => t.certificate_type_id === typeId);
    if (tpl) {
      setTitleText(tpl.title_text);
      setBodyTemplate(tpl.body_template);
      setSignatoryTitle(tpl.signatory_title);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(false);
    const existing = templates.find((t) => t.certificate_type_id === selectedTypeId);
    if (existing) {
      await supabase
        .from('certificate_templates')
        .update({
          title_text: titleText,
          body_template: bodyTemplate,
          signatory_title: signatoryTitle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('certificate_templates').insert({
        certificate_type_id: selectedTypeId,
        title_text: titleText,
        body_template: bodyTemplate,
        signatory_title: signatoryTitle,
        is_demo_template: true,
        is_active: true,
      });
    }
    await loadAll();
    setSaving(false);
    setSavedBanner(true);
  };

  const toggleTypeActive = async (t: CertificateType) => {
    await supabase.from('certificate_types').update({ is_active: !t.is_active }).eq('id', t.id);
    await loadAll();
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const code = newTypeName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const { data } = await supabase
      .from('certificate_types')
      .insert({
        code,
        name: newTypeName.trim(),
        description: newTypeDesc.trim() || 'Institutional certificate managed by administrator.',
        required_fields: [{ name: 'purpose_detail', label: 'Purpose / Reference Details', type: 'text' }],
        eligible_statuses: ['Active', 'Graduated'],
      })
      .select()
      .single();

    if (data) {
      await supabase.from('certificate_templates').insert({
        certificate_type_id: data.id,
        title_text: newTypeName.trim().toUpperCase(),
        body_template:
          'This is to certify that {{student_name}}, Roll Number {{roll_number}}, enrolled in {{program}} (Section: {{section_code}}) at Vasireddy Venkatadri International Technological University (VVITU), is issued this certificate for {{purpose}}. [DEMO TEMPLATE - SUBJECT TO OFFICIAL INSTITUTIONAL APPROVAL]',
        signatory_title: 'Authorized Signatory, VVITU (DEMO)',
        is_demo_template: true,
      });
    }
    setNewTypeName('');
    setNewTypeDesc('');
    await loadAll();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Certificate Types & Template Editor</h2>
        <p className="text-sm text-slate-600">
          Configure the 6 certificate categories and edit A4 PDF demo templates. Placeholders:{' '}
          <code className="bg-slate-200 px-1 rounded text-xs">{'{{student_name}}'}</code>,{' '}
          <code className="bg-slate-200 px-1 rounded text-xs">{'{{roll_number}}'}</code>,{' '}
          <code className="bg-slate-200 px-1 rounded text-xs">{'{{hall_ticket_no}}'}</code>,{' '}
          <code className="bg-slate-200 px-1 rounded text-xs">{'{{program}}'}</code>,{' '}
          <code className="bg-slate-200 px-1 rounded text-xs">{'{{section_code}}'}</code>,{' '}
          <code className="bg-slate-200 px-1 rounded text-xs">{'{{academic_year}}'}</code>,{' '}
          <code className="bg-slate-200 px-1 rounded text-xs">{'{{purpose}}'}</code>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Certificate Categories */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-900">Certificate Categories</h3>
          <div className="space-y-2">
            {types.map((t) => (
              <div
                key={t.id}
                onClick={() => selectType(t.id)}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  selectedTypeId === t.id ? 'border-[#D9785D] bg-orange-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.code}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTypeActive(t);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {t.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddType} className="pt-4 border-t border-slate-200 space-y-2">
            <p className="text-xs font-bold uppercase text-slate-500">Add Custom Category</p>
            <input
              type="text"
              placeholder="Certificate Name (e.g. Internship NOC)"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
            <input
              type="text"
              placeholder="Short description"
              value={newTypeDesc}
              onChange={(e) => setNewTypeDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Certificate Type
            </button>
          </form>
        </div>

        {/* Right: Template Editor */}
        <form onSubmit={handleSaveTemplate} className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Edit Active PDF Template</h3>
            {savedBanner && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved!
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Certificate Heading Title</label>
            <input
              type="text"
              required
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Certificate Body Text</label>
            <textarea
              rows={6}
              required
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Signatory Designation (Demo)</label>
            <input
              type="text"
              required
              value={signatoryTitle}
              onChange={(e) => setSignatoryTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#D9785D] hover:bg-[#c5654a] text-white text-sm font-bold flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving Template...' : 'Save Template Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
