import { apiClient } from '@/lib/api';
import type { APIResponse } from '@/types';

function parseFilenameFromContentDisposition(v?: string): string | null {
  if (!v) return null;
  // Examples:
  // attachment; filename="fanuc-db-backup-20260117-000000.zip"
  // attachment; filename=fanuc-db-backup.zip
  const m = /filename\*?=(?:UTF-8''|")?([^\";]+)"?/i.exec(v);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export class BackupService {
  static async downloadDbZip(): Promise<void> {
    const res = await apiClient.get<Blob>('/admin/backup/db', {
      responseType: 'blob',
      timeout: 30 * 60 * 1000,
    });
    const filename =
      parseFilenameFromContentDisposition(String((res.headers as any)?.['content-disposition'] || '')) ||
      'fanuc-db-backup.zip';
    downloadBlob(res.data, filename);
  }

  static async downloadMediaZip(): Promise<void> {
    const res = await apiClient.get<Blob>('/admin/backup/media', {
      responseType: 'blob',
      timeout: 30 * 60 * 1000,
    });
    const filename =
      parseFilenameFromContentDisposition(String((res.headers as any)?.['content-disposition'] || '')) ||
      'fanuc-media-backup.zip';
    downloadBlob(res.data, filename);
  }

  static async restoreDbZip(file: File): Promise<void> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<APIResponse<any>>('/admin/backup/db/restore?force=1', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30 * 60 * 1000,
    });
    if (res.data.success) return;
    throw new Error(res.data.message || res.data.error || 'Failed to restore database');
  }

  static async restoreMediaZip(file: File): Promise<void> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<APIResponse<any>>('/admin/backup/media/restore?force=1', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30 * 60 * 1000,
    });
    if (res.data.success) return;
    throw new Error(res.data.message || res.data.error || 'Failed to restore media');
  }
}

