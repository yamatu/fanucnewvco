'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import AdminLayout from '@/components/admin/AdminLayout';
import { queryKeys } from '@/lib/react-query';
import { ShippingRateService } from '@/services/shipping-rate.service';

export default function AdminShippingRatesPage() {
  const queryClient = useQueryClient();

  const [q, setQ] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newFee, setNewFee] = useState<number>(0);

  const { data: rates = [], isLoading } = useQuery({
    queryKey: [...queryKeys.shippingRates.admin(), { q }],
    queryFn: () => ShippingRateService.adminList(q.trim() || undefined),
    retry: 1,
  });

  const downloadTemplate = async () => {
    try {
      const blob = await ShippingRateService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shipping-rates-template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || 'Failed to download template');
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error('Please select an .xlsx file');
      return ShippingRateService.importXlsx(importFile);
    },
    onSuccess: (res: any) => {
      toast.success(`Imported: ${res.created || 0} created, ${res.updated || 0} updated, ${res.failed || 0} failed`);
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingRates.admin() });
    },
    onError: (e: any) => toast.error(e.message || 'Import failed'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      ShippingRateService.create({
        country_code: newCode.trim(),
        country_name: newName.trim(),
        fee: Number(newFee || 0),
        currency: 'USD',
        is_active: true,
      }),
    onSuccess: () => {
      toast.success('Created');
      setNewCode('');
      setNewName('');
      setNewFee(0);
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingRates.admin() });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => ShippingRateService.update(payload.id, payload.data),
    onSuccess: () => {
      toast.success('Saved');
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingRates.admin() });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ShippingRateService.remove(id),
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingRates.admin() });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete'),
  });

  const rows = useMemo(() => rates || [], [rates]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shipping Rates</h1>
            <p className="mt-1 text-sm text-gray-500">Flat shipping fee by country (used in checkout, no tax).</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download Template
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
            <button
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Import
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
            <div className="w-full sm:w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                placeholder="US"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Country name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="United States"
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fee (USD)</label>
              <input
                type="number"
                value={String(newFee)}
                onChange={(e) => setNewFee(Number(e.target.value || 0))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                min={0}
                step={0.01}
              />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !newCode.trim() || !newName.trim()}
              className="inline-flex items-center px-4 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add
            </button>
          </div>

          <div className="overflow-auto rounded border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Code</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Country</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Fee</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Active</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-500">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-500">No rates</td></tr>
                ) : (
                  rows.map((r: any) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-gray-900">{r.country_code}</td>
                      <td className="px-3 py-2 text-gray-900">{r.country_name}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="w-28 px-2 py-1 border border-gray-300 rounded"
                          defaultValue={String(r.fee)}
                          step={0.01}
                          min={0}
                          onBlur={(e) => {
                            const v = Number(e.target.value || 0);
                            if (v === Number(r.fee)) return;
                            updateMutation.mutate({
                              id: r.id,
                              data: {
                                country_code: r.country_code,
                                country_name: r.country_name,
                                fee: v,
                                currency: r.currency || 'USD',
                                is_active: Boolean(r.is_active),
                              },
                            });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          defaultChecked={Boolean(r.is_active)}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: r.id,
                              data: {
                                country_code: r.country_code,
                                country_name: r.country_name,
                                fee: Number(r.fee || 0),
                                currency: r.currency || 'USD',
                                is_active: e.target.checked,
                              },
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => {
                            if (!window.confirm(`Delete rate for ${r.country_code}?`)) return;
                            deleteMutation.mutate(r.id);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </td>
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
