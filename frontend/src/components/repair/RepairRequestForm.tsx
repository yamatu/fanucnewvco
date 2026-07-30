'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ContactService } from '@/services';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';
import type { PublicLocale } from '@/lib/i18n/config';

type RepairForm = {
  name: string;
  email: string;
  company: string;
  phone: string;
  brand: string;
  model: string;
  quantity: string;
  fault: string;
  urgency: string;
};

const INITIAL_FORM: RepairForm = { name: '', email: '', company: '', phone: '', brand: '', model: '', quantity: '1', fault: '', urgency: 'standard' };

export default function RepairRequestForm({ locale }: { locale: PublicLocale }) {
  const { t } = usePublicI18n();
  const isZh = locale === 'zh';
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const set = (key: keyof RepairForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await ContactService.submitContact({
        name: form.name,
        email: form.email,
        company: form.company,
        phone: form.phone,
        inquiry_type: 'repair',
        subject: `Repair evaluation: ${form.brand || 'Unknown brand'} ${form.model}`.trim(),
        message: [
          `Brand: ${form.brand || 'Not provided'}`,
          `Model / part number: ${form.model}`,
          `Quantity: ${form.quantity || '1'}`,
          `Priority: ${form.urgency}`,
          '',
          'Fault description:',
          form.fault,
          '',
          'Please reply to request nameplate, fault and damage photos if they were not supplied by email.',
        ].join('\n'),
      });
      toast.success(t('contact.success'));
      setForm(INITIAL_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('contact.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = 'site-input mt-2 w-full px-4 py-3';
  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
      <h2 className="text-2xl font-black text-slate-950">{isZh ? '申请维修评估' : 'Request a Repair Evaluation'}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{isZh ? '必填信息有助于我们识别设备并提供有效的初步回复。' : 'Required fields help us identify the unit and prepare a useful first response.'}</p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">{isZh ? '姓名' : 'Full name'} *<input required value={form.name} onChange={(e) => set('name', e.target.value)} className={fieldClass} autoComplete="name" /></label>
        <label className="text-sm font-semibold text-slate-700">{isZh ? '商务邮箱' : 'Business email'} *<input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={fieldClass} autoComplete="email" /></label>
        <label className="text-sm font-semibold text-slate-700">{isZh ? '公司' : 'Company'}<input value={form.company} onChange={(e) => set('company', e.target.value)} className={fieldClass} autoComplete="organization" /></label>
        <label className="text-sm font-semibold text-slate-700">{isZh ? '电话 / WhatsApp' : 'Phone / WhatsApp'}<input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={fieldClass} autoComplete="tel" /></label>
        <label className="text-sm font-semibold text-slate-700">{isZh ? '品牌' : 'Brand'}<input value={form.brand} onChange={(e) => set('brand', e.target.value)} className={fieldClass} placeholder="Siemens, FANUC, ABB..." /></label>
        <label className="text-sm font-semibold text-slate-700">{isZh ? '型号 / 零件号' : 'Model / part number'} *<input required value={form.model} onChange={(e) => set('model', e.target.value)} className={fieldClass} placeholder={isZh ? '请输入准确铭牌编号' : 'Exact nameplate number'} /></label>
        <label className="text-sm font-semibold text-slate-700">{isZh ? '数量' : 'Quantity'}<input min="1" type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className={fieldClass} /></label>
        <label className="text-sm font-semibold text-slate-700">{isZh ? '优先级' : 'Priority'}<select value={form.urgency} onChange={(e) => set('urgency', e.target.value)} className={`${fieldClass} site-select`}><option value="standard">{isZh ? '常规评估' : 'Standard evaluation'}</option><option value="production-stopped">{isZh ? '生产已停机' : 'Production stopped'}</option><option value="planned-maintenance">{isZh ? '计划维护' : 'Planned maintenance'}</option></select></label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">{isZh ? '故障现象和设备背景' : 'Fault symptoms and machine context'} *<textarea required rows={7} value={form.fault} onChange={(e) => set('fault', e.target.value)} className={fieldClass} placeholder={isZh ? '报警代码、可见损坏、故障出现时机、机床/控制器型号以及已经完成的排查。' : 'Alarm code, visible damage, when the fault occurs, machine/controller model and any troubleshooting already completed.'} /></label>
      </div>

      <div className="mt-5 rounded-md border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-slate-700">
        {isZh ? '提交后，请回复确认邮件并附上铭牌、连接器、设备正反面及可见损坏的清晰照片。在团队确认维修编号和收货地址前，请勿寄出设备。' : 'After submitting, reply to our confirmation email with clear photos of the nameplate, connectors, front and rear of the unit, and any visible damage. Do not ship a unit until our team confirms the repair reference and address.'}
      </div>

      <button disabled={submitting} className="mt-6 w-full rounded-md bg-orange-700 px-6 py-4 font-bold text-white hover:bg-[#0b3e75] disabled:opacity-50">{submitting ? (isZh ? '正在提交…' : 'Sending request…') : (isZh ? '提交维修申请' : 'Send Repair Request')}</button>
    </form>
  );
}
