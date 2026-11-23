import type { Category, CategoryNavigationNode, Product } from '@/types';
import { toProductPathId } from '@/lib/utils';
import { buildSemanticProductName } from '@/lib/product-seo';
import {
  DEFAULT_LEAD_TIME,
  DEFAULT_WARRANTY_PERIOD,
  IN_STOCK_HANDLING_TEXT,
  SALES_EMAIL,
  WARRANTY_COVERAGE_TEXT,
} from '@/lib/product-content';

export interface CategoryGeoFaqItem {
  question: string;
  answer: string;
}

export interface CategoryFeaturedPart {
  sku: string;
  name: string;
  href: string;
}

export interface CategorySelectionCheck {
  title: string;
  detail: string;
}

export interface VcocncCategoryGeoGuide {
  equipmentLabel: string;
  catalogSummary: string;
  seriesPrefixes: string[];
  featuredParts: CategoryFeaturedPart[];
  selectionChecks: CategorySelectionCheck[];
  serviceFacts: Array<{ label: string; value: string }>;
  faqEntries: CategoryGeoFaqItem[];
}

interface EquipmentProfile {
  label: string;
  checks: CategorySelectionCheck[];
  compatibilityAnswer: (displayName: string, brandName: string) => string;
}

function classifyEquipmentFamily(category: Category, displayName: string): EquipmentProfile {
  const signal = `${category.name || ''} ${category.slug || ''} ${category.path || ''} ${displayName}`.toLowerCase();

  if (/spindle.*(drive|amp)|spindle-amplifier/.test(signal)) {
    return {
      label: 'Spindle Amplifiers & Drives',
      checks: [
        {
          title: 'Exact Drive Code & Option Suffix',
          detail: 'Match the full model string including revision and option suffixes (such as #H500 or #H508) to keep control firmware and bus interface aligned.',
        },
        {
          title: 'Spindle Rating & DC Link Bus',
          detail: 'Verify input power bus architecture (standalone AC vs. common DC-link alpha/beta module) and continuous output current rating against the failed drive.',
        },
        {
          title: 'Control PCB & Feedback Port',
          detail: 'Check whether the replacement requires transferring machine-specific control boards, fiber-optic links, or spindle sensor interface cards.',
        },
        {
          title: 'Pre-Swap Fault Inspection',
          detail: 'Inspect motor winding insulation and regenerative braking resistors before powering on a replacement spindle amplifier to prevent repeat IGBT faults.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Confirm the complete ${name} model code including any trailing suffix, input bus voltage, and matched control card revision. Share a photo of the original nameplate and any CNC spindle alarm codes with ${SALES_EMAIL} for pre-shipment verification.`,
    };
  }

  if (/servo.*(drive|amp)|melservo|indradrive|sinamics|simodrive/.test(signal)) {
    return {
      label: 'Servo Amplifiers & Motion Drives',
      checks: [
        {
          title: 'Full Part Number & Axis Channels',
          detail: 'Confirm single-, dual-, or triple-axis channel layout and exact trailing suffix so axis current limits match the machine builder specification.',
        },
        {
          title: 'Command & Feedback Interface',
          detail: 'Verify analog, pulse, optical FSSB, SSCNET, SERCOS, or fieldbus interface compatibility with the host CNC or motion controller.',
        },
        {
          title: 'Power Supply & Bus Pairing',
          detail: 'Ensure DC-link voltage class (200V / 400V) and matching power supply module or internal brake circuit ratings align with the cabinet wiring.',
        },
        {
          title: 'Parameter & Motor Check',
          detail: 'Back up existing servo parameters and test motor insulation resistance before installing a replacement amplifier to avoid re-damaging output stages.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Match the exact ${name} catalog number, suffix, axis channel configuration, and command bus (such as FSSB, SSCNET, or fieldbus). Email the original drive label and axis alarm code to ${SALES_EMAIL} so our technicians can verify drop-in fit.`,
    };
  }

  if (/(spindle|servo).?motor|hk-st|melservo-(hc|hf|hg)/.test(signal)) {
    return {
      label: 'Servo & Spindle Motors',
      checks: [
        {
          title: 'Encoder & Pulsecoder Suffix',
          detail: 'Confirm incremental vs. absolute encoder type, resolution, and connector orientation—the trailing digits often dictate feedback compatibility.',
        },
        {
          title: 'Flange, Shaft & Holding Brake',
          detail: 'Verify mounting flange bolt circle, straight vs. tapered/keyed shaft dimensions, oil seal, and whether a 24V/90V holding brake is installed.',
        },
        {
          title: 'Voltage, Torque & Speed Rating',
          detail: 'Cross-check nameplate rated torque, RPM, and winding voltage with the existing servo or spindle amplifier to prevent overcurrent trips.',
        },
        {
          title: 'Cable & Connector Orientation',
          detail: 'Confirm power, brake, and feedback receptacle styles (MS military connector vs. metric plug) before mounting on the machine axis.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Verify the full ${name} part number, encoder/pulsecoder feedback code, shaft style, flange size, and holding-brake option from the motor nameplate. Send the nameplate photo to ${SALES_EMAIL} if you need help confirming exact swap compatibility.`,
    };
  }

  if (/pcb|board|motherboard|mainboard|backplane|card/.test(signal)) {
    return {
      label: 'Control Boards & Electronic PCBs',
      checks: [
        {
          title: 'Board Number & Revision Level',
          detail: 'Match the full board identifier (such as A16B/A20B or OEM order code) and check hardware revision letters stamped on the PCB edge.',
        },
        {
          title: 'Sub-Modules, EPROMs & Jumpers',
          detail: 'Document jumper settings, DIP switches, and removable FROM/SRAM or option daughterboards that may need to be transferred from the failed board.',
        },
        {
          title: 'Controller Generation & Slot',
          detail: 'Confirm the CNC or PLC rack generation and slot position so bus pinout and backplane power rails match.',
        },
        {
          title: 'ESD Handling & Data Backup',
          detail: 'Back up machine parameters, PMC ladder logic, and offsets before swapping control boards, and use grounded ESD protection during installation.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Verify the complete ${name} PCB part number, hardware revision stamp, and host controller series. For CNC mainboards or option cards, email a clear photo of both sides of the board to ${SALES_EMAIL} so we confirm revision and daughterboard layout before shipping.`,
    };
  }

  if (/power.?supply|psu|rectifier|converter/.test(signal)) {
    return {
      label: 'Industrial Power Supplies',
      checks: [
        {
          title: 'Input Phase & Voltage Range',
          detail: 'Confirm single-phase or three-phase AC input range (100–240VAC / 380–480VAC) or DC bus input requirements.',
        },
        {
          title: 'Output Rails & Current Capacity',
          detail: 'Check rated DC output voltages (+24V, +5V, ±15V, or DC-link bus power) and continuous wattage under peak machine load.',
        },
        {
          title: 'Form Factor & Backplane Fit',
          detail: 'Verify DIN-rail vs. rack/chassis mounting, terminal block pinout, and cooling airflow clearance inside the control cabinet.',
        },
        {
          title: 'Upstream Protection Check',
          detail: 'Inspect cabinet fuses, input contactors, and shorted downstream rails before energizing a replacement power unit.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Check the full ${name} part number, input phase/voltage range, output rail ratings, and mounting form factor (rack slot vs. DIN rail). Send your original unit label to ${SALES_EMAIL} if you are checking a revision cross-reference.`,
    };
  }

  if (/plc|melsec|s7-|simatic|controllogix|compactlogix|slc|fx-series|a-series|cnc-system|controller|cpu/.test(signal)) {
    return {
      label: 'PLC & CNC Control Units',
      checks: [
        {
          title: 'Order Code & Firmware Generation',
          detail: 'Match the full CPU or controller order code and firmware series so existing ladder, motion, or CNC programs load without recompilation.',
        },
        {
          title: 'Memory & Communication Ports',
          detail: 'Confirm onboard memory capacity, memory card type, and built-in Ethernet, Profibus, Profinet, or serial ports.',
        },
        {
          title: 'Rack, Baseplate & Power Compatibility',
          detail: 'Verify chassis/backplane compatibility and total backplane current draw across attached I/O and communication modules.',
        },
        {
          title: 'Program & Parameter Retention',
          detail: 'Archive the active PLC/CNC program, IP/node addresses, and battery-backed registers prior to replacing the controller.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Confirm the exact ${name} catalog order number, firmware series, communication port layout, and rack/baseplate model. Share your controller label or system configuration with ${SALES_EMAIL} for pre-shipment verification.`,
    };
  }

  if (/hmi|got1000|got2000|operator.?panel|mdi|display|monitor|lcd|touch|pendant/.test(signal)) {
    return {
      label: 'Operator Panels, HMIs & Displays',
      checks: [
        {
          title: 'Screen Size, Cutout & Key Layout',
          detail: 'Verify panel cutout dimensions, monochrome/color LCD type, touchscreen overlay, and MDI or membrane keypad layout.',
        },
        {
          title: 'Signal & Communication Interface',
          detail: 'Check video connector (RGB, LVDS, fiber) or HMI ports (RS-232/422/485, Ethernet, Profibus) and supply voltage (24VDC vs. AC).',
        },
        {
          title: 'Project & Screen File Transfer',
          detail: 'Confirm whether runtime HMI screens are stored on removable CF/SD media or require upload from the existing terminal before swap.',
        },
        {
          title: 'Backlight & Seal Condition',
          detail: 'Inspect panel gasket integrity to keep coolant mist and workshop dust out of the replacement display assembly.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Match the exact ${name} model code, screen size, rear connector pinout, and 24VDC/AC power specification. Email the rear nameplate photo to ${SALES_EMAIL} so we verify panel cutout and signal compatibility.`,
    };
  }

  if (/encoder|resolver|synchro|feedback|pulsecoder/.test(signal)) {
    return {
      label: 'Encoders, Resolvers & Feedback Units',
      checks: [
        {
          title: 'Signal Type & Resolution',
          detail: 'Confirm incremental TTL/HTL, sinusoidal 1Vpp, serial absolute, or brushless resolver output along with exact PPR/bit resolution.',
        },
        {
          title: 'Shaft Bore, Coupling & Flange',
          detail: 'Verify hollow-shaft vs. solid-shaft diameter, taper, mounting flange pattern, and anti-rotation spring tether.',
        },
        {
          title: 'Supply Voltage & Connector Pinout',
          detail: 'Match 5VDC or 10–30VDC supply rating and cable exit or circular connector pin assignment.',
        },
        {
          title: 'Zero-Point & Alignment Setup',
          detail: 'Plan for reference-return or commutation alignment after installing a replacement servo or spindle feedback sensor.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Confirm the complete ${name} part number, output protocol (incremental, serial absolute, or resolver), PPR/resolution, and shaft/flange dimensions. Send a photo of the encoder label to ${SALES_EMAIL} before ordering.`,
    };
  }

  if (/i[-/ ]?o|input|output|analog|digital.*module|network|router|gateway|comm/.test(signal)) {
    return {
      label: 'I/O & Industrial Communication Modules',
      checks: [
        {
          title: 'Channel Count & Signal Polarity',
          detail: 'Confirm sink/source (NPN/PNP) digital logic, 24VDC vs. AC relay outputs, or analog voltage/current channel ranges.',
        },
        {
          title: 'Bus Protocol & Addressing',
          detail: 'Verify rack bus or remote fieldbus protocol (I/O Link, Profibus, Profinet, Ethernet/IP, DeviceNet, CC-Link) and firmware revision.',
        },
        {
          title: 'Terminal Block & Wiring Fit',
          detail: 'Check whether the module uses removable screw/spring terminal blocks or ribbon connectors matching existing cabinet harnesses.',
        },
        {
          title: 'Power & Isolation Ratings',
          detail: 'Verify external field power supply requirements and per-channel current limits before reconnecting actuators.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Verify the exact ${name} order number, channel count, signal type (sink/source digital or analog range), and host PLC/CNC bus protocol. Send the module label to ${SALES_EMAIL} for quick compatibility confirmation.`,
    };
  }

  if (/vfd|inverter|freqrol|frequency.?drive|ac.?drive|variable.?frequency/.test(signal)) {
    return {
      label: 'Variable Frequency Drives & Inverters',
      checks: [
        {
          title: 'Power Rating (kW / HP) & Voltage',
          detail: 'Match single- or three-phase supply voltage (200V / 400V / 480V) and rated motor output current for normal or heavy duty.',
        },
        {
          title: 'Installed Option Cards',
          detail: 'Check for fieldbus communication cards, encoder feedback cards, or external braking units attached to the existing inverter.',
        },
        {
          title: 'Parameter Set Migration',
          detail: 'Record motor nameplate data, acceleration/deceleration ramps, and I/O terminal assignments before swapping the drive.',
        },
        {
          title: 'Enclosure & Cooling Clearance',
          detail: 'Verify physical footprint, mounting holes, and vertical airflow spacing inside the electrical panel.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Match the complete ${name} catalog code including voltage class, kW/HP rating, and any installed option cards. Share the inverter nameplate with ${SALES_EMAIL} to verify direct replacement or successor model fit.`,
    };
  }

  if (/sensor|photoelectric|inductive|proximity|lidar|curtain|safety|vision|scanner|rfid/.test(signal)) {
    return {
      label: 'Industrial Sensors & Machine Safety Devices',
      checks: [
        {
          title: 'Sensing Principle & Range',
          detail: 'Confirm optical/inductive/capacitive/ultrasonic sensing mode, operating distance, and flush vs. non-flush mounting.',
        },
        {
          title: 'Output Logic & Safety Rating',
          detail: 'Match PNP/NPN, NO/NC, analog, IO-Link, or OSSD dual-channel safety outputs with the machine PLC or safety relay.',
        },
        {
          title: 'Connector & Housing Format',
          detail: 'Verify thread barrel size (M8/M12/M18/M30), rectangular housing dimensions, and M8/M12 plug vs. pre-wired cable.',
        },
        {
          title: 'Environmental Protection',
          detail: 'Confirm IP rating and ambient temperature/coolant resistance for washdown or machining-center zones.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Confirm the exact ${name} part number, sensing distance, output type (PNP/NPN, analog, or OSSD safety), and connector format. Email the sensor label to ${SALES_EMAIL} if you need a verified replacement match.`,
    };
  }

  if (/battery|cable|connector|memory|storage/.test(signal)) {
    return {
      label: 'Batteries, Memory & Interconnect Components',
      checks: [
        {
          title: 'Exact OEM Part Code & Plug Keying',
          detail: 'Match connector pin count, polarization key, and cable length so signals and backup power mate securely without adapters.',
        },
        {
          title: 'Voltage, Chemistry & Capacity',
          detail: 'For CNC/PLC backup batteries, confirm nominal voltage (e.g., 3V/3.6V/6V lithium), chemistry, and lead polarity before swapping.',
        },
        {
          title: 'Live-Power Backup Procedure',
          detail: 'On CNC controllers and servo amplifiers, replace backup batteries with control power ON (per OEM manual) to avoid losing SRAM or axis zero points.',
        },
        {
          title: 'Shielding & Flex Rating',
          detail: 'Verify high-flex robot/drag-chain jacket ratings and EMI braid shielding for encoder and motor feedback harnesses.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Verify the exact ${name} part number, connector plug type, voltage/polarity (for batteries), or cable length and pinout. Send a photo of the original label or plug to ${SALES_EMAIL} for confirmation prior to dispatch.`,
    };
  }

  if (/breaker|contactor|relay|switchgear|fuse|valve|cylinder|pneumatic|hydraulic|pump/.test(signal)) {
    return {
      label: 'Switchgear & Fluid Power Control Components',
      checks: [
        {
          title: 'Electrical Coil or Rating Match',
          detail: 'Confirm operating coil voltage (24VDC / 110VAC / 230VAC), pole count, trip curve, or current/pressure rating from the nameplate.',
        },
        {
          title: 'Mechanical Mounting & Porting',
          detail: 'Check DIN-rail/panel footprint, auxiliary contact blocks, or hydraulic/pneumatic port thread and subplate ISO interface.',
        },
        {
          title: 'Auxiliary & Feedback Options',
          detail: 'Verify integrated auxiliary contacts, manual override, LED surge suppressors, or spool position feedback switches.',
        },
        {
          title: 'System Isolation Check',
          detail: 'Lock out electrical power or bleed hydraulic/pneumatic line pressure completely before removing the failed component.',
        },
      ],
      compatibilityAnswer: (name) =>
        `Match the exact ${name} part number, coil/operating voltage, current or pressure rating, and mounting/port interface. Share the nameplate with ${SALES_EMAIL} and we will verify the replacement spec before shipping.`,
    };
  }

  return {
    label: 'CNC & Industrial Automation Replacement Parts',
    checks: [
      {
        title: 'Complete Manufacturer Part Number',
        detail: 'Verify the full OEM order code including prefixes, dash numbers, and trailing revision suffixes stamped on the original component.',
      },
      {
        title: 'Electrical & Interface Ratings',
        detail: 'Confirm supply voltage, current rating, communication bus, and connector pinout against the machine electrical schematic.',
      },
      {
        title: 'Hardware & Firmware Revision',
        detail: 'Check whether the host CNC, PLC, or robot controller requires a specific hardware revision or parameter transfer.',
      },
      {
        title: 'Alarm & Failure Context',
        detail: 'Inspect related cables, fuses, and power rails before installing a replacement module to prevent repeat faults during restart.',
      },
    ],
    compatibilityAnswer: (name, brandName) =>
      `Match the exact ${brandName} part number, suffix, and hardware revision printed on your original unit. Email a photo of the part label, controller model, or machine alarm code to ${SALES_EMAIL} so our technicians verify ${name} compatibility before shipment.`,
  };
}

function extractSeriesPrefix(sku: string): string | null {
  const cleaned = String(sku || '').trim().toUpperCase();
  if (!cleaned || cleaned.length < 4 || cleaned.length > 36) return null;
  if (/^\d{1,4}$/.test(cleaned)) return null;

  // FANUC style: A06B-6077-H106 -> A06B-6077
  const fanucMatch = cleaned.match(/^(A\d{2}[A-Z]-\d{4})\b/);
  if (fanucMatch) return fanucMatch[1];

  // Hyphenated industrial series: MR-J4-40A -> MR-J4, 6ES7-315 -> 6ES7-315, 1756-L71 -> 1756
  const parts = cleaned.split(/[-/_ ]+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const second = parts[1];
    if (first.length >= 2 && first.length <= 4 && second.length >= 2 && second.length <= 4 && /[A-Z]/.test(first + second)) {
      return `${first}-${second}`;
    }
    if (first.length >= 4 && first.length <= 10 && /[A-Z]/.test(first) && /\d/.test(first)) {
      return first;
    }
  }

  // Alpha prefix + digits like APCRBC105 -> APCRBC, 6ES7315 -> 6ES7
  const siemensMatch = cleaned.match(/^(6[A-Z]{2}\d)/);
  if (siemensMatch) return siemensMatch[1];

  const alphaNum = cleaned.match(/^([A-Z]{2,6}\d{1,3})/);
  if (alphaNum && alphaNum[1].length >= 4) return alphaNum[1];

  return null;
}

function extractFeaturedParts(products: readonly Product[]): {
  seriesPrefixes: string[];
  featuredParts: CategoryFeaturedPart[];
} {
  const prefixes: string[] = [];
  const prefixSet = new Set<string>();
  const featured: CategoryFeaturedPart[] = [];
  const seenSkus = new Set<string>();
  const usedFeaturedPrefix = new Set<string>();

  for (const product of products) {
    const sku = String(product.sku || '').trim();
    if (!sku || seenSkus.has(sku.toUpperCase())) continue;
    seenSkus.add(sku.toUpperCase());

    const prefix = extractSeriesPrefix(sku);
    if (prefix && !prefixSet.has(prefix) && prefixes.length < 6) {
      prefixSet.add(prefix);
      prefixes.push(prefix);
    }

    if (featured.length < 6) {
      const key = prefix || sku.slice(0, 6).toUpperCase();
      if (!usedFeaturedPrefix.has(key) || products.length <= 6) {
        usedFeaturedPrefix.add(key);
        featured.push({
          sku,
          name: buildSemanticProductName(product) || product.name || sku,
          href: `/products/${toProductPathId(sku)}`,
        });
      }
    }
  }

  // Fill up to 6 featured parts if deduplicating by prefix left fewer than 6
  if (featured.length < 6) {
    const featuredSkus = new Set(featured.map((item) => item.sku.toUpperCase()));
    for (const product of products) {
      if (featured.length >= 6) break;
      const sku = String(product.sku || '').trim();
      if (!sku || featuredSkus.has(sku.toUpperCase())) continue;
      featuredSkus.add(sku.toUpperCase());
      featured.push({
        sku,
        name: buildSemanticProductName(product) || product.name || sku,
        href: `/products/${toProductPathId(sku)}`,
      });
    }
  }

  return { seriesPrefixes: prefixes, featuredParts: featured };
}

export function buildVcocncCategoryGeoGuide(input: {
  category: Category;
  displayName: string;
  brandName: string;
  productCount: number;
  subcategories: readonly CategoryNavigationNode[];
  sampleProducts: readonly Product[];
}): VcocncCategoryGeoGuide {
  const { category, displayName, brandName, productCount, subcategories, sampleProducts } = input;
  const profile = classifyEquipmentFamily(category, displayName);
  const { seriesPrefixes, featuredParts } = extractFeaturedParts(sampleProducts);
  const topSubNames = subcategories.slice(0, 5).map((sub) => sub.name).filter(Boolean);
  const sampleSkuList = featuredParts.slice(0, 4).map((part) => part.sku);
  const formattedCount = productCount.toLocaleString('en-US');

  let catalogSummary = `This Vcocnc catalog lists ${formattedCount} active ${displayName} part number${productCount === 1 ? '' : 's'} for CNC repair, machine maintenance, and industrial automation replacement.`;
  if (topSubNames.length > 0) {
    catalogSummary += ` Active sub-lines include ${topSubNames.join(', ')}.`;
  } else if (seriesPrefixes.length > 0) {
    catalogSummary += ` Representative part series listed on this page include ${seriesPrefixes.join(', ')}.`;
  } else if (sampleSkuList.length > 0) {
    catalogSummary += ` Listed part numbers include ${sampleSkuList.join(', ')}.`;
  }

  const coverageAnswer = (() => {
    const parts: string[] = [
      `Vcocnc currently lists ${formattedCount} active ${displayName} SKU${productCount === 1 ? '' : 's'} spanning current-production and legacy replacement units.`,
    ];
    if (topSubNames.length > 0) {
      parts.push(`Key product groups include ${topSubNames.join(', ')}.`);
    }
    if (sampleSkuList.length > 0) {
      parts.push(`Examples available in this section include ${sampleSkuList.join(', ')}.`);
    }
    return parts.join(' ');
  })();

  const faqEntries: CategoryGeoFaqItem[] = [
    {
      question: `Which ${displayName} models and series are covered at Vcocnc?`,
      answer: coverageAnswer,
    },
    {
      question: `How do I verify exact replacement compatibility for ${displayName}?`,
      answer: profile.compatibilityAnswer(displayName, brandName),
    },
    {
      question: `Are ${displayName} bench-checked before shipping and what warranty applies?`,
      answer: `Every ${displayName} order undergoes pre-shipment functional inspection and carries a ${DEFAULT_WARRANTY_PERIOD} warranty unless specified otherwise on the product page. ${WARRANTY_COVERAGE_TEXT}`,
    },
    {
      question: `How fast can Vcocnc dispatch urgent ${displayName} orders?`,
      answer: `In-stock ${displayName} parts dispatch within ${IN_STOCK_HANDLING_TEXT} with international tracking, while sourced or made-to-order units typically ship within ${DEFAULT_LEAD_TIME}. Contact ${SALES_EMAIL} for urgent downtime sourcing or repair evaluation.`,
    },
  ];

  return {
    equipmentLabel: profile.label,
    catalogSummary,
    seriesPrefixes,
    featuredParts,
    selectionChecks: profile.checks,
    serviceFacts: [
      { label: 'Active Catalog Coverage', value: `${formattedCount} listed SKUs` },
      { label: 'Equipment Focus', value: profile.label },
      { label: 'Warranty Coverage', value: `${DEFAULT_WARRANTY_PERIOD} standard warranty` },
      { label: 'Dispatch & Lead Time', value: `In-stock ${IN_STOCK_HANDLING_TEXT} · Sourced ${DEFAULT_LEAD_TIME}` },
    ],
    faqEntries,
  };
}
