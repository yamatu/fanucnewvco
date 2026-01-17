'use client';

import React from 'react';
import {
  CalendarIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ShieldCheckIcon,
  CogIcon,
  TruckIcon,
  GlobeAltIcon,
  ClockIcon,
  BeakerIcon,
  ArchiveBoxIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  PhoneIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

export const ICON_MAP: Record<string, any> = {
  calendar: CalendarIcon,
  building: BuildingOfficeIcon,
  users: UsersIcon,
  shield: ShieldCheckIcon,
  cog: CogIcon,
  truck: TruckIcon,
  globe: GlobeAltIcon,
  clock: ClockIcon,
  beaker: BeakerIcon,
  archive: ArchiveBoxIcon,
  wrench: WrenchScrewdriverIcon,
  clipboard: ClipboardDocumentCheckIcon,
  check: CheckCircleIcon,
  phone: PhoneIcon,
  cap: AcademicCapIcon,
};

export function IconPreview({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || CogIcon;
  return <Icon className={className} />;
}

