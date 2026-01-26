'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import AdminLayout from '@/components/admin/AdminLayout';
import { queryKeys } from '@/lib/react-query';
import { ShippingRateService } from '@/services/shipping-rate.service';

export default function AdminShippingRatesPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [replaceMode, setReplaceMode] = useState(true);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: [...queryKeys.shippingRates.admin(), { q }],
    queryFn: () => ShippingRateService.adminList(q.trim() || undefined),
    retry: 1,
  });

  const rows = useMemo(() => templates || [], [templates]);

  const downloadTemplate = async () => {
    try {
      const blob = await ShippingRateService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shipping-template-template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (e: any) {
      toast.error(e.message || 'Failed to download template');
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error('Please select an .xlsx file');
      return ShippingRateService.importXlsx(importFile, { replace: replaceMode });
    },
    onSuccess: (res: any) => {
      toast.success(`Imported countries: ${res.countries || 0} (created ${res.created || 0}, updated ${res.updated || 0})`);
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingRates.admin() });
    },
    onError: (e: any) => toast.error(e.message || 'Import failed'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (payload: { all?: boolean; country_codes?: string[] }) => ShippingRateService.bulkDelete(payload),
    onSuccess: (res: any) => {
      toast.success(`Deleted ${res.deleted || 0} country template(s)`);
      setSelectedCodes([]);
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingRates.admin() });
    },
    onError: (e: any) => toast.error(e.message || 'Delete failed'),
  });

  const toggleSelected = (code: string) => {
    setSelectedCodes((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shipping Templates</h1>
            <p className="mt-1 text-sm text-gray-500">Country + weight brackets + quote surcharge. Used at checkout (no tax).</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download XLSX Template
            </button>

            <label className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              <span>Choose XLSX</span>
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={replaceMode} onChange={(e) => setReplaceMode(e.target.checked)} className="h-4 w-4" />
              Replace existing rules
            </label>

            <button
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Import
            </button>

            <button
              onClick={() => {
                if (!window.confirm('Delete ALL shipping templates? This cannot be undone.')) return;
                bulkDeleteMutation.mutate({ all: true });
              }}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
              title="Bulk delete all countries"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete All
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="US / United States ..."
              />
            </div>
            <button
              onClick={() => {
                if (selectedCodes.length === 0) { toast.error('Select at least one country'); return; }
                if (!window.confirm(`Delete templates for: ${selectedCodes.join(', ')} ?`)) return;
                bulkDeleteMutation.mutate({ country_codes: selectedCodes });
              }}
              className="inline-flex items-center px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              disabled={bulkDeleteMutation.isPending || selectedCodes.length === 0}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete Selected
            </button>
          </div>

          <div className="overflow-auto rounded border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Select</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Country</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Currency</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Weight Brackets</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Quote Surcharges</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-500">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-500">No templates</td></tr>
                ) : (
                  rows.map((r: any) => (
                    <tr key={r.country_code} className="border-t">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedCodes.includes(r.country_code)}
                          onChange={() => toggleSelected(r.country_code)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-gray-900">{r.country_code}</div>
                        <div className="text-gray-700">{r.country_name}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-900">{r.currency || 'USD'}</td>
                      <td className="px-3 py-2 text-gray-900">{r.weight_brackets}</td>
                      <td className="px-3 py-2 text-gray-900">{r.quote_surcharges}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
