// Site-wide FAQ shown on /faq. The page and its FAQPage JSON-LD both read this
// list, so the structured data can never claim an answer that is not visible.
export interface FaqEntry {
  question: string;
  answer: string;
}

export const SITE_FAQ_ENTRIES: FaqEntry[] = [
  {
    question: 'What FANUC parts do you stock?',
    answer: 'We stock over 100,000 FANUC parts including PCB boards, I/O modules, servo motors, control units, power supplies, and other automation components. All parts are genuine FANUC or compatible alternatives clearly marked for your convenience.',
  },
  {
    question: 'Do you ship worldwide?',
    answer: 'Yes, we ship FANUC parts worldwide. We offer express shipping options and can deliver to most countries within 3-10 business days. We use DHL, FedEx, and UPS for international shipping.',
  },
  {
    question: 'Are your FANUC parts genuine?',
    answer: 'We supply both genuine FANUC parts and high-quality compatible alternatives. All parts are clearly marked and come with our quality guarantee. Genuine parts include manufacturer documentation and certificates.',
  },
  {
    question: 'What is your warranty policy?',
    answer: 'We offer a comprehensive warranty on all FANUC parts. Genuine parts come with manufacturer warranty (typically 12-24 months), while compatible parts include our 12-month guarantee covering defects and performance issues.',
  },
  {
    question: 'How can I get technical support?',
    answer: 'Our technical support team is available via email at sales@vcocncspare.com or phone. We provide installation guidance, troubleshooting, compatibility assistance, and replacement recommendations.',
  },
  {
    question: 'How do I place an order?',
    answer: 'You can place orders directly on our website, via email, or by phone. We accept PayPal, bank transfers, and major credit cards. For large orders, we offer flexible payment terms for established customers.',
  },
  {
    question: 'Do you offer quantity discounts?',
    answer: 'Yes, we offer competitive quantity discounts for bulk orders. Contact our sales team for custom pricing on large quantities or long-term supply agreements.',
  },
  {
    question: 'How do I know if a part is compatible with my system?',
    answer: 'Our technical team can help verify compatibility. Provide your system model, current part number, and application details. We maintain extensive compatibility databases and can suggest alternatives if needed.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept PayPal, wire transfers, major credit cards (Visa, MasterCard, American Express), and for established customers, we offer terms payments and purchase orders.',
  },
  {
    question: 'How do I track my order?',
    answer: 'Once your order ships, you\'ll receive tracking information via email. You can also log into your account on our website to view order status and tracking details in real-time.',
  },
];
