#!/usr/bin/env node

/**
 * Publish research-backed FANUC maintenance guides and product news through
 * the same admin API used by the dashboard. Matching slugs are updated, so
 * the script can be rerun safely after editorial corrections.
 */

import fs from 'node:fs';
import process from 'node:process';

const articles = [
  {
    contentType: 'blog',
    title: 'FANUC Servo Alarm Troubleshooting: A Safe Isolation Workflow',
    slug: 'fanuc-servo-alarm-troubleshooting-field-guide',
    summary: 'A practical workflow for separating motor, cable, feedback, power and servo-amplifier faults without replacing parts by guesswork.',
    featuredImage: '/images/editorial/fanuc-servo-diagnostics.svg',
    metaTitle: 'FANUC Servo Alarm Troubleshooting Guide | Vibocnc',
    metaDescription: 'Diagnose FANUC servo alarms with a safe evidence-first workflow covering alarm history, motor and cable isolation, feedback, power and amplifier checks.',
    metaKeywords: 'FANUC servo alarm troubleshooting, SV0438 alarm, FANUC servo amplifier repair, abnormal current alarm, CNC servo diagnostics',
    isFeatured: true,
    sortOrder: 75,
    content: String.raw`# FANUC Servo Alarm Troubleshooting: A Safe Isolation Workflow

A servo alarm identifies a monitored condition, not automatically the failed component. The same abnormal-current or excess-error alarm can be caused by a motor winding, power cable, feedback cable, mechanical load, brake circuit, grounding problem, parameter mismatch or servo amplifier. The fastest reliable repair is therefore an isolation process backed by alarm history and measurements.

> Safety note: Servo systems contain hazardous voltage and stored DC-bus energy. Lock out the machine, follow the machine builder's discharge time, and use a qualified industrial controls technician. Do not disconnect a motor, bypass a safety circuit or probe an energized cabinet unless the approved service procedure specifically requires it.

## 1. Preserve evidence before resetting the alarm

Record the complete alarm number, axis, amplifier display code and operating state. Note whether it appears at power-up, servo enable, low-speed jog, acceleration, deceleration or only after the machine warms up. Save the CNC alarm history and photograph the drive label before anyone clears the event.

Also record what changed immediately before the fault: a motor replacement, cable repair, collision, long idle period, parameter restore or incoming-power event. These details help distinguish a static electrical fault from a load-dependent or temperature-dependent problem.

The practical lesson from several maintenance discussions is that the axis named on the screen is the place where the control detected the condition, not proof that every component on that axis is defective. A [Reddit discussion about a FANUC 410 excess-error alarm](https://www.reddit.com/r/CNC/comments/9dg504/fanuc_0itb_on_kia_skt21lms_410_servo_alarm_b_axis/) and a separate [SV0438 abnormal-current field report](https://www.reddit.com/r/CNC/comments/yxp1u8/438_z_axes_inv_abnormal_current/) both illustrate why technicians compare the motor, cable, mechanics and amplifier before ordering a drive.

## 2. Classify the alarm by when it occurs

Use the timing to narrow the branch of the diagnosis:

- **At power-up before motion:** inspect feedback connections, parameter consistency, phase-to-ground faults, amplifier status and control power.
- **At servo enable:** consider brake release, shorted motor or cable, an incorrect motor/feedback configuration and a failing power stage.
- **During acceleration:** investigate binding mechanics, excessive load, current demand, brake drag and intermittent power connections.
- **During deceleration:** check regenerative loading, bus conditions and mechanical overrun.
- **After warm-up:** inspect fans, filters, heat sinks, cabinet temperature and components that drift with heat.
- **After a collision:** check coupling, ballscrew, brake, encoder alignment and cable damage before condemning electronics.

This classification is more useful than swapping a spare amplifier immediately, because it tells you what the replacement would actually prove.

## 3. Separate mechanical load from electrical load

With the machine safely isolated, inspect the axis for binding, damaged covers, contamination, an engaged brake, a failed bearing or a ballscrew problem. Compare the commanded position, actual position and following error using the correct FANUC diagnostic pages for the control generation.

If the machine builder's procedure allows a controlled mechanical separation, a qualified technician can determine whether the motor and mechanics turn as expected. The goal is not to run an unsafe open machine. It is to learn whether current rises because the axis is physically resisting motion.

Mechanical drag can produce the same high-current evidence as an electrical fault. Replacing the amplifier may temporarily reset the system while leaving the root cause untouched.

## 4. Inspect the motor, power cable and feedback path

After lockout and verified discharge, examine connectors for coolant, oil, carbon tracking, bent pins, loose shields and heat discoloration. Check both ends of the motor power and feedback cables. Flex points near cable carriers deserve special attention because a conductor can fail only at certain machine positions.

Use the motor manufacturer's and machine builder's specified insulation and winding tests. Disconnect sensitive electronics before any insulation-resistance test, follow the stated test voltage, and never megger through a servo amplifier or encoder. Compare phases and phase-to-ground results; a single number without the approved limit is not a diagnosis.

Feedback faults can look like power-stage faults when noisy or missing position data drives the current command in the wrong direction. Confirm connector seating, shield termination, encoder supply and the correct feedback type for the motor family.

## 5. Evaluate the amplifier only after external causes

Check the exact amplifier part number, revision, axis capacity, supply module and alarm display. Inspect cooling airflow, fan condition, dust loading, DC-bus connections and evidence of overheating. Compare the fault against another axis only when the machine architecture and approved procedure make that comparison valid.

An amplifier becomes the leading suspect when external insulation and cable checks pass, mechanics move correctly, parameters match, and the fault remains tied to the same amplifier channel. Even then, request a load-tested repair or exact replacement rather than relying on a simple power-on test.

Browse [FANUC servo and drive parts](/categories/fanuc) or submit the label, alarm history and test results through the [Vibocnc repair request](/repair-request). The evidence lets the repair team quote the correct unit and test scope.

## 6. Validate the repair in controlled stages

Back up parameters before hardware changes. After repair, confirm grounding, connectors and label match; power up without motion; verify diagnostics; then test a low-speed unloaded move. Continue with homing, a dry cycle and a representative production cycle while monitoring current, temperature and following error.

Record the final cause, part number, revision, parameters restored and measurements. That record prevents the next alarm from starting at zero.

## Field checklist

1. Capture the full alarm, axis, drive code and event timing.
2. Back up alarm history and parameters before resets or replacement.
3. Inspect mechanics, brake and load under an approved safe procedure.
4. Test motor, power cable and feedback path to specified limits.
5. Check cooling, power bus, grounding and exact amplifier identity.
6. Repair or replace only after the fault domain is supported by evidence.
7. Commission from no-motion checks to a monitored production cycle.

## Sources and further reading

- [FANUC CNC Systems overview](https://www.fanucamerica.com/docs/default-source/cnc-files/brochures/fanuc-cnc-systems-brochure.pdf)
- [FANUC CNC Controls Function Catalog](https://www.fanucamerica.com/docs/default-source/cnc-files/cnc-function-catalog.pdf?sfvrsn=999f41bd_13)
- [Community discussion: SV0438 abnormal current](https://www.reddit.com/r/CNC/comments/yxp1u8/438_z_axes_inv_abnormal_current/)
- [Community discussion: abnormal current offset diagnosis](https://www.reddit.com/r/CNC/comments/1hh5zz5/looking_for_a_possible_diagnosis/)

Community links are field reports, not FANUC service instructions. Always use the manual for the exact control, drive and machine builder. For part compatibility, read the [FANUC parts selection guide](/blog/fanuc-cnc-parts-selection-guide) or [contact Vibocnc](/contact).`,
  },
  {
    contentType: 'news',
    title: 'FANUC CRX-3iA Debuts as an 11 kg Portable Collaborative Robot',
    slug: 'fanuc-crx-3ia-portable-cobot-debut',
    summary: 'FANUC is showing the compact CRX-3iA at Automate 2026, including a portable vertical-up welding demonstration on structural steel.',
    featuredImage: '/images/editorial/fanuc-crx-3ia.svg',
    metaTitle: 'FANUC CRX-3iA Portable Cobot Debut | Vibocnc News',
    metaDescription: 'FANUC introduces the 11 kg CRX-3iA portable collaborative robot and demonstrates vertical-up welding at Automate 2026.',
    metaKeywords: 'FANUC CRX-3iA, portable cobot, collaborative robot, robot welding, Automate 2026',
    isFeatured: true,
    sortOrder: 100,
    content: String.raw`# FANUC CRX-3iA Debuts as an 11 kg Portable Collaborative Robot

FANUC America says its CRX-3iA will make its Automate 2026 debut in a vertical-up welding demonstration. The company lists a robot mass of 11 kg (24 lb), positioning the model for applications where a collaborative robot must be carried to the work rather than installed permanently in a conventional fixed cell.

## What FANUC is demonstrating

In the official show preview, an operator carries the CRX-3iA in a crane basket, secures it to a structural-steel I-beam with a magnetic base and uses touch sensing to locate the joint. A purpose-developed vertical-up welding profile then controls the weld path in an orientation that is traditionally difficult to automate.

The useful development is not only a smaller arm. The demonstration combines portability, temporary fixturing, joint location and an application-specific process profile. That package is relevant to high-mix fabrication where the workpiece is too large or too variable to bring into one dedicated robot cell.

## Where a portable cobot may fit

Potential applications include repair fabrication, structural assemblies, short production runs, inspection and light machine tending. Portability can reduce fixed infrastructure, but it does not remove integration work. The magnetic base, welding power source, cable routing, fume extraction, safeguarding and workpiece condition still determine whether the process is stable.

Collaborative operation is application-specific. A robot marketed as collaborative does not make a welding arc, sharp tool or suspended platform inherently safe. The completed system requires a documented risk assessment, approved mounting, payload review and validation of every operating mode.

## Maintenance and spare-parts implications

Portable deployment increases the importance of connector protection, cable strain relief and a controlled inspection routine. A robot that moves between work areas can see more handling impacts, contamination and repeated connection cycles than a fixed installation.

Teams evaluating the CRX-3iA should document:

- robot and controller serial numbers;
- software and welding option versions;
- base and tool calibration records;
- dress-pack routing and connector inspection;
- backup ownership and recovery procedure;
- supported consumables and critical spare lead times.

For existing collaborative-robot cells, portable deployment should be evaluated as a new application rather than assumed compatible with an older CRX project. Review reach, payload, inertia, process equipment and safety validation together.

## Vibocnc view

The CRX-3iA expands the use case for collaborative robots from bring parts to the robot toward bring the robot to the task. Its value will depend on how quickly a plant can establish repeatable fixturing, process qualification and a safe handoff between locations.

Vibocnc supplies [industrial automation parts](/products) and supports [repair evaluation for control and motion equipment](/repair-request). For robot-cell reliability, keep controller, I/O, vision, welding and safety-system records connected rather than treating the arm as an isolated component.

## Official source

- [FANUC America: Physical AI and robotics demonstrations at Automate 2026](https://www.fanucamerica.com/press-releases/fanuc-america-showcases-physical-ai-and-ai-enabled-robotics-demos-at-automate-2026)
- [FANUC America CRX-3iA product page](https://www.fanucamerica.com/products/robot/crx-3ia)

Product capabilities and availability should be confirmed with FANUC for the target region and application.`,
  },
  {
    contentType: 'news',
    title: 'FANUC R-2000/E Series: What the Next-Generation Robot Changes',
    slug: 'fanuc-r2000e-next-generation-robot-series',
    summary: 'FANUC is debuting the R-2000/E series with eight configurations, higher axis speeds, more wrist-load capacity and a smaller installation footprint.',
    featuredImage: '/images/editorial/fanuc-r2000e.svg',
    metaTitle: 'FANUC R-2000/E Robot Series Update | Vibocnc News',
    metaDescription: 'Review FANUC R-2000/E series changes, including eight configurations, faster axes, increased wrist-load capacity and footprint improvements.',
    metaKeywords: 'FANUC R-2000/E, industrial robot, spot welding robot, material handling robot, Automate 2026',
    isFeatured: true,
    sortOrder: 99,
    content: String.raw`# FANUC R-2000/E Series: What the Next-Generation Robot Changes

FANUC America is using Automate 2026 to debut the R-2000/E series in automotive material handling and servo-gun spot-welding demonstrations. The company describes eight model configurations with higher axis speeds, increased wrist-load capacity and a reduced installation footprint.

## The practical changes

For established R-2000 users, the series name may be familiar, but the E generation should be treated as a new engineering baseline. Faster axes can reduce cycle time, while added wrist capacity gives integrators more freedom for large grippers, weld guns and process equipment. A smaller footprint can help fit replacement or expansion cells into crowded production areas.

FANUC also describes the range as having a streamlined, maintenance-free design. That statement applies to design features claimed by the manufacturer; it should not be read as zero maintenance for the completed cell. Dress packs, tooling, utility connections, safety equipment, process hardware and external axes still need inspection and preventive maintenance.

## Questions for a brownfield installation

Replacing an older robot with a new generation is rarely a bolt-for-bolt project. Before committing, compare:

- base and mechanical envelope;
- reach, payload, wrist inertia and allowable moments;
- controller generation and software options;
- program conversion and position accuracy requirements;
- I/O, network and safety interfaces;
- dress-pack and end-of-arm-tool routing;
- floor loading, fences and restricted spaces;
- spare-parts strategy for old and new cells during transition.

Even when a new arm occupies less floor area, its dynamic swept volume and stopping behavior must be modeled. Existing jigs and servo guns may also need a new load and cable-routing review.

## Why this matters for maintenance teams

A generation change creates a mixed-fleet period. Plants should decide whether to standardize new controllers, training and backups or preserve a pool of older spares for installed lines. Record which motors, reducers, encoders, controller boards and teach pendants are shared and which are generation-specific.

The handover package should include a controller image, application software, calibration records, payload data, safety signature, network map and a tested recovery sequence. Without that package, a faster robot can still create longer recovery time after a fault.

## Vibocnc view

The R-2000/E update is most valuable when the plant plans the cell lifecycle along with the cycle-time improvement. Treat compatibility, training and recovery documentation as part of the capital project.

Vibocnc can help identify [automation and robot-system components](/products) or review a failed control, drive or I/O assembly through the [repair request workflow](/repair-request). Use the exact model, controller and serial information when sourcing parts for a mixed FANUC fleet.

## Official source

- [FANUC America: Automate 2026 robotics preview](https://www.fanucamerica.com/press-releases/fanuc-america-showcases-physical-ai-and-ai-enabled-robotics-demos-at-automate-2026)
- [FANUC America R-2000/E series](https://www.fanucamerica.com/products/series/r-2000e)

Final specifications and regional availability should be verified against the model data sheet and the engineered application.`,
  },
  {
    contentType: 'news',
    title: 'FANUC Physical AI at Automate 2026: Five Factory-Floor Lessons',
    slug: 'fanuc-physical-ai-automate-2026-factory-lessons',
    summary: 'FANUC is combining 3D vision, adaptive motion, simulation, ROS 2 and generative interfaces in its Automate 2026 demonstrations.',
    featuredImage: '/images/editorial/fanuc-physical-ai.svg',
    metaTitle: 'FANUC Physical AI at Automate 2026 | Vibocnc News',
    metaDescription: 'Analyze FANUC Physical AI demonstrations using 3D vision, adaptive motion, NVIDIA processing, ROS 2, simulation and natural-language programming.',
    metaKeywords: 'FANUC Physical AI, Automate 2026, robot AI, ROS 2 industrial robot, generative AI robot programming',
    isFeatured: true,
    sortOrder: 98,
    content: String.raw`# FANUC Physical AI at Automate 2026: Five Factory-Floor Lessons

FANUC America's Automate 2026 preview brings several technologies under the Physical AI label: RGB-D and 3D vision, real-time adaptive motion, NVIDIA-based processing, Isaac Sim digital twins, ROS 2 integration and natural-language instructions converted into robot actions.

The important question for manufacturers is not whether a demo uses AI. It is which production uncertainty the system can observe, what decision it is allowed to make and how the result is validated.

## 1. Perception is moving closer to the motion loop

One demonstration tracks a moving engine block while a CRX-20iA/L tightens bolts. Another uses RGB-D cameras to detect nearby people while a CRX-10iA/L handles and scans boxes. These examples use perception to adapt a robot path rather than only inspect a completed part.

That creates new commissioning requirements: camera calibration, latency limits, confidence thresholds, lighting control and a defined response when perception is uncertain.

## 2. Digital twins are becoming operating tools

FANUC pairs an M-710/50/26D food-option robot with PalletTool and an NVIDIA Isaac Sim digital twin. Simulation can support layout, reach, throughput and commissioning, but its usefulness depends on configuration control. The virtual tool, payload, limits and program must match the physical cell.

Plants should assign ownership for keeping the model current after tooling or software changes. An outdated twin can produce confident but irrelevant results.

## 3. Natural language does not remove engineering controls

FANUC's CRX Vibe Coding demonstration translates spoken instructions into AI-generated Python and executable robot motion. This may shorten setup for defined tasks, but generated code still needs review, limits, simulation and controlled validation.

The acceptance question is the same as for manually written code: who approved it, which version ran, what inputs can change it and how the machine reaches a safe state when execution fails?

## 4. Open interfaces expand both capability and responsibility

ROS 2-enabled integration and API connectivity can connect robots to a broader software ecosystem. They also expand the change-management and cybersecurity boundary. Network segmentation, authentication, supported packages, patch policy, logging and restore testing belong in the robot maintenance plan.

## 5. AI evidence should be stored with machine evidence

Traditional recovery records include robot backups, payload schedules, frames, calibration and safety signatures. An adaptive cell may also need camera calibrations, model versions, confidence settings, Python dependencies and simulation assets.

Without those records, the cell may be mechanically healthy but impossible to reproduce after controller replacement.

## Vibocnc view

Physical AI is most credible when it reduces a defined source of production variation and leaves a clear audit trail. Start with one measurable problem, specify the fallback state and build the backup package before scaling the architecture.

Vibocnc supports [industrial controls, I/O, drives and automation parts](/categories) and offers [repair evaluation](/repair-request) for existing equipment. AI applications still depend on reliable power, motion, sensing and controller hardware.

## Official source

- [FANUC America: Physical AI and AI-enabled robotics at Automate 2026](https://www.fanucamerica.com/press-releases/fanuc-america-showcases-physical-ai-and-ai-enabled-robotics-demos-at-automate-2026)

The demonstrations are show applications, not universal performance claims. Each production deployment requires its own engineering and risk validation.`,
  },
  {
    contentType: 'news',
    title: 'FANUC R-50iA Controller Adds Certified Cybersecurity and New Vision',
    slug: 'fanuc-r50ia-controller-cybersecurity-vision-update',
    summary: 'The R-50iA robot controller combines IEC 62443 certification, higher-resolution vision, Python support, energy features and remote service tools.',
    featuredImage: '/images/editorial/fanuc-r50ia.svg',
    metaTitle: 'FANUC R-50iA Controller Features | Vibocnc News',
    metaDescription: 'Explore FANUC R-50iA controller cybersecurity certification, 5 MP vision, Python integration, energy-saving and remote-maintenance features.',
    metaKeywords: 'FANUC R-50iA, robot controller, IEC 62443, FANUC iRVision, Python robot integration',
    isFeatured: true,
    sortOrder: 97,
    content: String.raw`# FANUC R-50iA Controller Adds Certified Cybersecurity and New Vision

FANUC America introduced the R-50iA robot controller in August 2024 as a major platform update. The announcement combines motion-performance changes with third-party IEC 62443-4-1 and 4-2 cybersecurity certification, enhanced integrated vision, Python execution and new remote-support functions.

## Security is becoming a controller specification

FANUC says the R-50iA was the first robot controller to obtain the cited international cybersecurity certifications. The platform supports protected SSH remote access, SFTP file transfer, HTTPS web communication and password-based user authentication.

Certification is a strong product-level signal, but cell security still depends on deployment. Integrators should define user roles, remove default access, segment networks, restrict remote routes, record software versions and test backup restoration. A certified controller connected through an unmanaged service laptop is not a complete security architecture.

## Vision moves to a five-megapixel camera

The R-50iA vision update includes a five-megapixel camera, which FANUC describes as four times the prior resolution, plus a waterproof design, LED illumination and unified GigE Ethernet connection. A common interface covers the iPendant, TabletTP and PC.

Higher resolution can improve field of view and feature detail, but it also makes calibration, lighting, lens choice, network bandwidth and image-retention policy more important. Preserve camera parameters and calibration records with the robot backup.

## Integration and energy features broaden the platform

The controller can execute Python scripts for system integration and supports software-PLC functions in several IEC-style languages. FANUC also highlights lower-power components, a low-power fan and an eco-mode switch.

These features let a controller take on more integration logic. Plants should still decide which system owns each function. Mixing robot, PLC and external-script responsibilities without a documented interface makes troubleshooting harder.

## Three cabinet sizes affect spare planning

FANUC lists Mate-, A- and B-cabinet versions. The physical cabinet, installed options, amplifier configuration and robot model must all be included in a spare-parts request. R-50iA should not be treated as a generic drop-in controller for an older R-30i platform.

For a new cell, store the robot image, Python files, software-PLC project, vision calibration, user-role policy and network settings in one controlled recovery package.

## Vibocnc view

R-50iA shifts controller selection from motion and I/O alone toward security, software integration and data lifecycle. Maintenance teams need access to both electrical drawings and software ownership records.

Vibocnc lists [industrial controller and automation components](/products) and can assess failed boards, drives and support equipment through a [repair request](/repair-request). Always include the full controller cabinet and installed-robot identity.

## Official source

- [FANUC America: R-50iA controller announcement](https://www.fanucamerica.com/press-releases/fanucs-new-r-50ia-robot-controller-provides-powerful-performance)
- [FANUC America R-50iA controller series](https://www.fanucamerica.com/products/controller-series/r-50ia)

Cybersecurity features should be implemented within the plant's own risk, patch and access-control program.`,
  },
  {
    contentType: 'news',
    title: 'FANUC ROBOGUIDE V10 Modernizes Offline Robot Simulation',
    slug: 'fanuc-roboguide-v10-robot-simulation-update',
    summary: 'ROBOGUIDE V10 adds a 64-bit architecture, VR support, improved CAD import and a redesigned interface for offline robot-cell development.',
    featuredImage: '/images/editorial/fanuc-roboguide-v10.svg',
    metaTitle: 'FANUC ROBOGUIDE V10 Simulation Update | Vibocnc News',
    metaDescription: 'FANUC ROBOGUIDE V10 adds 64-bit performance, VR capabilities, enhanced CAD import and a modern interface for robot simulation.',
    metaKeywords: 'FANUC ROBOGUIDE V10, robot simulation, offline programming, digital twin, FANUC software',
    isFeatured: false,
    sortOrder: 96,
    content: String.raw`# FANUC ROBOGUIDE V10 Modernizes Offline Robot Simulation

FANUC America announced ROBOGUIDE V10 in June 2025 with a 64-bit architecture, virtual-reality capabilities, improved CAD import and a redesigned user interface. The update targets faster development and a more current workflow for building and evaluating robot cells away from production equipment.

## Why 64-bit matters

Robot-cell models can include detailed geometry, multiple robots, tooling, conveyors and process equipment. A 64-bit application can address more memory and better support complex scenes than an older 32-bit workflow. The practical result depends on workstation hardware and model quality, but the platform change removes a common limit for larger projects.

## Better CAD import can shorten setup

CAD preparation is often one of the slowest steps in offline simulation. Improved import can reduce conversion work, yet raw engineering models still need discipline. Remove irrelevant internal detail, preserve the correct coordinate system, use controlled revisions and validate collision geometry against the real equipment.

A visually accurate model is not automatically a dynamically accurate model. Payload, inertia, speed limits, frames and process timing must also match the installed cell.

## VR is useful when tied to a decision

Virtual reality can help teams review access, reach, operator interaction and maintenance space before equipment is built. It should answer specific questions, such as whether a technician can reach a service point or whether a proposed fence creates a blind area. VR does not replace a formal machine-safety assessment.

## Protect the digital handoff

An offline-programming project becomes part of the production baseline. Store:

- ROBOGUIDE version and installed robot libraries;
- CAD source and simplified collision models;
- tool, user-frame and payload definitions;
- controller software and option assumptions;
- validation differences between virtual and physical cells;
- the approved robot backup after commissioning.

When a cell changes, update both the simulation and recovery record. Otherwise the next engineer may program against an obsolete mechanical layout.

## Vibocnc view

ROBOGUIDE V10's value is not only faster simulation. It offers an opportunity to connect design evidence, commissioning evidence and maintenance backups. Plants that control those three states can use offline work without losing track of what actually runs on the floor.

Vibocnc supports [robot-cell controls and industrial automation parts](/products) and provides [repair evaluation](/repair-request) for drives, boards and related equipment. Preserve software and hardware identities together when replacing a controller component.

## Official source

- [FANUC America: ROBOGUIDE V10 announcement](https://www.fanucamerica.com/press-releases/fanuc-introduces-enhanced-next-gen-roboguide-robot-simulation-software)

Confirm licensing, supported controller generations and workstation requirements directly with FANUC before migration.`,
  },
  {
    contentType: 'blog',
    title: 'Intermittent FANUC Spindle Amplifier Alarms: What to Check First',
    slug: 'fanuc-spindle-amplifier-alarm-troubleshooting-guide',
    summary: 'A temperature-, load- and event-based method for diagnosing intermittent FANUC spindle alarms before ordering a spindle amplifier.',
    featuredImage: '/images/editorial/fanuc-spindle-diagnostics.svg',
    metaTitle: 'FANUC Spindle Amplifier Alarm Guide | Vibocnc',
    metaDescription: 'Troubleshoot intermittent FANUC spindle alarms using alarm timing, cooling, power, motor cable, load and feedback evidence.',
    metaKeywords: 'FANUC spindle alarm, FANUC spindle amplifier repair, AL-12 alarm, CNC spindle diagnostics, spindle drive overheating',
    isFeatured: false,
    sortOrder: 74,
    content: String.raw`# Intermittent FANUC Spindle Amplifier Alarms: What to Check First

An intermittent spindle alarm is difficult because a power cycle may clear it before anyone records the conditions. The useful question is not only which code appeared, but what the spindle was doing, how warm the cabinet was, what load was applied and whether the alarm stayed with the drive, motor or process.

> Safety note: A spindle drive contains hazardous voltage and stored energy. Use lockout/tagout, observe the stated discharge time and follow the machine builder's maintenance procedure. Live electrical testing belongs to qualified personnel with the correct instruments and protective equipment.

## Build an event timeline

Capture the spindle amplifier display, CNC alarm, commanded speed, actual speed, spindle load and elapsed run time. Note the tool, material, gear range, acceleration or braking event and whether coolant entered the cabinet. If the alarm clears after power cycling, preserve the history first.

A recent [community report about an intermittent FANUC spindle AL-12](https://www.reddit.com/r/CNC/comments/1uzlugj/al12_alarm_on_fanuc_spindle_drive/) describes the common pattern: the machine can run, the alarm appears unpredictably and a restart hides the symptom. That report is not a diagnostic authority, but it shows why an event log is more valuable than a single photo after reset.

Create a simple record for each occurrence:

- cold start or fully warm;
- idle, orientation, acceleration, cutting or deceleration;
- commanded and actual speed;
- load meter trend;
- cabinet and room temperature;
- exact drive display and CNC alarm;
- recovery action and time until recurrence.

Patterns usually emerge after two or three events.

## Check cooling before replacing electronics

Intermittent drive alarms often track heat. With power safely isolated, inspect cabinet filters, exhaust fans, amplifier fans, heat sinks and blocked airflow. Verify that replacement fans move air in the intended direction. Look for a cabinet heat exchanger that runs but no longer transfers heat effectively.

Dust, oil mist and failed bearings can reduce airflow long before a fan stops completely. Compare cabinet temperature near the amplifier at cold start and after the fault. A drive that fails only after a predictable warm-up period deserves thermal investigation before a power module is ordered.

Do not cool a live drive with improvised sprays or defeat cabinet interlocks. The goal is to restore the designed environment and reproduce the fault under monitored conditions.

## Relate the alarm to spindle load

If the fault occurs during acceleration, compare commanded speed, acceleration time and spindle load. A dragging belt, gearbox problem, failing spindle bearing or excessive tool load can push a healthy drive beyond its expected current. If it appears during deceleration, review regenerative energy handling and the approved braking configuration.

If the CNC commands feed while the spindle is slowing unexpectedly, stop testing and resolve the spindle-speed supervision and machine sequence. A [field discussion involving soft-thermal and overcurrent symptoms](https://www.reddit.com/r/CNC/comments/1ntpgg3/need_help_softthermal_ovc_alarm_caused_by_the/) is a reminder that the process sequence can multiply damage after the first fault.

Compare an air cut, a low-load cut and the normal operation only within an approved test plan. Do not keep repeating a cycle that risks a tool crash or stalled spindle.

## Inspect power, motor and feedback paths

After discharge, check input terminals, DC links, contactors, connectors and grounding for heat, looseness or contamination. Examine the spindle motor cable along every flex and clamp point. Confirm motor fan operation and air passages where applicable.

Use specified winding and insulation tests with the motor isolated from the drive and feedback electronics. Check the spindle sensor, encoder or orientation feedback connector for coolant, shield damage and intermittent pins. Speed-feedback loss can create symptoms that resemble a power-stage problem.

Incoming power events should also be correlated. Record phase voltage and facility events using approved monitoring equipment; do not draw conclusions from a handheld reading taken hours after the alarm.

## Decide whether the amplifier needs bench evaluation

The amplifier becomes a stronger suspect when cooling, mechanics, motor insulation, cable condition, feedback and incoming power are supported by evidence, yet the alarm remains tied to the drive. Include the complete A06B number, revision, drive display, controller series and event log in the repair request.

A useful repair report should state more than powered on. Ask whether the unit was inspected for thermal damage, whether fans and capacitors were evaluated, whether control and power stages were tested, and whether the drive was run under representative load.

Vibocnc can compare [available spindle and CNC parts](/products) with a [repair evaluation](/repair-request). When the exact revision is scarce, repairing the original unit may reduce compatibility risk; when a tested exact replacement is ready, replacement may shorten downtime.

## Commission the corrected system

Confirm labels and connectors, then power up without commanding the spindle. Review alarms and diagnostics. Test orientation and low speed, then a controlled speed ramp without cutting. Continue to a representative process only after temperature, current and actual speed remain stable.

Keep the event log running after the machine returns to production. An intermittent fault is closed when the original operating window has been repeated successfully, not when one power-up works.

## Sources and further reading

- [FANUC CNC Systems brochure](https://www.fanucamerica.com/docs/default-source/cnc-files/brochures/fanuc-cnc-systems-brochure.pdf)
- [Community report: intermittent spindle AL-12](https://www.reddit.com/r/CNC/comments/1uzlugj/al12_alarm_on_fanuc_spindle_drive/)
- [Community report: spindle and soft-thermal sequence](https://www.reddit.com/r/CNC/comments/1ntpgg3/need_help_softthermal_ovc_alarm_caused_by_the/)

Community reports are examples of field symptoms, not substitutes for the exact maintenance manual. For motion-system checks, continue with the [servo alarm isolation guide](/blog/fanuc-servo-alarm-troubleshooting-field-guide) or [send the drive label to Vibocnc](/contact).`,
  },
  {
    contentType: 'blog',
    title: 'FANUC CNC Backup and Battery Planning for 0i and 30i Controls',
    slug: 'fanuc-cnc-backup-battery-sram-restore-guide',
    summary: 'A maintenance plan for backing up CNC, PMC and machine data before battery work, board replacement or an extended shutdown.',
    featuredImage: '/images/editorial/fanuc-cnc-backup.svg',
    metaTitle: 'FANUC CNC Backup & Battery Planning Guide | Vibocnc',
    metaDescription: 'Plan FANUC 0i and 30i CNC backups, battery maintenance and recovery records for parameters, PMC data, offsets and machine-specific files.',
    metaKeywords: 'FANUC CNC backup, FANUC battery replacement, SRAM backup, FANUC 0i parameters, FANUC 30i restore',
    isFeatured: true,
    sortOrder: 73,
    content: String.raw`# FANUC CNC Backup and Battery Planning for 0i and 30i Controls

The safest time to create a CNC backup is while the machine is healthy. Battery work, main-board replacement and long shutdowns become high-risk when the only copy of the parameters, PMC data, offsets or builder-specific files exists in volatile memory.

This guide explains the planning logic. The exact menu names, media format and battery procedure depend on the FANUC series, software and machine builder, so use the manuals for the installed control.

> Safety note: Do not assume every FANUC battery is changed with power on. Some procedures preserve memory with control power while others require isolation or a specific connector sequence. Follow the exact FANUC and machine-builder procedure, maintain guarding and use qualified personnel.

## Inventory the control before creating files

Photograph the CNC model plate and record the control series, software version, machine builder, machine model and serial number. Identify the storage media supported by that configuration, such as memory card, USB device, data server or network transfer.

The public [FANUC Series 0i-F Plus brochure](https://www.fanucamerica.com/docs/default-source/cnc-files/brochures/fanuc-0i-f-plus-cnc-brochure.pdf?sfvrsn=34ea955e_2) and [Series 30i/31i/32i Model B brochure](https://www.fanucamerica.com/docs/default-source/cnc-files/brochures/fanuc_30ib_low.pdf) describe control-family capabilities, but they are not a restore procedure. Use them to identify the platform, then obtain the matching operator and maintenance documentation through the authorized support channel.

## Define what must be recoverable

A complete recovery set may include more than CNC parameters. Ask the machine builder which of these apply:

- CNC parameters and setting data;
- PMC parameters, keep relays, counters and timers;
- ladder or PMC program where export is permitted;
- pitch-error compensation and backlash data;
- tool offsets, work offsets and custom macro variables;
- part programs and protected programs;
- servo and spindle tuning data;
- option, network and data-server settings;
- builder HMI, safety and auxiliary-controller projects;
- a record of installed boards, software and option state.

Exporting only part programs is not a machine backup. Likewise, a single all-data file should not be the only copy unless the restore procedure and compatibility have been proven.

## Use a three-layer backup

### Layer 1: Human-readable exports

Save parameter and diagnostic data in a form that a technician can review. Human-readable files help compare values after a partial restore and provide evidence when a replacement board arrives with unknown data.

### Layer 2: Control-supported bulk backup

Use the control's supported SRAM, all-data or memory backup function where available. A bulk backup can preserve data that is easy to miss individually, but it may be tied to a control generation or software state.

### Layer 3: Machine recovery record

Create a short document with the control identity, backup date, procedure/manual reference, media checksum or file sizes, battery part number, cabinet photos and restore notes. Include the machine builder's contact and any password or protected-data handling policy without storing secrets in an unsafe location.

Keep at least two verified copies in different locations. A USB device left in the machine cabinet is not an off-site backup.

## Verify the backup without risking production

Check that files are non-empty, readable and associated with the correct machine. Compare file counts and sizes, and store a checksum when your maintenance system supports it. Review a sample of exported parameters and offsets.

A restore test on production equipment can itself create risk. Verification may instead use an approved offline tool, a spare matching control or a documented inspection of the export. Decide the method with the machine builder or authorized FANUC support.

## Plan battery replacement as preventive maintenance

Record every battery location and part number. A machine can have separate batteries for CNC memory, pulse coders, robot encoders, auxiliary controls or optional boards. One battery alarm does not identify every battery in the cabinet.

Use the service interval and alarm guidance for the exact hardware. Stock a correct, date-controlled replacement and inspect the connector before the planned maintenance window. Do not use a generic battery because voltage and connector polarity appear similar.

Before replacement:

1. create and verify the latest backup;
2. identify which memory or encoder the battery supports;
3. review the exact power-state and timing instructions;
4. prepare the replacement and access path before disconnecting anything;
5. record the old and new battery dates;
6. confirm alarms, position and machine operation after the procedure.

## Recover methodically after data loss or board replacement

Do not load the first file you find. Confirm the machine and control identity, replacement-board revision, software and option compatibility. Preserve the current state before writing data, even if it appears corrupt, because it may help reconstruct missing values.

Restore in the sequence specified by the manual and machine builder. Verify safety-related limits, axis directions, reference positions, pitch compensation, tool change and spindle orientation before production. Use low-risk dry tests and document any value changed after the restore.

If a board or memory device is involved, compare exact numbers in [Vibocnc's automation catalog](/products) and submit the failure details through the [repair request page](/repair-request). Keeping the original board until acceptance testing is complete preserves a recovery path.

## Backup package checklist

1. Control, software, builder and machine identity.
2. Human-readable CNC, PMC, offset and compensation exports.
3. Supported bulk backup or SRAM image where applicable.
4. Programs and builder-specific controller projects.
5. File verification, dates, checksums and cabinet photographs.
6. Battery locations, part numbers and replacement history.
7. A written restore and acceptance-test sequence.

## Sources and further reading

- [FANUC Series 0i-F Plus CNC brochure](https://www.fanucamerica.com/docs/default-source/cnc-files/brochures/fanuc-0i-f-plus-cnc-brochure.pdf?sfvrsn=34ea955e_2)
- [FANUC Series 30i/31i/32i Model B brochure](https://www.fanucamerica.com/docs/default-source/cnc-files/brochures/fanuc_30ib_low.pdf)
- [FANUC CNC Controls Function Catalog](https://www.fanucamerica.com/docs/default-source/cnc-files/cnc-function-catalog.pdf?sfvrsn=999f41bd_13)

For help matching the platform to its documentation, read [How to find the right FANUC PDF manual](/blog/fanuc-pdf-manual-navigation-guide). For replacement boards, browse [FANUC parts and controls](/categories/fanuc).`,
  },
  {
    contentType: 'blog',
    title: 'How to Find the Right FANUC PDF Manual for Your CNC',
    slug: 'fanuc-pdf-manual-navigation-guide',
    summary: 'A step-by-step method for matching a FANUC CNC, servo or spindle problem to the correct series, model and manual instead of using a random PDF.',
    featuredImage: '/images/editorial/fanuc-manual-navigation.svg',
    metaTitle: 'How to Find the Right FANUC CNC PDF Manual | Vibocnc',
    metaDescription: 'Match FANUC CNC series, model, software and manual type to find the correct official documentation for alarms, parameters, maintenance and backup.',
    metaKeywords: 'FANUC PDF manual, FANUC maintenance manual, FANUC 0i manual, FANUC 30i manual, FANUC alarm manual',
    isFeatured: false,
    sortOrder: 72,
    content: String.raw`# How to Find the Right FANUC PDF Manual for Your CNC

A PDF with FANUC in the title is not necessarily the manual for your machine. Controls that share a familiar operator panel can use different CNC series, servo families, spindle drives, software generations and machine-builder sequences. The correct document is selected from the hardware identity and task, not from the alarm phrase alone.

## Step 1: Identify every layer of the system

Record the CNC series and model from the control label, not only the text shown during boot. Examples include Series 0i-F Plus and Series 30i/31i/32i Model B. Then record the servo amplifier, spindle amplifier, power supply and motor part numbers involved in the fault.

Add the machine builder, machine model, serial number, software version and option state. The builder integrates FANUC hardware with its own ladder, safety circuits, tool changer, turret, hydraulic system and alarm messages. A builder alarm may therefore require the machine manual even when the control is FANUC.

Take photographs of:

- CNC and operator-panel labels;
- amplifier and power-supply labels;
- alarm screens and alarm history;
- machine builder plate;
- board and connector locations before removal.

## Step 2: Choose the manual by the job

FANUC documentation is divided by purpose. The title you need depends on what you are doing:

- **Operator manual:** normal operation, program handling, offsets and supported data input/output.
- **Programming manual:** G-code functions, cycles and programming behavior.
- **Parameter manual:** parameter definitions and valid ranges for the exact series.
- **Maintenance manual:** hardware, diagnostics, alarms, replacement and maintenance procedures.
- **Connection manual:** interfaces, signals and hardware integration.
- **Servo or spindle manual:** amplifier, motor and motion-system details.
- **Machine builder manual:** interlocks, ladder logic, tool changer, turret, hydraulics and builder alarms.

An alarm list can explain detection logic while still requiring a connection or builder manual to trace the cause. Do not change parameters simply because a search result associates one value with a similar alarm.

## Step 3: Verify the series, model and revision on the cover

Compare the full series name and model suffix. Check the publication or manual number, revision date and applicable software or hardware notes. A document for a nearby generation may use similar terminology but different diagnostics and parameter numbers.

The official [FANUC CNC Controls Function Catalog](https://www.fanucamerica.com/docs/default-source/cnc-files/cnc-function-catalog.pdf?sfvrsn=999f41bd_13) is useful for understanding which functions exist across product families. The [Series 0i-F Plus brochure](https://www.fanucamerica.com/docs/default-source/cnc-files/brochures/fanuc-0i-f-plus-cnc-brochure.pdf?sfvrsn=34ea955e_2) and [30i/31i/32i Model B brochure](https://www.fanucamerica.com/docs/default-source/cnc-files/brochures/fanuc_30ib_low.pdf) help identify a platform and its high-level capabilities. They do not replace the matching maintenance, parameter or machine manual.

Official support portals and the machine builder are the right sources for controlled manuals that are not publicly distributed. Avoid unverified file-hosting sites, incomplete scans and PDFs with removed cover pages.

## Step 4: Search the manual with context

Use the exact alarm number and prefix, then read the surrounding detection condition, related diagnostics and cautions. Search the amplifier display code separately from the CNC alarm. Note whether the document describes a CNC alarm, servo alarm, spindle alarm, PMC message or builder alarm.

Build a short evidence map:

1. what condition the control detected;
2. which diagnostics confirm that condition;
3. which external devices or signals can cause it;
4. what must be backed up before a test or replacement;
5. which steps require qualified energized testing;
6. what proves the repair is complete.

This prevents a common failure mode: jumping from an alarm definition to the most expensive component without testing the inputs.

## Step 5: Pair the FANUC manual with the builder documentation

Turret, chuck, hydraulic, lubrication, door and emergency-stop problems are often sequenced in the PMC ladder. A [community discussion about a turret that would not index](https://www.reddit.com/r/CNC/comments/10kcnw2/turret_wont_index_fanuc_oitc_hwacheon_cutex_16/) and another [turret-servo alarm discussion](https://www.reddit.com/r/CNC/comments/8cw6cj/having_alarm_on_sl25bsy_says_ex2240f_servo_turret/) show why technicians inspect builder proximity signals and sequence conditions, not only the CNC alarm list.

Community experience can identify questions worth asking, but the ladder, electrical drawing and builder procedure decide how that machine works. Never bypass a guard or safety input to make a ladder condition appear true.

## Step 6: Create a documentation index for the machine

Store an index with the machine identity, each manual title and number, revision, source and the systems it covers. Link the current backups and maintenance records. When a replacement control or drive is installed, record whether the manual set changed.

A useful index might include:

- FANUC CNC operator, parameter and maintenance manuals;
- servo and spindle maintenance manuals;
- connection manual;
- machine builder electrical and ladder documentation;
- option manuals for probing, networking or data servers;
- backup and restore procedure;
- parts list with exact A02B and A06B numbers.

## Manual-selection checklist

1. Confirm the label, full series and model suffix.
2. Separate CNC, servo, spindle and builder alarm sources.
3. Choose operator, parameter, maintenance or connection documentation by task.
4. Verify manual number, revision and applicable software.
5. Read detection logic, cautions and related diagnostics together.
6. Pair FANUC information with the machine builder's ladder and drawings.
7. Keep a controlled manual index beside verified machine backups.

## Sources and further reading

- [FANUC CNC Controls Function Catalog](https://www.fanucamerica.com/docs/default-source/cnc-files/cnc-function-catalog.pdf?sfvrsn=999f41bd_13)
- [FANUC Series 0i-F Plus CNC brochure](https://www.fanucamerica.com/docs/default-source/cnc-files/brochures/fanuc-0i-f-plus-cnc-brochure.pdf?sfvrsn=34ea955e_2)
- [FANUC Series 30i/31i/32i Model B brochure](https://www.fanucamerica.com/docs/default-source/cnc-files/brochures/fanuc_30ib_low.pdf)
- [Community discussion: turret sequence fault](https://www.reddit.com/r/CNC/comments/10kcnw2/turret_wont_index_fanuc_oitc_hwacheon_cutex_16/)

Once the correct document is known, use the [servo alarm workflow](/blog/fanuc-servo-alarm-troubleshooting-field-guide) or [CNC backup guide](/blog/fanuc-cnc-backup-battery-sram-restore-guide). To identify a replacement from its label, [contact Vibocnc](/contact).`,
  },
  {
    contentType: 'blog',
    title: 'FANUC E-Stop, Turret and Machine Interlock Troubleshooting',
    slug: 'fanuc-estop-turret-interlock-troubleshooting-guide',
    summary: 'A ladder-led approach to FANUC machine interlocks that separates CNC alarms from machine-builder safety, turret and sequence conditions.',
    featuredImage: '/images/editorial/fanuc-interlock-diagnostics.svg',
    metaTitle: 'FANUC E-Stop & Turret Interlock Guide | Vibocnc',
    metaDescription: 'Troubleshoot FANUC E-stop, turret and machine interlock faults through the approved safety circuit, PMC ladder, inputs and sequence conditions.',
    metaKeywords: 'FANUC E-stop alarm, FANUC turret alarm, PMC ladder troubleshooting, CNC interlock fault, machine safety circuit',
    isFeatured: false,
    sortOrder: 71,
    content: String.raw`# FANUC E-Stop, Turret and Machine Interlock Troubleshooting

An E-stop or turret alarm on a FANUC-controlled machine is often generated by the machine builder's safety and sequence logic. The CNC reports that an enable condition is missing, but the root cause may be a physical E-stop device, safety relay, door circuit, hydraulic pressure switch, turret clamp sensor, limit switch, wiring fault or PMC sequence state.

> Safety note: Never bypass, jumper or force a safety input to clear an alarm. Follow the machine builder's electrical drawings, lockout procedure and functional-safety validation requirements. Safety-circuit diagnosis and ladder monitoring must be performed by qualified personnel.

## First identify who created the message

Record the exact alarm, prefix and screen. Separate these possibilities:

- a standard FANUC CNC or servo alarm;
- a PMC message defined by the machine builder;
- a drive or auxiliary-controller alarm;
- a safety-relay or safety-PLC status;
- a physical operator-panel indication.

Builder messages often include an EX or machine-specific number. Their meaning belongs in the machine builder's alarm list and ladder comments, not a generic FANUC alarm table.

A [community E-stop discussion on a FANUC 0i-MD machine](https://www.reddit.com/r/CNC/comments/1jntege/help_clearing_an_estop_alarm_on_a_fanuc_oimd/) emphasizes tracing the circuit and observing ladder status. A [turret-indexing discussion](https://www.reddit.com/r/CNC/comments/10kcnw2/turret_wont_index_fanuc_oitc_hwacheon_cutex_16/) shows the same principle for sequence faults: determine which confirmation never arrives.

## Build a safety-chain map

Use the electrical drawing to list every device in the stop or enable chain. Depending on the machine, this may include panel E-stops, remote E-stops, guard switches, safety relays, contactor feedback, overtravel switches, hydraulic or pneumatic conditions and external automation interfaces.

Perform a visual and mechanical inspection under safe conditions. Confirm that buttons release correctly, connectors are seated and cables are not damaged. Read LEDs and diagnostics from the approved observation point. A device that looks released may still have one failed contact channel.

Do not assume the last device worked because the machine ran yesterday. Vibration, coolant, repeated flexing and contact wear commonly create intermittent open circuits.

## Use the ladder as a map, not a place to force bits

Open the PMC ladder monitor for the exact machine and find the alarm or enable coil. Work backward through the contacts to the first false condition. Cross-reference each address to the electrical drawing and I/O module.

Record the address, physical device, expected state and observed state. Then test the device and wiring using the builder's procedure. A ladder contact can show the symptom without identifying whether the sensor, wiring, I/O point or preceding logic is responsible.

For an intermittent condition, observe the sequence through several safe cycles and save screenshots or a trace if the control supports it. Do not force a bit, edit the ladder or defeat a dual-channel safety input to continue production.

## Diagnose a turret that will not index

A typical turret sequence can require spindle state, axis position, hydraulic pressure, clamp/unclamp confirmation, servo ready and position feedback. The order is builder-specific.

Start with the last completed step:

1. Was an index command issued?
2. Did the unclamp output turn on?
3. Did the unclamped confirmation arrive within its timer?
4. Did the turret motor or servo receive enable?
5. Did position feedback change?
6. Did the selected-station signal become valid?
7. Did the clamp output operate and the clamp confirmation return?

Inspect proximity-switch alignment, target condition, connector contamination and hydraulic pressure. A [community report about an EX2240 turret-servo alarm](https://www.reddit.com/r/CNC/comments/8cw6cj/having_alarm_on_sl25bsy_says_ex2240f_servo_turret/) highlights checking whether the expected proximity inputs actually change. That is a useful question, but the acceptable sensor gap and sequence come from the machine documentation.

## Separate control logic from failed hardware

If the physical input changes at the device but not in the ladder, trace the wiring, terminal, I/O point and common supply. If the input reaches the ladder but the sequence does not advance, inspect the other interlocks and timer conditions. If the output appears in the ladder but the device does not act, trace the output module, relay, contactor, valve and field power.

This input-logic-output split avoids replacing a CNC board when the actual fault is a sensor, or replacing a valve when the logic never commanded it.

For suspected I/O or control-board faults, record the exact module number, slot, LED state and measured signal. Browse [industrial I/O and control parts](/categories) and submit the evidence through [Vibocnc repair evaluation](/repair-request).

## Validate every restored safety function

After correcting the fault, validate the entire safety chain and affected machine sequence according to the builder's acceptance procedure. Test each E-stop device, guard function, reset behavior, contactor feedback and safe restart condition. For a turret, verify every station, clamp confirmation, indexing direction and a dry program cycle.

Document the cause, wiring or device changed, I/O address, ladder condition and validation results. A machine that merely clears the message is not complete until its protective function has been tested.

## Interlock checklist

1. Identify whether the message is FANUC, builder, drive or safety-controller generated.
2. Use the exact electrical drawing and ladder revision.
3. Map the safety chain or machine sequence before testing.
4. Trace the first false ladder condition to a physical signal.
5. Separate input, logic and output evidence.
6. Never force or bypass a safety condition.
7. Perform and document the full functional validation.

## Sources and further reading

- [FANUC CNC Controls Function Catalog](https://www.fanucamerica.com/docs/default-source/cnc-files/cnc-function-catalog.pdf?sfvrsn=999f41bd_13)
- [Community discussion: tracing a FANUC 0i-MD E-stop condition](https://www.reddit.com/r/CNC/comments/1jntege/help_clearing_an_estop_alarm_on_a_fanuc_oimd/)
- [Community discussion: turret indexing sequence](https://www.reddit.com/r/CNC/comments/10kcnw2/turret_wont_index_fanuc_oitc_hwacheon_cutex_16/)
- [Community discussion: turret proximity inputs](https://www.reddit.com/r/CNC/comments/8cw6cj/having_alarm_on_sl25bsy_says_ex2240f_servo_turret/)

For the control-side documentation workflow, read [How to find the right FANUC manual](/blog/fanuc-pdf-manual-navigation-guide). For a module or board review, [contact Vibocnc](/contact).`,
  },
  {
    contentType: 'news',
    title: 'FANUC M-950iA/500 Expands Serial-Link Heavy-Payload Handling',
    slug: 'fanuc-m950ia-500-heavy-payload-robot-update',
    summary: 'The M-950iA/500 combines a 500 kg payload, 2,830 mm reach and serial-link motion for heavy handling in constrained production layouts.',
    featuredImage: '/images/editorial/fanuc-m950ia.svg',
    metaTitle: 'FANUC M-950iA/500 Heavy Robot | Vibocnc News',
    metaDescription: 'FANUC M-950iA/500 offers 500 kg payload capacity, 2,830 mm reach and serial-link motion for heavy material handling.',
    metaKeywords: 'FANUC M-950iA/500, 500 kg robot, heavy payload robot, material handling robot, industrial automation',
    isFeatured: false,
    sortOrder: 95,
    content: String.raw`# FANUC M-950iA/500 Expands Serial-Link Heavy-Payload Handling

FANUC America introduced the M-950iA/500 in November 2024 for loads up to 500 kg. FANUC lists a 2,830 mm reach and emphasizes the robot's serial-link architecture, wide motion range and ability to work in tighter layouts than some traditional heavy-payload configurations.

## Why serial-link motion matters

Heavy handling cells have often traded flexibility for payload. A serial-link robot can approach large components from more directions and reorient them through a broader envelope. That can be useful for automotive components, castings, battery packs, construction products and other assemblies that need more than a simple lift-and-place path.

The available reach is only one planning value. Integrators must model payload center of gravity, wrist moments, inertia, fixture mass, floor loading and the complete swept volume. A 500 kg rating does not mean every 500 kg tool-and-part combination is valid at every speed and posture.

## Cell engineering questions

Before selecting a heavy robot, document:

- part mass and center-of-gravity variation;
- gripper, cable and sensor mass;
- required orientation and approach angles;
- floor and foundation requirements;
- load/unload and maintenance access;
- safe stopping distances and restricted spaces;
- recovery method for a suspended or interrupted load.

The recovery plan deserves particular attention. A fault with a large component in the cell can block access or leave stored mechanical energy. Maintenance and manual-recovery modes must be designed before production starts.

## Spare-parts and lifecycle planning

Heavy-payload installations should store controller backups, mastered position, payload schedules, frame data, gripper logic and safety configuration together. Identify long-lead mechanical, motor, reducer, cable and controller items. The lifting equipment and fixtures needed for replacement are also part of the maintenance plan.

If the M-950iA joins an older FANUC fleet, compare controller generation, pendant, software, I/O and safety architecture before assuming common spares. A consistent naming and backup standard can still reduce downtime even where hardware is not interchangeable.

## Vibocnc view

The M-950iA/500 creates options for layouts that need both payload and articulation. Its business case should include foundation, tooling, recovery and lifecycle support, not just robot reach and cycle time.

Vibocnc supplies [industrial automation parts](/products) and reviews failed controls, drives and I/O through the [repair request page](/repair-request). Include the complete robot, controller and application identity in any parts inquiry.

## Official source

- [FANUC America: M-950iA heavyweight robot announcement](https://www.fanucamerica.com/press-releases/fanuc-america-introduces-new-m-950ia-heavyweight-robot)
- [FANUC America M-950iA/500 product page](https://www.fanucamerica.com/products/robot/m-950ia-500)
- [FANUC M-950iA/500 data sheet](https://www.fanucamerica.com/docs/default-source/default-document-library/m-950ia-500-data-sheet.pdf)

Payload and motion limits must be checked against the official data sheet for the actual tool and application.`,
  },
  {
    contentType: 'news',
    title: 'FANUC M-800iB/60-20B Targets High-Accuracy Laser Processing',
    slug: 'fanuc-m800ib-60-20b-laser-processing-robot',
    summary: 'FANUC is demonstrating the M-800iB/60-20B in an integrated laser-cutting cell focused on speed, accuracy and path control.',
    featuredImage: '/images/editorial/fanuc-m800ib.svg',
    metaTitle: 'FANUC M-800iB/60-20B Laser Robot | Vibocnc News',
    metaDescription: 'FANUC demonstrates the M-800iB/60-20B for advanced laser cutting, highlighting accurate paths, speed and process integration.',
    metaKeywords: 'FANUC M-800iB/60-20B, laser cutting robot, process robot, path accuracy, FABTECH 2025',
    isFeatured: false,
    sortOrder: 94,
    content: String.raw`# FANUC M-800iB/60-20B Targets High-Accuracy Laser Processing

FANUC America highlighted the M-800iB/60-20B at FABTECH 2025 in an automated laser-cutting demonstration. The application focuses on the combination of robot speed, path accuracy and integration with a demanding process where small path or timing errors can affect cut quality.

## Process robots are selected by more than payload

For material handling, reaching the pickup and drop-off points may be the main motion question. Laser cutting adds contour accuracy, constant velocity, tool orientation, stand-off distance, process triggering and coordination with the laser source and extraction system.

The robot model is therefore one part of a process stack that includes:

- laser, optics and process head;
- part location and fixturing;
- calibration and path generation;
- gas, extraction and guarding;
- robot-controller options and communication;
- quality inspection and traceability.

High nominal repeatability does not correct a moving fixture, inaccurate tool center point or thermal drift. Acceptance testing should use the real material, geometry and speed range.

## What maintenance teams should preserve

Store the robot backup together with tool calibration, process recipes, laser parameters, frame data and offline-programming source. Record the exact controller software and option package. If the cutting head or cable dress is replaced, revalidate tool center point, clearance and process quality before restoring full speed.

Inspect protective windows, optics, cables, cooling and extraction at the intervals specified by each equipment supplier. A robot alarm may be downstream of a process interlock, and a cut-quality problem may originate outside the robot entirely.

## Brownfield integration considerations

Plants adding robotic laser processing should map network ownership and stop behavior across the robot, laser, safety system and extraction equipment. Define which device reports the primary fault and how the cell recovers after an interrupted cut.

Spare planning should include the components that stop the whole process, not only robot parts. A low-cost sensor, industrial PC, safety module or cooling component can set the same downtime as the robot controller.

## Vibocnc view

The M-800iB demonstration shows FANUC pushing robots further into precision process work. Successful deployment depends on calibration control and a recovery package that joins the robot program with the process equipment.

Browse [industrial controls, drives and automation parts](/categories) or request [repair evaluation](/repair-request) for a failed cell component. Vibocnc uses exact labels and operating evidence to distinguish a controller issue from a process-side fault.

## Official source

- [FANUC America: automated solutions at FABTECH 2025](https://www.fanucamerica.com/press-releases/fanuc-demonstrates-automated-solutions-at-fabtech-2025)

Final robot and process specifications should be validated with FANUC and the laser-system integrator.`,
  },
  {
    contentType: 'news',
    title: 'FANUC SR-3iA/U Brings SCARA Motion to a Ceiling-Mount Layout',
    slug: 'fanuc-sr3ia-u-ceiling-mount-scara-robot',
    summary: 'The SR-3iA/U ceiling-mount SCARA is designed around a 360-degree work envelope for compact assembly, picking and packaging cells.',
    featuredImage: '/images/editorial/fanuc-sr3ia-u.svg',
    metaTitle: 'FANUC SR-3iA/U Ceiling SCARA | Vibocnc News',
    metaDescription: 'FANUC SR-3iA/U ceiling-mount SCARA provides a 360-degree work envelope for compact pick, place and assembly applications.',
    metaKeywords: 'FANUC SR-3iA/U, ceiling mount SCARA, pick and place robot, assembly robot, compact automation',
    isFeatured: false,
    sortOrder: 93,
    content: String.raw`# FANUC SR-3iA/U Brings SCARA Motion to a Ceiling-Mount Layout

FANUC expanded its SCARA range with the SR-3iA/U, a ceiling-mount model designed around a full 360-degree work envelope. The layout moves the robot structure above the work area, opening space beneath it for fixtures, conveyors and operator access.

## What changes when the robot is overhead

A ceiling-mounted SCARA can serve stations around its base without occupying the center of the cell. That makes the architecture attractive for compact electronics assembly, medical-device handling, packaging and high-speed pick-and-place work.

The overhead position also changes engineering details. The support frame must handle static and dynamic loads without unwanted deflection. Utilities need controlled routing, and maintenance access must be designed rather than improvised with a ladder after installation.

## A 360-degree envelope still needs zone planning

The circular work area can reduce transfer distances, but it may bring more equipment into the robot's reachable space. Model tooling, feeders, cameras, guarding and service positions. Define safe access and recovery for every station.

For conveyor tracking or vision-guided picking, preserve calibration between the camera, conveyor and robot frame. FANUC's Automate material also describes an SR-9iA/R using iRVision 3DV for circular conveyor tracking, showing how SCARA cells are increasingly tied to perception and synchronized motion.

## Maintenance implications

Plan access to motors, cables, lubrication points and connectors without requiring unsafe body position. Inspect the overhead frame, fasteners and cable supports under the engineered schedule. Store mastering or calibration data, controller backup, tool dimensions, payload and vision settings together.

A replacement arm or controller must be checked against the exact model and software options. SCARA naming similarities do not guarantee identical mounting, reach, controller or cable requirements.

## Vibocnc view

The SR-3iA/U is a layout tool as much as a robot model. Its main benefit appears when cell designers use the overhead architecture to simplify material flow while preserving maintainability.

Vibocnc lists [automation parts and control components](/products) and supports [repair evaluation](/repair-request) for industrial electronic assemblies. Include the full robot/controller configuration and cell symptoms with any inquiry.

## Official source

- [FANUC America: new robots, cobots, software and AI at Automate](https://www.fanucamerica.com/press-releases/fanuc-america-unleashes-the-future-showcasing-new-robots-cobots-software-ai-and-motion-control-solutions-at-automate)

Confirm payload, reach, mounting and environmental limits from the current official model data.`,
  },
  {
    contentType: 'news',
    title: 'FANUC and OTTO Demonstrate Mobile Robotic Order Fulfillment',
    slug: 'fanuc-otto-mobile-robotic-order-fulfillment',
    summary: 'A ProMat 2025 demonstration combines a FANUC CRX-10iA/L cobot with OTTO autonomous mobile robotics for flexible warehouse fulfillment.',
    featuredImage: '/images/editorial/fanuc-warehouse.svg',
    metaTitle: 'FANUC Mobile Robotic Order Fulfillment | Vibocnc News',
    metaDescription: 'FANUC and OTTO combine a CRX-10iA/L collaborative robot with mobile robotics for flexible warehouse order fulfillment.',
    metaKeywords: 'FANUC CRX-10iA/L, OTTO AMR, mobile manipulation, robotic order fulfillment, warehouse automation',
    isFeatured: false,
    sortOrder: 92,
    content: String.raw`# FANUC and OTTO Demonstrate Mobile Robotic Order Fulfillment

At ProMat 2025, FANUC America showcased a mobile order-fulfillment concept combining a CRX-10iA/L collaborative robot with an OTTO autonomous mobile platform. The architecture moves a robot between work locations instead of dedicating one arm to one fixed station.

## Why mobile manipulation attracts attention

A mobile robot can deliver the manipulator to changing inventory or production points. That can improve utilization in high-mix warehouses and factories where fixed automation would sit idle between tasks.

The integration challenge is larger than the two product names suggest. The system must coordinate navigation, docking, robot reach, localization, battery state, payload, fleet traffic, wireless communication and the task-management layer.

## Docking repeatability is a process input

The arm's programmed frame is useful only if the mobile platform arrives within the location and orientation the application can tolerate. Integrators may use mechanical docking, vision correction, fiducials or other localization methods. The recovery plan must define what happens when confidence is too low.

For picking, the full stack may also include barcode reading, inventory data and gripper sensing. A warehouse-management record should not be updated until the physical action has been confirmed.

## Safety follows the changing cell

A mobile collaborative application can move through shared space and then perform manipulation at several locations. Risk assessment must cover travel, docking, arm motion, carried products, pinch points and each station's surroundings. A collaborative arm does not automatically make the mobile platform or gripper safe.

Software updates, map changes and new stations should be managed as controlled changes because they can alter routes and interaction zones.

## Build a combined recovery package

Store robot and mobile-platform backups, maps, docking references, network addresses, certificates, fleet configuration, gripper settings and task interfaces together. Assign ownership across the robot vendor, mobile-platform vendor, integrator and warehouse software team before a failure occurs.

Critical spares may include network, safety, charging and sensing components in addition to robot and AMR hardware. The single weakest component can stop the mobile workflow.

## Vibocnc view

Mobile manipulation can make automation more flexible, but it also turns localization and network health into production dependencies. A successful pilot should include repeatable recovery from lost docking, low battery, blocked route, failed pick and controller restart.

Vibocnc supplies [industrial automation components](/products) and can assess failed controls, drives, HMIs and I/O through the [repair request page](/repair-request).

## Official source

- [FANUC America: warehouse automation at ProMat 2025](https://www.fanucamerica.com/press-releases/fanuc-showcases-automated-warehouse-solutions-at-promat-2025)

The show system is an application demonstration; production performance depends on the engineered site, payload and software integration.`,
  },
  {
    contentType: 'news',
    title: 'FANUC P-55/15-21A Paint Robot Adopts the R-50iA Controller',
    slug: 'fanuc-p55-15-21a-paint-robot-r50ia-controller',
    summary: 'FANUC says the P-55/15-21A is its first paint robot to use the R-50iA controller, with a consolidated cabinet and batteryless encoders.',
    featuredImage: '/images/editorial/fanuc-p55.svg',
    metaTitle: 'FANUC P-55/15-21A Paint Robot Update | Vibocnc News',
    metaDescription: 'FANUC P-55/15-21A paint robot uses the R-50iA controller, a consolidated cabinet, batteryless encoders and conveyor line tracking.',
    metaKeywords: 'FANUC P-55/15-21A, paint robot, R-50iA controller, batteryless encoder, finishing automation',
    isFeatured: false,
    sortOrder: 91,
    content: String.raw`# FANUC P-55/15-21A Paint Robot Adopts the R-50iA Controller

FANUC America is presenting the P-55/15-21A paint robot with overhead-conveyor line tracking at Automate 2026. FANUC says the model was introduced at the 2025 International Robot Exhibition in Tokyo and is the company's first paint robot to adopt the R-50iA controller.

## The controller is part of the paint-system redesign

Paint environments impose explosion-protection and contamination requirements beyond a general material-handling cell. FANUC states that redesigned explosion-proof circuits, fewer components and integrated units allow the new controller functions to be consolidated into one cabinet.

Fewer cabinets can simplify floor layout and some cable routes, but integrators still need to verify hazardous-location classification, applicator interfaces, ventilation, grounding and every regional compliance requirement for the full system.

## Batteryless encoders change one maintenance task

FANUC highlights encoders that no longer require batteries. Removing periodic encoder-battery replacement can reduce one source of planned maintenance and position-loss risk. It does not eliminate the need for backups, mastering records, calibration or controller maintenance.

Plants should document exactly which devices are batteryless. Other cell components, safety systems or legacy robots may still have batteries with separate service intervals.

## Line tracking links robot health to conveyor data

The demonstration uses PaintTool and line tracking to coat parts moving on an overhead conveyor. Stable operation depends on conveyor feedback, tracking calibration, part presentation, applicator condition and process parameters as well as robot motion.

When coating quality changes, maintenance teams should review the full evidence chain: conveyor speed, encoder signal, robot path, gun trigger timing, fluid delivery, atomization, booth conditions and part grounding.

## Plan the transition from older paint cells

The R-50iA introduces different security, vision, software and service capabilities from earlier controller generations. A migration plan should cover program conversion, network policy, hazardous-area interfaces, spare cabinets, training and rollback.

Store the robot backup with PaintTool settings, line-tracking calibration, applicator recipes, safety validation, controller version and explosion-protection documentation. That package is essential after a controller or encoder-related service event.

## Vibocnc view

The P-55/15-21A update combines process, controller and maintenance changes. Its lifecycle advantage will be strongest where the plant uses the simplified hardware to improve documentation and recovery, rather than treating fewer components as a reason to reduce preventive checks.

Browse [industrial automation parts](/products) or submit a failed control, drive, HMI or I/O assembly for [repair evaluation](/repair-request). Paint-cell parts inquiries should include the hazardous-area and controller context.

## Official source

- [FANUC America: Automate 2026 robotics and AI preview](https://www.fanucamerica.com/press-releases/fanuc-america-showcases-physical-ai-and-ai-enabled-robotics-demos-at-automate-2026)

All explosion-protection, process and regional requirements must be confirmed with FANUC and the qualified finishing-system integrator.`,
  },
];

function parseArgs(argv) {
  const args = { baseUrl: 'http://127.0.0.1:8080/api/v1', envFile: '', token: '', dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--base-url') args.baseUrl = argv[++index] || args.baseUrl;
    else if (arg === '--env-file') args.envFile = argv[++index] || '';
    else if (arg === '--token') args.token = argv[++index] || '';
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/seed_fanuc_editorial_2026.mjs [--base-url URL] [--env-file PATH] [--token TOKEN] [--dry-run]');
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

function wordCount(markdown) {
  return markdown.replace(/https?:\/\/\S+/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

function validateArticles() {
  const slugs = new Set();
  const blogCount = articles.filter((article) => article.contentType === 'blog').length;
  const newsCount = articles.filter((article) => article.contentType === 'news').length;
  if (blogCount !== 5 || newsCount !== 10) {
    throw new Error(`Expected 5 blog and 10 news articles; found ${blogCount} blog and ${newsCount} news`);
  }
  for (const article of articles) {
    if (slugs.has(article.slug)) throw new Error(`Duplicate article slug: ${article.slug}`);
    slugs.add(article.slug);
    const minimumWords = article.contentType === 'blog' ? 650 : 350;
    const words = wordCount(article.content);
    if (words < minimumWords) throw new Error(`${article.slug} has ${words} words; expected at least ${minimumWords}`);
    if (!article.content.includes('## Official source') && !article.content.includes('## Sources and further reading')) {
      throw new Error(`${article.slug} is missing a source section`);
    }
    if (!article.content.includes('](/')) throw new Error(`${article.slug} is missing an internal link`);
  }
}

function payloadFor(article) {
  return {
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    content: article.content,
    content_type: article.contentType,
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
  validateArticles();
  const args = parseArgs(process.argv.slice(2));
  if (args.dryRun) {
    for (const article of articles) {
      console.log(`DRY RUN ${article.contentType} ${article.slug} (${wordCount(article.content)} words)`);
    }
    return;
  }

  const fileEnv = parseEnvFile(args.envFile);
  const env = { ...fileEnv, ...process.env };
  const baseUrl = normalizeBaseUrl(args.baseUrl);
  const username = env.DEFAULT_ADMIN_USERNAME || env.ADMIN_USERNAME || 'admin';
  const password = env.DEFAULT_ADMIN_PASSWORD || env.ADMIN_PASSWORD || '';
  const providedToken = args.token || env.BLOG_SEED_TOKEN || env.EDITORIAL_SEED_TOKEN || '';
  if (!providedToken && !password) {
    throw new Error('Admin password is missing. Pass --token, set EDITORIAL_SEED_TOKEN, or provide an env file.');
  }

  const token = providedToken || await login(baseUrl, username, password);
  const headers = { Authorization: `Bearer ${token}` };
  const [blogResponse, newsResponse] = await Promise.all([
    requestJson(`${baseUrl}/admin/news?page=1&page_size=100&content_type=blog`, { headers }),
    requestJson(`${baseUrl}/admin/news?page=1&page_size=100&content_type=news`, { headers }),
  ]);
  const existing = new Map([...listOf(blogResponse), ...listOf(newsResponse)].map((article) => [article.slug, article]));
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
      console.log(`UPDATED ${article.contentType} ${article.slug}`);
    } else {
      await requestJson(`${baseUrl}/admin/news`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      created += 1;
      console.log(`CREATED ${article.contentType} ${article.slug}`);
    }
  }

  console.log(`Published ${articles.length} editorial articles (${created} created, ${updated} updated).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
