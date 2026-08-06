export const COMPANY_FACTS = {
  foundingYear: 2007,
  experienceYears: 15,
  workshopSqm: 3500,
  automationBrands: 20,
} as const;

const LEGACY_COPY_REPLACEMENTS: Array<[string, string]> = [
  [
    'Vibocnc- One-Stop CNC Solution Supplier',
    'Industrial Automation Parts, CNC Spares & Repair Support',
  ],
  [
    'Your Trusted Partner Since 2005',
    'FANUC, Siemens, Mitsubishi, ABB and 20+ automation brands',
  ],
  [
    'Vibocnc established in 2005 in Kunshan, China. We are selling automation components like System unit, Circuit board, PLC, HMI, Inverter, Encoder, Amplifier, Servomotor, Servodrive etc of AB, ABB, Fanuc, Mitsubishi, Siemens and other manufacturers.',
    'Since 2007, Vibocnc has helped maintenance teams source current, legacy and obsolete automation parts, verify models and coordinate inspection, repair evaluation and worldwide delivery.',
  ],
  [
    '5,000sqm Workshop Facility',
    '3,500 sqm Parts Inspection & Service Facility',
  ],
  [
    'Top 3 Fanuc Supplier in China',
    'Organized stock, testing benches and export packing',
  ],
  [
    'Especially Fanuc, We are one of the top three suppliers in China. We now have 27 workers, 10 sales and 100,000 items regularly stocked. Daily parcel around 50-100pcs, yearly turnover around 200 million.',
    'Our Kunshan facility supports organized storage, incoming inspection, functional checks, protective export packing and efficient dispatch for urgent industrial parts orders.',
  ],
  [
    '20+ Years Professional Service',
    '15+ Years Supporting Industrial Maintenance',
  ],
  [
    'More than 18 years experience we have ability to coordinate specific strengths into a whole, providing clients with solutions that consider various import and export transportation options.',
    'Our sales and technical teams coordinate part-number checks, sourcing, testing, repair evaluation and international transport as one practical service.',
  ],
];

export function normalizeLegacyCompanyText(value: unknown): string {
  let text = String(value ?? '');
  for (const [legacy, replacement] of LEGACY_COPY_REPLACEMENTS) {
    text = text.split(legacy).join(replacement);
  }

  return text
    .replace(/\b2005\b/g, String(COMPANY_FACTS.foundingYear))
    .replace(/5,000\s*(?:sqm|m²)?/gi, (match) => {
      if (/sqm/i.test(match)) return '3,500 sqm';
      if (/m²/i.test(match)) return '3,500 m²';
      return '3,500';
    })
    .replace(/\b5000\s*(?:sqm|m²)?/gi, (match) => {
      if (/sqm/i.test(match)) return '3,500 sqm';
      if (/m²/i.test(match)) return '3,500 m²';
      return '3,500';
    })
    .replace(/\b20\+\s*years?/gi, '15+ years')
    .replace(/more than 20 years/gi, 'more than 15 years');
}

export function normalizeCompanyStat<T extends Record<string, unknown>>(stat: T): T {
  const next = { ...stat } as Record<string, unknown>;
  const context = `${String(stat.label || '')} ${String(stat.description || '')}`.toLowerCase();

  next.label = normalizeLegacyCompanyText(stat.label);
  next.description = normalizeLegacyCompanyText(stat.description);

  if (/years? experience|industry experience/.test(context)) {
    next.value = COMPANY_FACTS.experienceYears;
    next.suffix = '+';
    next.description = 'Supporting industrial maintenance teams since 2007';
  } else if (/workshop|facility|square meters|\bsqm\b/.test(context)) {
    next.value = COMPANY_FACTS.workshopSqm;
    next.suffix = ' sqm';
  } else if (/brands?/.test(context)) {
    next.value = COMPANY_FACTS.automationBrands;
    next.suffix = '+';
    next.description = 'FANUC, Siemens, Mitsubishi, ABB and other automation brands';
  }

  return next as T;
}
