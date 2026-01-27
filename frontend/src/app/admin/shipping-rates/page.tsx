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
import { useAdminI18n } from '@/lib/admin-i18n';

export default function AdminShippingRatesPage() {
  const { locale, t } = useAdminI18n();
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
      a.download = 'shipping-template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('shipping.toast.templateDownloaded', '模板已下载'));
    } catch (e: any) {
      toast.error(e.message || t('shipping.downloadTemplate', '下载 XLSX 模板') + '失败');
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error(t('shipping.import.noFile', locale === 'zh' ? '请选择 .xlsx 文件' : 'Please select an .xlsx file'));
      return ShippingRateService.importXlsx(importFile, { replace: replaceMode });
    },
    onSuccess: (res: any) => {
      toast.success(t('shipping.toast.imported', '已导入国家：{countries}（新增 {created}，更新 {updated}）', {
        countries: res.countries || 0,
        created: res.created || 0,
        updated: res.updated || 0,
      }));
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingRates.admin() });
    },
    onError: (e: any) => toast.error(e.message || t('shipping.import', '导入') + '失败'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (payload: { all?: boolean; country_codes?: string[] }) => ShippingRateService.bulkDelete(payload),
    onSuccess: (res: any) => {
      toast.success(t('shipping.toast.deleted', '已删除 {deleted} 个国家模板', { deleted: res.deleted || 0 }));
      setSelectedCodes([]);
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingRates.admin() });
    },
    onError: (e: any) => toast.error(e.message || t('common.delete', '删除') + '失败'),
  });

  const toggleSelected = (code: string) => {
    setSelectedCodes((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('shipping.title', '运费模板')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('shipping.subtitle', '支持多国家运费配置：<21kg 按整数公斤直接取值；>=21kg 按区间每公斤价格计算。')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {t('shipping.downloadTemplate', '下载 XLSX 模板')}
            </button>

            <label className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              <span>{t('shipping.chooseXlsx', '选择 XLSX')}</span>
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={replaceMode} onChange={(e) => setReplaceMode(e.target.checked)} className="h-4 w-4" />
              {t('shipping.replaceRules', '覆盖旧规则（同国家）')}
            </label>

            <button
              onClick={() => importMutation.mutate()}
              disabled={!importFile || importMutation.isPending}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {t('shipping.import', '导入')}
            </button>

            <button
              onClick={() => {
                if (!window.confirm(t('shipping.confirmDeleteAll', '确定删除全部运费模板吗？此操作不可撤销。'))) return;
                bulkDeleteMutation.mutate({ all: true });
              }}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
              title={t('shipping.deleteAll.title', locale === 'zh' ? '批量删除全部国家模板' : 'Bulk delete all countries')}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {t('shipping.deleteAll', '删除全部')}
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('shipping.search', '搜索')}</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={t('shipping.searchPh', locale === 'zh' ? 'US / CN ...' : 'US / CN ...')}
              />
            </div>
            <button
              onClick={() => {
                if (selectedCodes.length === 0) { toast.error(t('shipping.toast.selectOne', '请至少选择一个国家')); return; }
                if (!window.confirm(t('shipping.confirmDeleteSelected', '确定删除这些国家的模板吗：{codes}？', { codes: selectedCodes.join(', ') }))) return;
                bulkDeleteMutation.mutate({ country_codes: selectedCodes });
              }}
              className="inline-flex items-center px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              disabled={bulkDeleteMutation.isPending || selectedCodes.length === 0}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {t('shipping.deleteSelected', '删除已选')}
            </button>
          </div>

          <div className="overflow-auto rounded border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">{t('shipping.select', '选择')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">{t('shipping.country', '国家')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">{t('shipping.currency', '币种')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">{t('shipping.weightBrackets', '重量规则数')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">{t('shipping.quoteSurcharges', '附加费规则数')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-500">{t('shipping.loading', '加载中...')}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-500">{t('shipping.empty', '暂无模板')}</td></tr>
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
