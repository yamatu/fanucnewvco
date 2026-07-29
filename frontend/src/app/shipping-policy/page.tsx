import EditableSitePage, { buildEditablePageMetadata } from '@/components/content/EditableSitePage';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const generateMetadata = () => buildEditablePageMetadata('shipping-policy');
export default function Page() { return <EditableSitePage pageKey="shipping-policy" />; }
