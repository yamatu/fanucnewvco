import { permanentRedirect } from 'next/navigation';
import { getRequestPublicLocale } from '@/lib/i18n/server';
import { localizePublicPath } from '@/lib/i18n/config';

// Categories index page is intentionally disabled.
// Category pages live at nested paths like /fanuc-controls/fanuc-power-mate.
export default async function CategoriesPage() {
  const locale = await getRequestPublicLocale();
  permanentRedirect(localizePublicPath('/', locale));
}
