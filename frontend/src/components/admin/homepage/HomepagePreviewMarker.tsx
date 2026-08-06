'use client';

import { PencilSquareIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

type Props = {
  sectionKey: string;
  label: string;
  children: ReactNode;
};

/**
 * Adds an editor-only marker to the real homepage. The marker is rendered only
 * inside the admin preview iframe and sends the selected section to its parent.
 */
export default function HomepagePreviewMarker({ sectionKey, label, children }: Props) {
  const selectSection = () => {
    window.parent.postMessage({ type: 'vibocnc-homepage-edit', sectionKey }, window.location.origin);
  };

  return (
    <div className="group relative outline outline-2 outline-dashed outline-orange-400/70 outline-offset-[-2px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[80] flex justify-end p-3">
        <button
          type="button"
          onClick={selectSection}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-slate-950/90 px-2.5 py-1.5 text-xs font-semibold text-orange-100 shadow-lg backdrop-blur transition hover:bg-orange-600 hover:text-white"
        >
          <PencilSquareIcon className="h-4 w-4" />
          {label}
        </button>
      </div>
      {children}
    </div>
  );
}
