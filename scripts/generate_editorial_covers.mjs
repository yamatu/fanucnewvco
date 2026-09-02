#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(scriptDirectory, '../frontend/public/images/editorial');

const covers = [
  ['fanuc-servo-diagnostics.svg', 'FIELD GUIDE', 'Servo Alarm', 'Diagnostics', 'servo'],
  ['fanuc-spindle-diagnostics.svg', 'FIELD GUIDE', 'Spindle Alarm', 'Diagnostics', 'drive'],
  ['fanuc-cnc-backup.svg', 'MAINTENANCE GUIDE', 'CNC Backup &', 'Battery Planning', 'backup'],
  ['fanuc-manual-navigation.svg', 'REFERENCE GUIDE', 'Find the Right', 'FANUC Manual', 'manual'],
  ['fanuc-interlock-diagnostics.svg', 'FIELD GUIDE', 'E-Stop & Interlock', 'Diagnostics', 'interlock'],
  ['fanuc-crx-3ia.svg', 'ROBOT UPDATE', 'CRX-3iA', 'Portable Cobot', 'cobot'],
  ['fanuc-r2000e.svg', 'ROBOT UPDATE', 'R-2000/E', 'Next Generation', 'robot'],
  ['fanuc-physical-ai.svg', 'AUTOMATE 2026', 'Physical AI', 'On the Factory Floor', 'vision'],
  ['fanuc-r50ia.svg', 'CONTROLLER UPDATE', 'R-50iA', 'Robot Controller', 'controller'],
  ['fanuc-roboguide-v10.svg', 'SOFTWARE UPDATE', 'ROBOGUIDE V10', 'Simulation Workflow', 'simulation'],
  ['fanuc-m950ia.svg', 'HEAVY ROBOT', 'M-950iA/500', '500 kg Handling', 'heavy'],
  ['fanuc-m800ib.svg', 'PROCESS ROBOT', 'M-800iB/60-20B', 'Precision Cutting', 'laser'],
  ['fanuc-sr3ia-u.svg', 'SCARA UPDATE', 'SR-3iA/U', 'Ceiling-Mount Cell', 'scara'],
  ['fanuc-warehouse.svg', 'LOGISTICS UPDATE', 'Mobile Robotic', 'Order Fulfillment', 'warehouse'],
  ['fanuc-p55.svg', 'PAINT ROBOT', 'P-55/15-21A', 'Finishing Automation', 'paint'],
];

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function graphic(kind) {
  const common = 'fill="none" stroke="#f5c400" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"';
  if (kind === 'servo' || kind === 'drive') {
    return `<g ${common}><rect x="1040" y="238" width="310" height="390" rx="18"/><circle cx="1195" cy="352" r="58"/><path d="M1102 492h186M1102 548h116"/><path d="M1360 320h95v250h-95"/><path d="M1010 690h420"/></g>`;
  }
  if (kind === 'backup') {
    return `<g ${common}><rect x="1050" y="246" width="310" height="360" rx="18"/><path d="M1120 246v110h170V246M1125 495h160"/><circle cx="1205" cy="497" r="88"/><path d="M1205 440v58l44 26"/></g>`;
  }
  if (kind === 'manual') {
    return `<g ${common}><path d="M1032 250h210c64 0 116 52 116 116v292H1148c-64 0-116-52-116-116z"/><path d="M1358 250h-210c-64 0-116 52-116 116M1110 378h168M1110 450h168M1110 522h118"/></g>`;
  }
  if (kind === 'interlock') {
    return `<g ${common}><path d="M1040 610h370M1110 610V470l100-86 98 86v140"/><circle cx="1209" cy="332" r="73"/><path d="M1209 292v50M1209 377h1"/><path d="M1070 252l-40-42M1350 252l40-42"/></g>`;
  }
  if (kind === 'controller') {
    return `<g ${common}><rect x="1020" y="215" width="400" height="470" rx="22"/><rect x="1080" y="285" width="280" height="165" rx="10"/><path d="M1080 520h80M1200 520h80M1320 520h40M1080 585h280"/><circle cx="1333" cy="356" r="18"/></g>`;
  }
  if (kind === 'simulation' || kind === 'vision') {
    return `<g ${common}><rect x="990" y="230" width="470" height="330" rx="20"/><path d="M1100 670h250M1160 560v110M1290 560v110"/><path d="M1080 455l95-105 82 72 105-120"/><circle cx="1175" cy="350" r="22"/><circle cx="1257" cy="422" r="22"/></g>`;
  }
  if (kind === 'warehouse') {
    return `<g ${common}><path d="M1005 345h455M1035 345V650M1430 345V650M1135 345v305M1330 345v305"/><rect x="1062" y="405" width="54" height="72"/><rect x="1235" y="405" width="72" height="72"/><path d="M1050 695h300l48-88h-255z"/><circle cx="1130" cy="705" r="26"/><circle cx="1324" cy="705" r="26"/></g>`;
  }
  if (kind === 'scara') {
    return `<g ${common}><path d="M1050 690h390M1120 690V300h140v104h-80v100h160v-74M1340 430h70v190M1375 620v68"/><circle cx="1190" cy="405" r="28"/><circle cx="1340" cy="430" r="28"/></g>`;
  }
  const tool = kind === 'laser' ? '<path d="M1398 570l42 112M1422 625l48 18"/>' : kind === 'paint' ? '<path d="M1390 545h68M1458 525v75M1480 532l48-22M1480 563h58M1480 594l48 22"/>' : '';
  return `<g ${common}><path d="M1010 690h450M1080 690V535l110-88 105 65 70-132M1190 447l-35-125 115-75 95 133M1365 380l58 86-46 90"/><circle cx="1190" cy="447" r="32"/><circle cx="1365" cy="380" r="32"/><circle cx="1377" cy="556" r="25"/>${tool}</g>`;
}

function renderCover([, eyebrow, lineOne, lineTwo, kind]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(`${lineOne} ${lineTwo}`)}</title>
  <desc id="description">Vibocnc technical editorial cover for ${escapeXml(`${lineOne} ${lineTwo}`)}.</desc>
  <rect width="1600" height="900" fill="#f4f7fa"/>
  <rect x="0" y="0" width="860" height="900" fill="#07182b"/>
  <path d="M860 0h740v900H760c92-148 138-300 138-456C898 280 885 132 860 0z" fill="#0e3153"/>
  <path d="M0 90h860" stroke="#f5c400" stroke-width="12"/>
  <text x="105" y="228" fill="#f5c400" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700">${escapeXml(eyebrow)}</text>
  <text x="105" y="390" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="78" font-weight="700">${escapeXml(lineOne)}</text>
  <text x="105" y="492" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="78" font-weight="700">${escapeXml(lineTwo)}</text>
  <text x="108" y="675" fill="#b9c9d7" font-family="Arial, Helvetica, sans-serif" font-size="29">Industrial automation insight | Vibocnc</text>
  ${graphic(kind)}
  <circle cx="1510" cy="90" r="28" fill="#f5c400"/>
</svg>`;
}

fs.mkdirSync(outputDirectory, { recursive: true });
for (const cover of covers) {
  fs.writeFileSync(path.join(outputDirectory, cover[0]), renderCover(cover));
  console.log(`GENERATED ${cover[0]}`);
}
