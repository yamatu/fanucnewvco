import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import { generateFAQSchema, generateBreadcrumbSchema } from '@/lib/structured-data';
import { getSiteUrl } from '@/lib/url';
import { buildStaticPageMetadata } from '@/lib/seo';
import { getLocalizedMetadataPaths, getRequestPublicLocale } from '@/lib/i18n/server';
import { localizePublicPath } from '@/lib/i18n/config';
import { translatePublicMessage } from '@/lib/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, canonical, languages } = await getLocalizedMetadataPaths('/faq');
  const title = translatePublicMessage(locale, 'faq.title');
  const description = translatePublicMessage(locale, 'faq.description');
  return {
    ...buildStaticPageMetadata(
    '/faq',
    title,
    description,
    'industrial automation parts FAQ, CNC parts support, PLC HMI servo drives, repair evaluation, worldwide shipping, warranty information, compatibility support',
  ),
    alternates: { canonical, languages },
    openGraph: { title, description, type: 'website', url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function FAQPage() {
  const baseUrl = getSiteUrl();
  const locale = await getRequestPublicLocale();
  const isZh = locale === 'zh';
  const faqItems = isZh
    ? [
        ['你们供应哪些工业自动化零部件？', '我们常备超过 100,000 件工业自动化产品，覆盖 FANUC、Siemens、Mitsubishi、ABB、Allen-Bradley、Omron、Yaskawa、Schneider Electric 等品牌，包括 PCB 板、PLC 与 I/O 模块、HMI、伺服驱动器、电机、编码器、变频器、控制单元和电源。'],
        ['你们支持全球配送吗？', '支持。我们通常通过 DHL、FedEx 或 UPS 提供国际快递，多数目的地预计 3–10 个工作日送达，具体时间取决于清关和当地服务。'],
        ['如何确认产品是否原装以及成色？', '我们供应原厂零部件，也会在有货时提供明确标注的兼容替代方案。品牌、成色、兼容性及随附资料会显示在报价或产品页面中，方便您下单前确认。'],
        ['你们的质保政策是什么？', '质保范围会根据产品成色和制造商条款，在每个产品页面或报价中明确说明。许多产品提供 12 个月 Vcocnc 质保支持，符合条件的新品也可能保留制造商质保。'],
        ['如何获得技术支持？', '您可通过 sales@vcocncspare.com 或电话联系我们。团队可协助安装指导、故障排查、兼容性确认和替换建议。'],
        ['如何下单？', '您可以直接通过网站、电子邮件或电话下单。我们支持 PayPal、银行转账及主要信用卡，并可为长期合作客户协商批量订单条款。'],
        ['批量采购有优惠吗？', '有。批量订单和长期供货可获得定制报价，请把具体型号与数量发送给销售团队。'],
        ['如何确认零件与我的系统兼容？', '请提供系统型号、当前零件号和应用信息，我们的技术团队会核对兼容性，并在需要时建议替代型号。'],
        ['支持哪些付款方式？', '我们支持 PayPal、银行电汇以及 Visa、MasterCard、American Express 等主要信用卡；长期合作客户还可申请账期或采购订单。'],
        ['如何查询订单物流？', '订单发出后，您会通过电子邮件收到物流信息，也可登录账户实时查看订单状态和运单号。'],
      ]
    : [
        ['What industrial automation parts do you stock?', 'We stock over 100,000 industrial automation items across brands such as FANUC, Siemens, Mitsubishi, ABB, Allen-Bradley, Omron, Yaskawa, Schneider Electric, and more. Our range includes PCB boards, PLC and I/O modules, HMI panels, servo drives, motors, encoders, inverters, control units, and power supplies.'],
        ['Do you ship worldwide?', 'Yes, we ship industrial automation parts worldwide. Express delivery to most destinations typically takes 3-10 business days through DHL, FedEx, or UPS, subject to customs and local service availability.'],
        ['Are the parts genuine and how is their condition identified?', 'We supply genuine manufacturer parts as well as clearly identified compatible alternatives where available. Brand, condition, compatibility, and included documentation are shown on the quotation or product page so you can confirm the exact option before ordering.'],
        ['What is your warranty policy?', 'Warranty coverage is stated for each product or quotation and depends on condition and manufacturer terms. Many supplied parts include 12-month Vcocnc warranty support, while eligible new items may retain the applicable manufacturer warranty.'],
        ['How can I get technical support?', 'Our technical support team is available via email at sales@vcocncspare.com or phone. We provide installation guidance, troubleshooting, compatibility assistance, and replacement recommendations.'],
        ['How do I place an order?', 'You can place orders directly on our website, via email, or by phone. We accept PayPal, bank transfers, and major credit cards. For large orders, we offer flexible payment terms for established customers.'],
        ['Do you offer quantity discounts?', 'Yes, we offer competitive quantity discounts for bulk orders. Contact our sales team for custom pricing on large quantities or long-term supply agreements.'],
        ['How do I know if a part is compatible with my system?', 'Our technical team can help verify compatibility. Provide your system model, current part number, and application details. We maintain extensive compatibility databases and can suggest alternatives if needed.'],
        ['What payment methods do you accept?', 'We accept PayPal, wire transfers, major credit cards (Visa, MasterCard, American Express), and for established customers, we offer terms payments and purchase orders.'],
        ['How do I track my order?', 'Once your order ships, you will receive tracking information via email. You can also log into your account on our website to view order status and tracking details in real time.'],
      ];

  const faqSchema = generateFAQSchema(locale);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: translatePublicMessage(locale, 'common.home'), url: `${baseUrl}${localizePublicPath('/', locale)}` },
    { name: translatePublicMessage(locale, 'faq.title'), url: `${baseUrl}${localizePublicPath('/faq', locale)}` }
  ]);

  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [faqSchema, breadcrumbSchema]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(combinedSchema)
        }}
      />
      <PublicLayout>
        <div className="site-page-shell min-h-screen">
          <section className="site-page-hero">
            <div className="site-hero-inner mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
              <span className="site-hero-kicker">{translatePublicMessage(locale, 'faq.kicker')}</span>
              <h1 className="mt-5 text-4xl font-bold text-white sm:text-5xl">
                {translatePublicMessage(locale, 'faq.title')}
              </h1>
              <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-blue-100">
                {translatePublicMessage(locale, 'faq.description')}
              </p>
            </div>
          </section>

          <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            {/* Header */}
            {/* FAQ Items */}
            <div className="space-y-8">
              {faqItems.map(([question, answer]) => (
                <div key={question} className="site-panel p-6">
                  <h2 className="mb-3 text-xl font-semibold text-gray-900">{question}</h2>
                  <p className="leading-relaxed text-gray-700">{answer}</p>
                </div>
              ))}
            </div>

            {/* Contact CTA */}
            <div className="site-status-panel-strong mt-16 p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {translatePublicMessage(locale, 'faq.more')}
              </h2>
              <p className="text-gray-600 mb-6">
                {translatePublicMessage(locale, 'faq.moreDescription')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={localizePublicPath('/contact', locale)}
                  className="site-primary-action px-6 py-3"
                >
                  {translatePublicMessage(locale, 'common.contactUs')}
                </a>
                <a
                  href="mailto:sales@vcocncspare.com"
                  className="site-secondary-action px-6 py-3"
                >
                  {translatePublicMessage(locale, 'faq.email')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    </>
  );
}
