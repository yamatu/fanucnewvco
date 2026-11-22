import { PAGE_SECTION_KEYS, type EditablePage, type PageField, type PageSchema } from '@/lib/page-content';

const DEFAULT_ABOUT_IMAGE = 'https://s2.loli.net/2025/09/01/G1JcoeXWNTdpIfZ.jpg';

function field(key: string, zh: string, label: string, fallback: string, type: 'text' | 'textarea' = 'text'): PageField {
  return { key, type, zh, en: label, fallback };
}

function image(key: string, zh: string, label: string, fallback = ''): PageField {
  return { key, type: 'image', zh, en: label, fallback };
}

export const ABOUT_PAGE_SCHEMA: PageSchema = {
  page: 'about',
  sectionKey: PAGE_SECTION_KEYS.about,
  path: '/about',
  zh: '关于我们',
  en: 'About page',
  groups: [
    {
      zh: '页面顶部',
      en: 'Hero',
      fields: [
        field('heroTitle', '大标题', 'Title', 'About Vcocnc'),
        field('heroSubtitle', '副标题', 'Subtitle', 'Your trusted one-stop CNC solution supplier since 2007', 'textarea'),
        image('heroImage', '顶部背景图（可选）', 'Background image (optional)'),
      ],
    },
    {
      zh: '公司概况',
      en: 'Company profile',
      fields: [
        field('profileTitle', '标题', 'Title', 'Company Profile'),
        field('profileText1', '第一段', 'Paragraph 1', 'Vcocnc was established in 2007 in Kunshan, China. We supply system units, circuit boards, PLCs, HMIs, inverters, encoders, amplifiers, servo motors and servo drives from AB, ABB, FANUC, Mitsubishi, Siemens and other manufacturers, all handled in our own 3,500 sqm workshop.', 'textarea'),
        field('profileText2', '第二段', 'Paragraph 2', 'We specialize in FANUC and are one of the top three FANUC parts suppliers in China. Our 37 employees, including 10 sales professionals, keep more than 100,000 items regularly stocked. We ship 50-100 parcels daily worldwide, with a yearly turnover of around USD 200 million.', 'textarea'),
        field('profileStat1Value', '数据 1 数值', 'Stat 1 value', '15+'),
        field('profileStat1Label', '数据 1 名称', 'Stat 1 label', 'Years Experience'),
        field('profileStat2Value', '数据 2 数值', 'Stat 2 value', 'Top 3'),
        field('profileStat2Label', '数据 2 名称', 'Stat 2 label', 'FANUC Supplier in China'),
        image('profileImage', '公司图片', 'Company image', DEFAULT_ABOUT_IMAGE),
      ],
    },
    {
      zh: '仓库与库存',
      en: 'Warehouse & items',
      fields: [
        field('facilityTitle', '标题', 'Title', 'Warehouse & Items'),
        field('facilityText', '说明', 'Text', 'Our Kunshan facility supports organized storage, incoming inspection, functional checks, protective export packing and efficient dispatch for urgent industrial parts orders.', 'textarea'),
        field('stat1Value', '数据 1 数值', 'Stat 1 value', '3,500'),
        field('stat1Label', '数据 1 名称', 'Stat 1 label', 'sqm Workshop'),
        field('stat2Value', '数据 2 数值', 'Stat 2 value', '37'),
        field('stat2Label', '数据 2 名称', 'Stat 2 label', 'Total Employees'),
        field('stat3Value', '数据 3 数值', 'Stat 3 value', '100K+'),
        field('stat3Label', '数据 3 名称', 'Stat 3 label', 'Items in Stock'),
        field('stat4Value', '数据 4 数值', 'Stat 4 value', '50-100'),
        field('stat4Label', '数据 4 名称', 'Stat 4 label', 'Daily Parcels'),
      ],
    },
    {
      zh: '专业服务',
      en: 'Services',
      fields: [
        field('servicesTitle', '标题', 'Title', 'Professional Service'),
        field('servicesText', '说明', 'Text', 'We have a professional team to provide services including sales, testing and maintenance', 'textarea'),
        field('service1Title', '服务 1 标题', 'Service 1 title', 'Sales Service'),
        field('service1Text', '服务 1 说明', 'Service 1 text', 'Professional sales team with deep knowledge of automation components to help you find the right solutions.', 'textarea'),
        field('service2Title', '服务 2 标题', 'Service 2 title', 'Testing Service'),
        field('service2Text', '服务 2 说明', 'Service 2 text', 'Comprehensive testing procedures ensure all components meet quality standards before delivery.', 'textarea'),
        field('service3Title', '服务 3 标题', 'Service 3 title', 'Maintenance Service'),
        field('service3Text', '服务 3 说明', 'Service 3 text', 'Expert maintenance and repair services to keep your automation systems running at peak performance.', 'textarea'),
      ],
    },
    {
      zh: '经验与信任',
      en: 'Experience',
      fields: [
        field('experienceTitle', '标题', 'Title', '15+ Years of Excellence'),
        field('experienceText', '说明', 'Text', 'With more than 15 years of experience, our sales and technical teams coordinate part-number checks, sourcing, testing, repair evaluation and international shipping as one service.', 'textarea'),
        field('trustTitle', '信任标题', 'Trust title', 'Trusted Partner'),
        field('trustText', '信任说明', 'Trust text', 'Reliable solutions worldwide'),
        image('experienceImage', '车间图片', 'Workshop image', DEFAULT_ABOUT_IMAGE),
      ],
    },
  ],
};

export const CONTACT_PAGE_SCHEMA: PageSchema = {
  page: 'contact',
  sectionKey: PAGE_SECTION_KEYS.contact,
  path: '/contact',
  zh: '联系我们',
  en: 'Contact page',
  groups: [
    {
      zh: '页面顶部',
      en: 'Hero',
      fields: [
        field('heroTitle', '大标题', 'Title', 'Contact Us'),
        field('heroText', '介绍文字', 'Intro text', 'Get in touch with our expert team for all your automation needs', 'textarea'),
        image('heroImage', '顶部背景图（可选）', 'Background image (optional)'),
      ],
    },
    {
      zh: '联系方式',
      en: 'Contact details',
      fields: [
        field('infoTitle', '区块标题', 'Section title', 'Get in Touch'),
        field('address', '地址', 'Address', 'Kunshan, Jiangsu Province\nChina', 'textarea'),
        field('phone', '电话', 'Phone', '+86 13348028050'),
        field('email', '邮箱', 'Email', 'sales@vcocncspare.com'),
        field('hours', '营业时间', 'Business hours', 'Monday - Friday: 8:00 AM - 6:00 PM\nSaturday: 9:00 AM - 5:00 PM\nSunday: Closed', 'textarea'),
        field('facility', '设施', 'Facility', '3,500 sqm Workshop'),
        field('serviceArea', '服务范围', 'Service area', 'Worldwide Shipping'),
      ],
    },
    {
      zh: '留言表单',
      en: 'Message form',
      fields: [field('formTitle', '表单标题', 'Form title', 'Send us a Message')],
    },
    {
      zh: '选择我们的理由',
      en: 'Why choose us',
      fields: [
        field('whyTitle', '标题', 'Title', 'Why Choose Vcocnc?'),
        field('why1Title', '理由 1 标题', 'Reason 1 title', 'Fast Response'),
        field('why1Text', '理由 1 说明', 'Reason 1 text', 'Quick response time with professional technical support and quotations within 24 hours.', 'textarea'),
        field('why2Title', '理由 2 标题', 'Reason 2 title', 'Large Inventory'),
        field('why2Text', '理由 2 说明', 'Reason 2 text', '100,000+ items in stock with daily shipments of 50-100 parcels worldwide.', 'textarea'),
        field('why3Title', '理由 3 标题', 'Reason 3 title', 'Global Shipping'),
        field('why3Text', '理由 3 说明', 'Reason 3 text', 'Worldwide shipping with various transportation options to meet your delivery needs.', 'textarea'),
      ],
    },
  ],
};

export const PAGE_SCHEMAS: Record<EditablePage, PageSchema> = {
  about: ABOUT_PAGE_SCHEMA,
  contact: CONTACT_PAGE_SCHEMA,
};
