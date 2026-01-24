import { permanentRedirect } from 'next/navigation';

// Categories index page is intentionally disabled.
// Category pages live at nested paths like /fanuc-controls/fanuc-power-mate.
export default function CategoriesPage() {
  permanentRedirect('/');
}
