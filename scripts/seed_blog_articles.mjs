#!/usr/bin/env node

/**
 * Publish the long-form brand selection guides through the same admin API used
 * by the dashboard. The script is idempotent: running it again updates the
 * matching slug instead of creating duplicate URLs.
 */

import fs from 'node:fs';
import process from 'node:process';

const articles = [
  {
    title: 'How to Choose FANUC CNC Parts: A Practical Compatibility Guide',
    slug: 'fanuc-cnc-parts-selection-guide',
    summary: 'A field guide to selecting FANUC CNC parts by series, part number, interfaces, revision, condition and service risk.',
    featuredImage: '/images/blog/fanuc-selection-guide.svg',
    metaTitle: 'How to Choose FANUC CNC Parts | Vibocnc Guide',
    metaDescription: 'Learn how to choose FANUC CNC parts by series, exact part number, connector, revision, condition and test evidence before ordering.',
    metaKeywords: 'FANUC CNC parts selection, FANUC replacement parts, CNC control board, FANUC compatibility, industrial automation parts',
    isFeatured: true,
    sortOrder: 60,
    content: String.raw`# How to Choose FANUC CNC Parts: A Practical Compatibility Guide

Replacing a FANUC control, I/O board, servo amplifier or power unit is not a simple brand-name purchase. A visually similar part can belong to a different CNC generation, use a different firmware family or require a different harness. The safest buying decision starts with the machine data, not with a marketplace photo.

## 1. Start with the complete identity of the machine

Record the CNC series, control generation, machine builder, axis count and the alarm or failure symptom. FANUC 0i, 16i, 18i, 21i, 30i and 31i families can look similar while using different options and interfaces. The same machine may also contain parts from several generations after a retrofit.

Take clear photos of the rating label, connector side, mounting points and the cabinet wiring. Write down the exact part number, including suffixes and revision letters. Do not shorten a number because the last characters often identify voltage, axis capacity, software option or a hardware revision.

If you need help building a replacement shortlist, compare the data on [Vibocnc products](/products) and browse the relevant [automation categories](/categories) before contacting a supplier.

## 2. Match the part number and the electrical envelope

For a control board, compare connector locations, backplane position, memory or battery arrangement and the supported I/O network. For a servo amplifier, compare input voltage, rated output, number of controlled axes and motor family. For a power supply, check input phase, output rails, protection requirements and the machine's upstream breaker.

The electrical envelope matters even when two units share a prefix. A lower-capacity amplifier can trip under acceleration, while a higher-capacity unit may not be a valid replacement if the motor feedback or parameter set is different. Ask for the seller's compatibility notes and the test scope rather than relying on the phrase "plug and play."

## 3. Treat revisions and software as part of the part

The hardware number is only one part of compatibility. Check boot or system software, option files, PMC parameters, axis cards and memory media. When a board is replaced, a machine may need parameter backup, memory restoration or an option check before it can return to production.

Before removing a working unit, back up CNC parameters, PMC data, pitch error data, tool offsets and custom macro variables. Label every connector and keep the old board until the replacement has passed a controlled test. This turns a difficult recovery into a reversible maintenance step.

## 4. Choose condition by risk, not by the lowest price

New-old-stock, refurbished and used units can all be appropriate, but they carry different evidence requirements. A refurbished board should have a documented inspection, cleaning, component replacement policy and functional test. A used unit should have a clear source, readable labels and an honest description of what was tested.

Ask these questions before purchase:

- Is the exact part number and revision shown in the photos?
- Was the unit tested under load or only powered on?
- Are connectors, fans, batteries and terminal blocks included?
- What warranty period and return process apply?
- What is the expected dispatch time if the first unit fails inspection?

Vibocnc can review a failed unit through a [repair evaluation request](/repair-request), and the team can compare repair, tested replacement and legacy sourcing options.

## 5. Verify the receiving inspection

Inspect the package for impact or moisture damage. Photograph the label before installation. Compare the connector keying and mounting hardware with the original, then check insulation, fan condition, battery date and visible corrosion. Use the machine builder's procedures for grounding and electrostatic handling.

After installation, restore only the backed-up data that belongs to the machine. Run a dry cycle, check alarms and feedback, then test low-risk motion before returning to production. Record the replacement part number, revision, parameters restored and final test result for the next technician.

## A short buying checklist

1. Capture the machine, CNC series and exact part number.
2. Match voltage, axis capacity, connectors, feedback and revision.
3. Confirm software, parameters and option dependencies.
4. Select new, refurbished or used condition based on production risk.
5. Require a written test scope, warranty and lead time.
6. Document receiving inspection and commissioning results.

For a second opinion, read our [FANUC servo amplifier selection guide](/blog/fanuc-servo-amplifier-selection-guide), or send the label and failure details through [Contact Vibocnc](/contact).`,
  },
  {
    title: 'How to Choose a FANUC Servo Amplifier for Repair or Retrofit',
    slug: 'fanuc-servo-amplifier-selection-guide',
    summary: 'A practical FANUC servo amplifier checklist covering axis capacity, motor feedback, cabinet power, alarms and commissioning.',
    featuredImage: '/images/blog/fanuc-selection-guide.svg',
    metaTitle: 'FANUC Servo Amplifier Selection Guide | Vibocnc',
    metaDescription: 'Choose a FANUC servo amplifier with the right axis capacity, voltage, motor feedback, connectors and test evidence for your CNC repair.',
    metaKeywords: 'FANUC servo amplifier selection, FANUC servo drive repair, CNC amplifier replacement, alpha i, beta i, servo alarm',
    isFeatured: false,
    sortOrder: 59,
    content: String.raw`# How to Choose a FANUC Servo Amplifier for Repair or Retrofit

When a CNC axis stops with a servo alarm, the amplifier is often blamed first. It may be the cause, but an encoder cable, motor, brake, power bus or parameter error can create the same symptom. Choosing a replacement correctly means treating the amplifier as one part of a motion system.

## Capture the axis evidence before you order

Write down the alarm number, the affected axis, when the alarm appears and whether it changes after a cold start. Record whether the axis can be jogged, whether the amplifier display shows a code and whether the fault follows the motor or stays with the amplifier.

Photograph the amplifier label, the terminal block, the power bus and the motor cable. Note the CNC series, the number of axes in the cabinet and whether the system uses a separate spindle drive. These details distinguish a single-axis unit from a multi-axis module and help prevent a capacity mismatch.

Use [Vibocnc's product catalog](/products) to compare available automation parts, then send the evidence for a [repair evaluation](/repair-request) if the failure is not conclusive.

## Match the amplifier to the motor and load

Check input voltage, continuous and peak current, axis count, motor family, encoder type and brake requirements. The rated current must cover acceleration and cutting loads, not only the motor nameplate's average value. A retrofit with a larger motor may also require a different power supply, bus configuration or cabinet cooling plan.

Feedback compatibility is just as important as power. Serial encoders, pulse coders and older feedback systems do not share the same wiring or parameter setup. Confirm the connector pinout and cable type instead of assuming that a similar housing is electrically equivalent.

## Check the control generation and revision

FANUC amplifier families are tied to specific CNC generations and parameter conventions. Compare the exact part number, revision, connector arrangement, option support and software assumptions. A suffix can identify voltage or axis capacity, so a shortened number is not enough for a safe quote.

Ask whether the candidate was previously used in a matching CNC family. Request photos of the label and a written list of tests. If a used amplifier is offered without a known test scope, price the uncertainty: an unverified unit may require another shutdown and a second shipping cycle.

## Decide between repair and replacement

Repair can be the better option when the original amplifier is a rare revision, when parameters are difficult to reproduce or when the cabinet has a known intermittent fault. Replacement can be faster when a tested matching unit is in stock and the machine data is complete.

Compare the total recovery time, not only the part price:

- diagnosis and bench-test time;
- shipping and customs lead time;
- parameter restoration and commissioning;
- warranty coverage and return handling;
- availability of a second unit if the first fails.

Vibocnc provides [repair and replacement options](/repair-request) for automation parts, including legacy assemblies that are no longer easy to source.

## Commission methodically

Back up CNC and PMC data before replacement. Confirm grounding and discharge the cabinet according to the machine builder's safety procedure. Inspect the incoming unit for connector damage, contamination, fan wear and evidence of moisture. Do not fit a replacement until the label and revision match the approved quote.

After power-up, clear only alarms that are understood. Verify axis parameters, motor direction, brake timing and feedback status. Run a low-speed jog and a dry cycle before cutting material. Record the final alarm history, parameter changes and measured current so the next maintenance decision has evidence.

## FANUC amplifier checklist

1. Identify CNC series, axis and alarm history.
2. Match exact amplifier number, revision and voltage.
3. Confirm motor family, current, feedback and brake wiring.
4. Check cabinet bus, cooling, connectors and mounting.
5. Compare repair versus tested replacement by recovery time.
6. Require test evidence, warranty and a documented commissioning plan.

For broader part-number checks, read [How to choose FANUC CNC parts](/blog/fanuc-cnc-parts-selection-guide). For a quote or compatibility review, [contact our automation team](/contact).`,
  },
  {
    title: 'How to Choose Mitsubishi Servo Drives: MR-J4, MR-J5 and More',
    slug: 'mitsubishi-servo-drive-selection-guide',
    summary: 'A system-level guide to choosing Mitsubishi MELSERVO drives by family, motor, network, safety function and application load.',
    featuredImage: '/images/blog/mitsubishi-selection-guide.svg',
    metaTitle: 'Mitsubishi Servo Drive Selection Guide | Vibocnc',
    metaDescription: 'Compare Mitsubishi servo drive families by motor, load, feedback, network, safety requirements, cabinet power and replacement risk.',
    metaKeywords: 'Mitsubishi servo drive selection, MR-J4, MR-J5, MELSERVO, Mitsubishi amplifier replacement, servo motor sizing',
    isFeatured: true,
    sortOrder: 58,
    content: String.raw`# How to Choose Mitsubishi Servo Drives: MR-J4, MR-J5 and More

Mitsubishi MELSERVO systems are selected as a drive, motor, feedback device, cable and controller combination. A drive with the correct brand and power rating can still be wrong if the motor family, network, safety option or firmware expectations do not match the machine.

## Define the motion job first

Describe the load, speed range, acceleration, duty cycle, stopping method and ambient conditions. A point-to-point indexer has different needs from a continuously cycling conveyor or a high-response cutting axis. Record reflected inertia, vertical load, mechanical backlash and the required positioning accuracy when those values are available.

Use the [Vibocnc products catalog](/products) and [automation categories](/categories) to organize candidate drives, but keep the machine's measured load as the authority. A supplier can validate the part faster when the application data is included with the label photo.

## Identify the MELSERVO family and communication method

Start with the exact family printed on the amplifier and the controller protocol used by the machine. MR-J4 and MR-J5 systems may support different network, safety and engineering expectations even when their housings look similar. Pulse train, SSCNET, CC-Link IE and other network arrangements require the right interface on both ends.

Check whether the machine uses a standalone positioning controller, a PLC motion module or a dedicated motion network. The replacement must support the existing command method or the retrofit must include a controller and wiring change. Treat the network connector, parameter software and configuration file as part of the drive selection.

## Match the motor, encoder and power rating

Record the motor model, rated voltage, rated current, encoder type, connector keying and brake. Match the continuous and peak current to the real load profile. A drive that is too small may generate overload or following-error alarms; a drive that is too large may not be accepted by the controller's parameter set or safety circuit.

Confirm single-phase or three-phase input, bus voltage, regenerative handling and cabinet cooling. For vertical axes, check the brake release sequence and safe torque-off wiring. For fast indexing, confirm that the encoder resolution and auto-tuning range can deliver the requested response without creating vibration.

## Compare a repair with a replacement

If the drive has a known power-stage or fan failure, repair preserves the original family and parameter history. A replacement is attractive when a tested unit is available and the production stop is more expensive than the repair turnaround. Ask for a test report that states what was loaded, which alarms were checked and whether the feedback input was verified.

Include these items in a quote request:

- exact drive and motor labels;
- controller and network type;
- alarm code and operating conditions;
- input voltage and axis load;
- requested warranty and delivery date.

Vibocnc can review the evidence through a [repair evaluation request](/repair-request), including legacy Mitsubishi parts and practical replacement options.

## Commission without changing several variables at once

Back up the controller project, drive parameters, electronic gearing, limits and safety settings. Check cable shielding, earth bonding, brake wiring and the motor's mechanical freedom before installing the replacement. Restore the approved parameter set, then run a low-speed test with the machine unloaded.

Verify direction, homing, following error, emergency stop and safe torque-off behavior. Record the drive alarm history and current values during a representative cycle. If the machine is unstable, stop and isolate whether the cause is tuning, mechanics, feedback or the drive rather than repeatedly swapping parts.

## Mitsubishi servo checklist

1. Define load, speed, duty and stopping requirements.
2. Match MR family, controller protocol and safety function.
3. Match motor, encoder, brake, voltage and current.
4. Check cabinet cooling and regenerative capacity.
5. Compare tested repair and replacement by total downtime.
6. Back up parameters and document commissioning results.

For the PLC and I/O side of the same machine, read [How to choose Mitsubishi PLC and I/O modules](/blog/mitsubishi-plc-i-o-selection-guide). To discuss a part number, [contact Vibocnc](/contact).`,
  },
  {
    title: 'How to Choose Mitsubishi PLC and I/O Modules for Factory Automation',
    slug: 'mitsubishi-plc-i-o-selection-guide',
    summary: 'A clear Mitsubishi PLC selection workflow covering CPU capacity, I/O points, network, safety, expansion and lifecycle support.',
    featuredImage: '/images/blog/mitsubishi-selection-guide.svg',
    metaTitle: 'Mitsubishi PLC and I/O Selection Guide | Vibocnc',
    metaDescription: 'Choose Mitsubishi PLC and I/O modules by CPU capacity, scan time, point count, network, safety, expansion and lifecycle support planning.',
    metaKeywords: 'Mitsubishi PLC selection, Mitsubishi I/O module, FX5U, iQ-F, iQ-R, factory automation PLC replacement',
    isFeatured: false,
    sortOrder: 57,
    content: String.raw`# How to Choose Mitsubishi PLC and I/O Modules for Factory Automation

Selecting a Mitsubishi PLC is an architecture decision, not a CPU-only decision. The controller must fit the program, I/O topology, network, safety design, power supply and future expansion plan. A correct replacement also has to preserve the machine's wiring and engineering workflow where possible.

## Map the machine before choosing a CPU

Create an I/O list with every digital input, digital output, analog channel, high-speed counter, pulse output and special function. Add spare capacity for maintenance changes. Note whether outputs are relay, transistor or a different electrical type, and record voltage, common grouping and current per point.

Then record scan-time expectations, motion axes, recipe memory, data logging, remote stations and the controller software project version. Use [Vibocnc's products](/products) and [categories](/categories) to organize parts, but let the existing program and wiring define the shortlist.

## Separate the Mitsubishi platform families

FX and iQ-F controllers are often used for compact machines, while iQ-R systems provide a larger rack and module architecture. The family affects CPU capacity, expansion, network modules, engineering software and the way a replacement is commissioned. Do not substitute a module only because the terminal layout appears close.

Check the exact CPU and module suffix, base or rack requirement, power supply, extension cable and end connector. For a legacy system, ask whether the proposed module preserves the existing program and device addressing or requires a conversion project.

## Select I/O by electrical and timing behavior

Digital inputs may be sinking or sourcing and may require a specific common arrangement. Outputs can have different current, protection and switching characteristics. Analog modules need the correct signal range, resolution, isolation and channel count. High-speed inputs and pulse outputs require both the right module and the right wiring practice.

For remote I/O, match the network protocol, station number, refresh time and available diagnostics. A network adapter is not a generic plug-in: the PLC project, cable, termination and remote station configuration must agree. For safety circuits, use the approved safety controller and module family rather than treating standard I/O as a substitute.

## Plan for maintenance and availability

List the modules that are most likely to fail and keep an approved spare strategy. For obsolete platforms, compare a tested original module, repair of the existing unit and a planned migration. The lowest purchase price may be expensive if engineering software, program conversion or an unplanned wiring change is required.

When requesting a quote, include the CPU/module labels, cabinet photos, I/O list, network type, alarm or diagnostic text and the desired delivery date. Vibocnc can review those details through a [repair evaluation request](/repair-request) and help compare available, refurbished and repairable options.

## Validate the replacement in a controlled sequence

Back up the PLC project, parameters, recipes, network settings and HMI data. Label wires and photograph terminal positions before removal. Confirm the new module's keying, power, commons and mounting. Restore the project only after the hardware and firmware combination has been approved.

Test power-up, CPU diagnostics, each I/O group, analog scaling, remote communication and safety interlocks. Use a forced-I/O checklist only under an approved maintenance procedure. Run the machine through a dry cycle and record the final diagnostics so later faults can be separated from the original failure.

## Mitsubishi PLC checklist

1. Count every point and special function with spare capacity.
2. Match CPU family, program project and firmware expectations.
3. Confirm electrical type, common grouping, current and isolation.
4. Match network, remote stations, timing and safety architecture.
5. Compare tested spare, repair and migration cost over the machine life.
6. Back up data and verify each I/O group during commissioning.

For motion axes, read [How to choose Mitsubishi servo drives](/blog/mitsubishi-servo-drive-selection-guide). For a part review or availability check, [contact the Vibocnc team](/contact).`,
  },
  {
    title: 'How to Choose Siemens SIMATIC PLC Parts: S7-1200, S7-1500 and Legacy Systems',
    slug: 'siemens-simatic-plc-selection-guide',
    summary: 'A Siemens SIMATIC selection guide for CPU generation, engineering files, I/O, communications, safety and legacy replacement planning.',
    featuredImage: '/images/blog/siemens-selection-guide.svg',
    metaTitle: 'Siemens SIMATIC PLC Selection Guide | Vibocnc',
    metaDescription: 'Choose Siemens SIMATIC PLC parts by S7 generation, engineering file, I/O, network, safety, firmware and replacement strategy for uptime.',
    metaKeywords: 'Siemens SIMATIC PLC selection, S7-1200, S7-1500, S7-300 replacement, S7-400 parts, PLC repair',
    isFeatured: true,
    sortOrder: 56,
    content: String.raw`# How to Choose Siemens SIMATIC PLC Parts: S7-1200, S7-1500 and Legacy Systems

Siemens SIMATIC systems span compact controllers, modular racks, distributed I/O and safety platforms. The right replacement is determined by the CPU generation and engineering project as much as by the module label. A good selection keeps the machine's addressing, network behavior and diagnostics understandable to the next maintenance team.

## Begin with the project and hardware identity

Save the TIA Portal or legacy STEP 7 project before touching the cabinet. Record the CPU order number, firmware version, memory card, rack position, communication modules and remote I/O stations. Photograph labels and connector sides, and note the diagnostic buffer text.

S7-1200 and S7-1500 projects have different engineering assumptions from older S7-300 and S7-400 installations. A modern CPU may be the right migration target, but it is not automatically a drop-in spare. Use [Vibocnc products](/products) and [product categories](/categories) to compare available components, then confirm the project path with a specialist.

## Match the CPU to the workload

Estimate digital and analog points, program size, data blocks, cycle-time limits, technology objects, motion axes and communication connections. Leave headroom for future recipes and diagnostics. For a replacement CPU, verify memory card requirements, firmware compatibility, retentive memory and the commissioning method.

If the machine uses distributed I/O, compare the bus interface, device names, station configuration and diagnostic features. A CPU with more processing capacity may still create downtime if the existing engineering file cannot be downloaded without conversion.

## Check signal and network details

Digital modules differ in input type, output type, commons, rated current and isolation. Analog modules differ in range, resolution, channel count and wiring. For ET 200 or other distributed stations, match the interface module, bus connector, termination and device configuration.

Record PROFINET, PROFIBUS, serial and drive links separately. Check IP addresses, device names, station addresses, GSD or device description files and the HMI connection. A replacement that powers up but is absent from the network is not a successful replacement.

## Plan legacy support deliberately

For S7-300 or S7-400 equipment, first decide whether the priority is a quick tested spare or a staged migration. A refurbished original can preserve the current project and wiring. A migration may improve availability but needs engineering time, validation and an updated maintenance file.

Ask a supplier for the exact order number, revision, firmware or memory-card status, test scope, warranty and lead time. If the original module has an intermittent fault, send it for a [repair evaluation](/repair-request) before discarding it. Repairing a rare module can be lower risk than introducing an unplanned platform change.

## Commission with an evidence trail

Back up the project, recipes, safety settings, network configuration and HMI data. Confirm power, grounding, keying and terminal arrangement. Download only an approved project version, then verify CPU diagnostics, every I/O station, analog scaling, HMI communication, drives and safety circuits.

Run a dry cycle and record the firmware, hardware order number, loaded project version and final diagnostic buffer. This record helps the next technician distinguish a hardware issue from a configuration change and makes the next spare purchase faster.

## Siemens SIMATIC checklist

1. Record CPU order number, generation, firmware and project format.
2. Match workload, memory, cycle time and technology functions.
3. Verify I/O electrical behavior, isolation and remote station details.
4. Check PROFINET, PROFIBUS, HMI and drive configuration.
5. Compare tested spare, repair and planned migration risk.
6. Back up data and document the complete commissioning test.

For drive systems, continue with [How to choose Siemens SINAMICS drives](/blog/siemens-sinamics-drive-selection-guide). For a compatibility review, [contact Vibocnc](/contact).`,
  },
  {
    title: 'How to Choose Siemens SINAMICS Drives for Motion and Process Equipment',
    slug: 'siemens-sinamics-drive-selection-guide',
    summary: 'A practical SINAMICS drive guide covering G120, S120 and related system choices, motor data, control mode, network and safety.',
    featuredImage: '/images/blog/siemens-selection-guide.svg',
    metaTitle: 'Siemens SINAMICS Drive Selection Guide | Vibocnc',
    metaDescription: 'Choose Siemens SINAMICS drives by application, motor data, control unit, power module, network, braking and safety needs before ordering.',
    metaKeywords: 'Siemens SINAMICS selection, G120, S120, drive replacement, Siemens inverter repair, motion control drive',
    isFeatured: false,
    sortOrder: 55,
    content: String.raw`# How to Choose Siemens SINAMICS Drives for Motion and Process Equipment

SINAMICS drives are modular systems whose control unit, power module, motor, feedback, line components and engineering data work together. Selecting only by kilowatts can produce nuisance trips, poor torque response or a drive that cannot communicate with the existing PLC.

## Define the application and load profile

Classify the axis as a pump, fan, conveyor, spindle, hoist, winder or coordinated motion axis. Record speed range, overload duration, acceleration, braking energy, duty cycle and ambient temperature. For a vertical or regenerative load, include the brake resistor or regenerative supply requirements in the first quote.

A drive for a simple variable-speed fan has a different control and feedback requirement from a coordinated servo axis. Gather the motor nameplate, mechanical load, cable length and machine safety design before comparing part numbers. The [Vibocnc product catalog](/products) is a useful starting point, and [categories](/categories) can help separate drive, motor and control components.

## Distinguish the SINAMICS architecture

Compact G120 installations and modular S120 motion systems are not interchangeable simply because both are branded SINAMICS. Identify the control unit, power module, line module, motor module, braking components and firmware or project file. The replacement must fit the mechanical bus, electrical rating and communication architecture.

Check whether the PLC commands the drive over PROFINET, PROFIBUS, a motion telegram or another interface. Confirm device name, address, telegram, technology object and safety configuration. A power module with the wrong control unit or firmware can leave a healthy motor unavailable to the machine.

## Match motor, feedback and braking

Record the motor type, rated current, voltage, speed, encoder, brake and cable. Verify whether the application uses sensorless vector, closed-loop vector or servo control. For high-inertia loads, calculate acceleration and braking energy instead of relying on nominal motor power alone.

Check line impedance, fuses, DC-link arrangement, cabinet ventilation and the allowed cable length. Confirm safe torque off, emergency-stop behavior and any external brake control. Safety circuits should be validated by a qualified person; a drive replacement is not an excuse to bypass an interlock.

## Decide repair, replacement or migration

Repair is useful when the unit is a rare revision, when the control project is stable or when matching modules are difficult to source. A tested replacement may shorten downtime if the exact control and power combination is available. Migration can improve lifecycle support, but it needs engineering, parameter conversion and a documented acceptance test.

Send the exact labels, alarm history, project or parameter backup and required delivery date with a [repair evaluation request](/repair-request). Vibocnc can compare a repair, tested replacement and practical sourcing route instead of quoting a generic drive with unknown compatibility.

## Commission in layers

Back up drive parameters, PLC project, safety configuration and motor data. Inspect terminals, bus connectors, cooling fans and braking components. Install the approved unit, confirm grounding, then power up without motion. Check diagnostics and network identity before enabling the motor.

Run an unloaded low-speed test, then verify direction, current, feedback, braking, limits, safe torque off and communication. Move to a representative cycle only after the first tests pass. Record the final parameter set, firmware, alarm history and measured current for maintenance records.

## SINAMICS selection checklist

1. Classify the application and record speed, load and braking duty.
2. Identify G120, S120 or the correct SINAMICS architecture.
3. Match control unit, power module, motor, feedback and firmware.
4. Verify PLC telegram, network identity, safety and cabinet cooling.
5. Compare repair, tested replacement and migration by downtime risk.
6. Back up data and document layered commissioning results.

For the controller side, read [How to choose Siemens SIMATIC PLC parts](/blog/siemens-simatic-plc-selection-guide). To share a label or alarm for review, [contact Vibocnc](/contact).`,
  },
];

function parseArgs(argv) {
  const args = { baseUrl: 'http://127.0.0.1:8080/api/v1', envFile: '', dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--base-url') args.baseUrl = argv[++index] || args.baseUrl;
    else if (arg === '--env-file') args.envFile = argv[++index] || '';
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/seed_blog_articles.mjs [--base-url URL] [--env-file PATH] [--dry-run]');
      process.exit(0);
    }
  }
  return args;
}

function parseEnvFile(filePath) {
  if (!filePath) return {};
  const env = {};
  let source = '';
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    return env;
  }
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response from ${url} (HTTP ${response.status})`);
  }
  if (!response.ok || body.success === false) {
    const detail = body.message || body.error || `HTTP ${response.status}`;
    throw new Error(`${options.method || 'GET'} ${url}: ${detail}`);
  }
  return body;
}

function dataOf(body) {
  return body?.data ?? body;
}

function listOf(body) {
  const data = dataOf(body);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

async function login(baseUrl, username, password) {
  const body = await requestJson(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const data = dataOf(body);
  const token = data?.token || body?.token;
  if (!token) throw new Error('Login succeeded but no admin token was returned');
  return token;
}

function payloadFor(article) {
  return {
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    content: article.content,
    content_type: 'blog',
    featured_image: article.featuredImage,
    image_urls: [],
    gallery_media_ids: [],
    is_published: true,
    is_featured: article.isFeatured,
    meta_title: article.metaTitle,
    meta_description: article.metaDescription,
    meta_keywords: article.metaKeywords,
    sort_order: article.sortOrder,
    translations: [],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fileEnv = parseEnvFile(args.envFile);
  const env = { ...fileEnv, ...process.env };
  const baseUrl = normalizeBaseUrl(args.baseUrl);
  const username = env.DEFAULT_ADMIN_USERNAME || env.ADMIN_USERNAME || 'admin';
  const password = env.DEFAULT_ADMIN_PASSWORD || env.ADMIN_PASSWORD || (args.dryRun ? 'dry-run' : '');

  if (!args.dryRun && !password) {
    throw new Error('Admin password is missing. Pass --env-file or set DEFAULT_ADMIN_PASSWORD.');
  }

  if (args.dryRun) {
    for (const article of articles) console.log(`DRY RUN ${article.slug} (${article.content.length} content characters)`);
    return;
  }

  const token = await login(baseUrl, username, password);
  const headers = { Authorization: `Bearer ${token}` };
  const response = await requestJson(`${baseUrl}/admin/news?page=1&page_size=100&content_type=blog`, { headers });
  const existing = new Map(listOf(response).map((article) => [article.slug, article]));
  let created = 0;
  let updated = 0;

  for (const article of articles) {
    const payload = payloadFor(article);
    const match = existing.get(article.slug);
    if (match?.id) {
      await requestJson(`${baseUrl}/admin/news/${match.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      updated += 1;
      console.log(`UPDATED ${article.slug}`);
    } else {
      await requestJson(`${baseUrl}/admin/news`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      created += 1;
      console.log(`CREATED ${article.slug}`);
    }
  }

  console.log(`Published ${articles.length} blog articles (${created} created, ${updated} updated).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
