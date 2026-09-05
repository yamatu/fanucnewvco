export interface PublicTrackingConfig {
  enabled?: boolean;
  code?: string;
}

/** Renders the enabled administrator-supplied analytics snippet in <head>. */
export default function TrackingCode({ config }: { config: PublicTrackingConfig | null }) {
  const code = config?.enabled ? String(config.code || '').trim() : '';
  if (!code) return null;

  const blocks = Array.from(code.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi));
  if (blocks.length === 0) {
    return <script dangerouslySetInnerHTML={{ __html: code.replace(/<\/script/gi, '<\\/script') }} />;
  }

  return (
    <>
      {blocks.map(([, attributes, body], index) => {
        const srcMatch = attributes.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
        const src = srcMatch?.[1]?.trim();
        if (src) {
          if (!/^https:\/\//i.test(src)) return null;
          return <script key={`tracking-src-${index}`} async={/\basync(?:\s|=|$)/i.test(attributes)} defer={/\bdefer(?:\s|=|$)/i.test(attributes)} src={src} />;
        }
        return <script key={`tracking-inline-${index}`} dangerouslySetInnerHTML={{ __html: body.replace(/<\/script/gi, '<\\/script') }} />;
      })}
    </>
  );
}
