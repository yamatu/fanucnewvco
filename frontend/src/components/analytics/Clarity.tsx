'use client';

import { useEffect } from 'react';

const CLARITY_PROJECT_ID = 't9h8f5viyl';

export default function Clarity() {
  useEffect(() => {
    // Check if clarity is already loaded
    if (typeof window !== 'undefined') {
      // Initialize Clarity using the script injection method
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.innerHTML = `
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
      `;

      // Only add the script if it hasn't been added already
      if (!document.querySelector('script[src*="clarity.ms"]')) {
        document.head.appendChild(script);
      }
    }
  }, []);

  return null; // This component doesn't render anything
}