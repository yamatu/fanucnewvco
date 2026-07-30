import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import RepairRequestForm from '@/components/repair/RepairRequestForm';
import { getLocalizedMetadataPaths, getRequestPublicLocale } from '@/lib/i18n/server';
import { localizePublicPath } from '@/lib/i18n/config';
import { getSiteUrl } from '@/lib/url';
import { withSiteName } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, canonical, languages } = await getLocalizedMetadataPaths('/repair-request', ['en', 'zh']);
  const title = locale === 'zh' ? '工业电子设备维修申请' : 'Industrial Electronics Repair Request';
  const description = locale === 'zh'
    ? '提交 HMI 人机界面、伺服驱动器、PLC 模块、数控板卡、电机、变频器、电源及其他自动化电子设备的维修评估申请。'
    : 'Request repair evaluation for HMI panels, servo drives, PLC modules, CNC boards, motors, inverters, power supplies and other automation electronics.';
  return {
    title,
    description,
    keywords: 'industrial electronics repair, automation repair service, servo drive repair, HMI repair, PLC repair, CNC board repair',
    alternates: { canonical, languages },
    openGraph: { title: withSiteName(title), description, type: 'website', url: canonical },
  };
}

const steps = [
  ['01', 'Submit unit details', 'Provide the brand, exact model, fault symptoms, quantity and production urgency.'],
  ['02', 'Initial evaluation', 'We review available technical information and confirm repair or replacement options.'],
  ['03', 'Approval and shipment', 'If physical evaluation is needed, we issue a reference and packing instructions before shipment.'],
  ['04', 'Diagnosis and repair', 'After inspection, approved work is completed and the unit is functionally checked where supported.'],
  ['05', 'Return shipment', 'The serviced unit is protectively packed and returned with shipment information.'],
];

export default async function RepairRequestPage() {
  const baseUrl = getSiteUrl();
  const locale = await getRequestPublicLocale();
  const isZh = locale === 'zh';
  const localizedUrl = `${baseUrl}${localizePublicPath('/repair-request', locale)}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Industrial Automation Parts Repair Evaluation',
    serviceType: 'Industrial electronics repair and replacement evaluation',
    provider: { '@type': 'Organization', '@id': `${baseUrl}/#organization`, name: 'Vibocnc' },
    areaServed: 'Worldwide',
    url: localizedUrl,
    description: 'Repair evaluation for HMI panels, servo drives, PLC modules, CNC boards, power supplies, motors, inverters and other industrial automation electronics.',
  };
  return <PublicLayout>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <section className="site-page-hero py-20">
      <div className="site-hero-inner mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl"><p className="site-hero-kicker">{isZh ? '维修与替换支持' : 'Repair and replacement support'}</p><h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">{isZh ? '申请工业电子设备维修' : 'Request Industrial Electronics Repair'}</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-blue-100">{isZh ? '提交 HMI、伺服驱动器、PLC 模块、数控板卡、电机、变频器、电源及其他自动化电子设备的准确型号与故障信息。我们将评估维修可行性并提供替换方案。' : 'Send the exact model and fault details for HMI panels, servo drives, PLC modules, CNC boards, motors, inverters, power supplies and other automation electronics. We will review repair feasibility and replacement options.'}</p></div>
      </div>
    </section>

    <section className="site-page-shell py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0b3e75]">{isZh ? '提交前准备' : 'Before you submit'}</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">{isZh ? '这些信息能加快评估' : 'Information that speeds up evaluation'}</h2>
          <ul className="mt-7 space-y-4">
            {(isZh ? ['准确品牌、型号及完整铭牌编号', '报警代码及清晰的故障描述', '设备所在的机床、控制器或应用场景', '铭牌、连接器和可见损坏的照片', '所需数量以及生产线是否停机'] : ['Exact brand, model and full nameplate number', 'Alarm codes and a clear description of the failure', 'Machine, controller or application where the unit is installed', 'Photos of the nameplate, connectors and visible damage', 'Required quantity and whether production is stopped']).map((item) => <li key={item} className="flex gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700"><span className="font-black text-orange-600">✓</span>{item}</li>)}
          </ul>
          <div className="mt-7 rounded-lg bg-slate-950 p-6 text-white"><h3 className="font-bold">{isZh ? '免费初步评估' : 'Free initial review'}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{isZh ? '初步评估基于您提供的信息，最终维修报价可能需要实物检测。若不适合维修，我们可继续查询替换库存或兼容采购方案。' : 'The first review is based on the information you provide. A final repair quotation may require physical inspection. If repair is not practical, we can check available replacement stock or compatible sourcing options.'}</p></div>
        </div>
        <RepairRequestForm locale={locale} />
      </div>
    </section>

    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0b3e75]">{isZh ? '清晰的后续步骤' : 'Clear next steps'}</p><h2 className="mt-3 text-3xl font-black text-slate-950">{isZh ? '维修流程说明' : 'How the Repair Process Works'}</h2><div className="mt-9 grid gap-4 md:grid-cols-5">{(isZh ? [['01', '提交设备信息', '提供品牌、准确型号、故障现象、数量及生产紧急程度。'], ['02', '初步评估', '我们审核技术信息并确认维修或替换方案。'], ['03', '确认并寄送', '如需实物检测，我们会在寄送前提供参考编号和包装说明。'], ['04', '诊断与维修', '完成检测后，按确认方案维修，并在条件允许时进行功能测试。'], ['05', '返还发货', '设备完成防护包装后寄回，并提供物流信息。']] : steps).map(([number, title, description]) => <article key={number} className="border-t-4 border-[#0b3e75] bg-slate-50 p-5"><span className="text-xs font-black tracking-widest text-[#0b3e75]">{isZh ? '步骤' : 'STEP'} {number}</span><h3 className="mt-4 font-bold text-slate-950">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></article>)}</div></div>
    </section>
  </PublicLayout>;
}
