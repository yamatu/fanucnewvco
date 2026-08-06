import { getSiteUrl } from '@/lib/url';
import { SITE_NAME } from '@/lib/seo';

export function generateOrganizationSchema(sameAs: string[] = []) {
  const baseUrl = getSiteUrl();
  const socialProfiles = [...new Set(sameAs.filter((url) => /^https?:\/\//i.test(url)))];

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    "name": SITE_NAME,
    "alternateName": "Vibocnc Industrial Automation Parts",
    "description": "Industrial automation parts and CNC spares across 20+ brands, with model verification, inspection, repair support and worldwide shipping.",
    "url": baseUrl,
    "foundingDate": "2007",
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/android-chrome-512x512.png`,
      "width": 512,
      "height": 512
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Kunshan",
      "addressRegion": "Jiangsu",
      "addressCountry": "CN"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "sales",
      "telephone": "+86-13348028050",
      "email": "sales@vibocnc.com",
      "availableLanguage": ["en", "zh", "es", "de", "fr", "it", "pt", "ja", "ko", "ru", "ar"]
    },
    ...(socialProfiles.length > 0 ? { "sameAs": socialProfiles } : {})
  };
}

export function generateWebsiteSchema() {
  const baseUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    "name": SITE_NAME,
    "url": baseUrl,
    "description": "Industrial automation parts and CNC spares across 20+ brands, with model verification, inspection, repair support and worldwide shipping.",
    "publisher": {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      "name": SITE_NAME,
      "url": baseUrl
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Industrial Automation Resources",
      "description": "Main product, service and technical content hubs available at Vibocnc",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Industrial Automation Parts",
          "url": `${baseUrl}/products`
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Product Categories",
          "url": `${baseUrl}/categories`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Repair Evaluation",
          "url": `${baseUrl}/repair-request`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Industrial Automation Blog",
          "url": `${baseUrl}/blog`
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "Company News",
          "url": `${baseUrl}/news`
        },
        {
          "@type": "ListItem",
          "position": 6,
          "name": "Contact Vibocnc",
          "url": `${baseUrl}/contact`
        }
      ]
    },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", ".product-name", ".category-title"]
    }
  };
}

export function generateBreadcrumbSchema(items: Array<{name: string, url: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

export function generateFAQSchema(locale = 'en') {
  const isZh = locale === 'zh';
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": isZh ? "你们供应哪些工业自动化零部件？" : "What industrial automation parts do you stock?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": isZh ? "我们常备超过 100,000 件工业自动化产品，覆盖 FANUC、Siemens、Mitsubishi、ABB、Allen-Bradley、Omron、Yaskawa、Schneider Electric 等品牌，包括 PCB 板、PLC 与 I/O 模块、HMI、伺服驱动器、电机、编码器、变频器、控制单元和电源。" : "We stock over 100,000 industrial automation items across brands such as FANUC, Siemens, Mitsubishi, ABB, Allen-Bradley, Omron, Yaskawa, Schneider Electric, and more. Our range includes PCB boards, PLC and I/O modules, HMI panels, servo drives, motors, encoders, inverters, control units, and power supplies."
        }
      },
      {
        "@type": "Question",
        "name": isZh ? "你们支持全球配送吗？" : "Do you ship worldwide?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": isZh ? "支持。我们通常通过 DHL、FedEx 或 UPS 提供国际快递，多数目的地预计 3–10 个工作日送达，具体时间取决于清关和当地服务。" : "Yes, we ship industrial automation parts worldwide. Express delivery to most destinations typically takes 3-10 business days through DHL, FedEx, or UPS, subject to customs and local service availability."
        }
      },
      {
        "@type": "Question",
        "name": isZh ? "如何确认产品是否原装以及成色？" : "Are the parts genuine and how is their condition identified?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": isZh ? "我们供应原厂零部件，也会在有货时提供明确标注的兼容替代方案。品牌、成色、兼容性及随附资料会显示在报价或产品页面中，方便您下单前确认。" : "We supply genuine manufacturer parts as well as clearly identified compatible alternatives where available. Brand, condition, compatibility, and included documentation are shown on the quotation or product page so you can confirm the exact option before ordering."
        }
      },
      {
        "@type": "Question",
        "name": isZh ? "你们的质保政策是什么？" : "What is your warranty policy?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": isZh ? "质保范围会根据产品成色和制造商条款，在每个产品页面或报价中明确说明。许多产品提供 12 个月 Vibocnc 质保支持，符合条件的新品也可能保留制造商质保。" : "Warranty coverage is stated for each product or quotation and depends on condition and manufacturer terms. Many supplied parts include 12-month Vibocnc warranty support, while eligible new items may retain the applicable manufacturer warranty."
        }
      },
      {
        "@type": "Question",
        "name": isZh ? "如何获得技术支持？" : "How can I get technical support?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": isZh ? "您可通过 sales@vibocnc.com 或电话联系我们。团队可协助安装指导、故障排查、兼容性确认和替换建议。" : "Our technical support team is available via email at sales@vibocnc.com or phone. We provide installation guidance, troubleshooting, compatibility assistance, and replacement recommendations."
        }
      },
      {
        "@type": "Question",
        "name": isZh ? "如何下单？" : "How do I place an order?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": isZh ? "您可以直接通过网站、电子邮件或电话下单。我们支持 PayPal、银行转账及主要信用卡，并可为长期合作客户协商批量订单条款。" : "You can place orders directly on our website, via email, or by phone. We accept PayPal, bank transfers, and major credit cards. For large orders, we offer flexible payment terms for established customers."
        }
      },
      {
        "@type": "Question",
        "name": isZh ? "批量采购有优惠吗？" : "Do you offer quantity discounts?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": isZh ? "有。批量订单和长期供货可获得定制报价，请把具体型号与数量发送给销售团队。" : "Yes, we offer competitive quantity discounts for bulk orders. Contact our sales team for custom pricing on large quantities or long-term supply agreements."
        }
      },
      {
        "@type": "Question",
        "name": isZh ? "如何确认零件与我的系统兼容？" : "How do I know if a part is compatible with my system?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": isZh ? "请提供系统型号、当前零件号和应用信息，我们的技术团队会核对兼容性，并在需要时建议替代型号。" : "Our technical team can help verify compatibility. Provide your system model, current part number, and application details. We maintain extensive compatibility databases and can suggest alternatives if needed."
        }
      },
      {
        "@type": "Question",
        "name": isZh ? "支持哪些付款方式？" : "What payment methods do you accept?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": isZh ? "我们支持 PayPal、银行电汇以及 Visa、MasterCard、American Express 等主要信用卡；长期合作客户还可申请账期或采购订单。" : "We accept PayPal, wire transfers, major credit cards (Visa, MasterCard, American Express), and for established customers, we offer terms payments and purchase orders."
        }
      },
      {
        "@type": "Question",
        "name": isZh ? "如何查询订单物流？" : "How do I track my order?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": isZh ? "订单发出后，您会通过电子邮件收到物流信息，也可登录账户实时查看订单状态和运单号。" : "Once your order ships, you will receive tracking information via email. You can also log into your account on our website to view order status and tracking details in real time."
        }
      }
    ]
  };
}
