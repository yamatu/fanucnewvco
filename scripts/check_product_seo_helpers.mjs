import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('../frontend/node_modules/typescript');

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sourcePath = path.join(repoRoot, 'frontend/src/lib/product-seo.ts');
const source = await fs.readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
}).outputText;
const outputPath = path.join(os.tmpdir(), `vibocnc-product-seo-${process.pid}.mjs`);
await fs.writeFile(outputPath, compiled);

try {
  const seo = await import(`${pathToFileURL(outputPath).href}?v=${Date.now()}`);
  const product = {
    name: 'A06B-6092-H275#H508',
    sku: 'A06B-6092-H275#H508',
    brand: 'FANUC',
    stock_quantity: 2,
    warranty_period: '12 months',
    meta_description: 'FANUC A06B-6092-H275#H508 FANUC Servo Amplifier / Drive for repair and fast.',
    category: { name: 'FANUC Servo Amplifier / Drive' },
  };
  const type = seo.inferProductTypeLabel(product);
  const name = seo.buildSemanticProductName(product);
  const description = seo.buildProductSeoDescription(product);
  const checks = [
    [type === 'Spindle Amplifier Module', `type: ${type}`],
    [name === 'FANUC A06B-6092-H275#H508 Spindle Amplifier Module', `name: ${name}`],
    [description.includes('Spindle Amplifier Module'), `description type: ${description}`],
    [!description.match(/FANUC.*FANUC/), `description brand dedupe: ${description}`],
    [description.length <= 160, `description length: ${description.length}`],
    [/[.!?]$/.test(description), `description ending: ${description}`],
  ];
  const nonFanucProducts = [
    {
      brand: 'Tamagawa', sku: 'AU7684', name: 'Tamagawa AU7684 MEMS inertial sensor unit',
      category: { name: 'Tamagawa Gyros / IMU' }, stock_quantity: 3, warranty_period: '12 months', meta_description: '',
    },
    {
      brand: 'Siemens', sku: '6ES7315-2AG10-0AB0', name: 'Siemens 6ES7315-2AG10-0AB0 CPU module',
      category: { name: 'Siemens PLC CPU Modules' }, stock_quantity: 1, warranty_period: '12 months', meta_description: '',
    },
    {
      brand: 'Mitsubishi', sku: 'MR-J4-70A', name: 'Mitsubishi MR-J4-70A Servo Amplifier',
      category: { name: 'Mitsubishi Servo Amplifiers' }, stock_quantity: 2, warranty_period: '12 months', meta_description: '',
    },
    {
      brand: 'ABB', sku: 'ACS880-01', name: 'ABB ACS880-01 Variable Frequency Drive',
      category: { name: 'ABB Variable Frequency Drives' }, stock_quantity: 1, warranty_period: '12 months', meta_description: '',
    },
    {
      brand: 'Siemens', sku: 'A06B-6092-TEST', name: 'Siemens A06B-6092-TEST Control Module',
      category: { name: 'Siemens Control Modules' }, stock_quantity: 1, warranty_period: '12 months', meta_description: '',
    },
  ];
  for (const sample of nonFanucProducts) {
    const sampleType = seo.inferProductTypeLabel(sample);
    const sampleName = seo.buildSemanticProductName(sample);
    const sampleDescription = seo.buildProductSeoDescription(sample);
    const sampleKeywords = seo.buildProductSeoKeywords(sample);
    checks.push(
      [sampleType === sample.category.name, `${sample.brand} keeps category: ${sampleType}`],
      [sampleName.startsWith(sample.brand), `${sample.brand} keeps brand name: ${sampleName}`],
      [sampleDescription.startsWith(sample.brand), `${sample.brand} keeps description brand: ${sampleDescription}`],
      [sampleKeywords.includes(sample.brand) && !/FANUC/i.test(sampleKeywords), `${sample.brand} keywords stay isolated: ${sampleKeywords}`],
      [!/Spindle Amplifier Module/i.test([sampleType, sampleName, sampleDescription, sampleKeywords].join(' ')), `${sample.brand} avoids FANUC spindle override`],
    );
  }
  const skuOnlyNonFanuc = {
    brand: 'Siemens', sku: '6ES7-TEST', name: '6ES7-TEST',
    category: { name: 'Siemens PLC Modules' }, stock_quantity: 1, warranty_period: '12 months', meta_description: '',
  };
  checks.push([
    seo.buildSemanticProductName(skuOnlyNonFanuc) === 'Siemens 6ES7-TEST PLC Modules',
    `SKU-only non-FANUC name is deduplicated: ${seo.buildSemanticProductName(skuOnlyNonFanuc)}`,
  ]);
  const failed = checks.filter(([passed]) => !passed);
  if (failed.length > 0) {
    for (const [, message] of failed) console.error(`FAIL ${message}`);
    process.exitCode = 1;
  } else {
    for (const [, message] of checks) console.log(`PASS ${message}`);
  }
} finally {
  await fs.unlink(outputPath).catch(() => {});
}
