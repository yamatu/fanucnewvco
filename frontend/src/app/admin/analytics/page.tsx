'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import { AnalyticsService } from '@/services/analytics.service';
import type {
  AnalyticsOverview,
  VisitorLog,
  CountryData,
  PageData,
  TrendData,
  AnalyticsSettings,
  AnalyticsFilters,
} from '@/services/analytics.service';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import toast from 'react-hot-toast';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// ISO Alpha-2 -> ISO Alpha-3 mapping (for react-simple-maps which uses Alpha-3)
const alpha2ToAlpha3: Record<string, string> = {
  AF:'AFG',AL:'ALB',DZ:'DZA',AD:'AND',AO:'AGO',AG:'ATG',AR:'ARG',AM:'ARM',AU:'AUS',AT:'AUT',
  AZ:'AZE',BS:'BHS',BH:'BHR',BD:'BGD',BB:'BRB',BY:'BLR',BE:'BEL',BZ:'BLZ',BJ:'BEN',BT:'BTN',
  BO:'BOL',BA:'BIH',BW:'BWA',BR:'BRA',BN:'BRN',BG:'BGR',BF:'BFA',BI:'BDI',KH:'KHM',CM:'CMR',
  CA:'CAN',CV:'CPV',CF:'CAF',TD:'TCD',CL:'CHL',CN:'CHN',CO:'COL',KM:'COM',CG:'COG',CD:'COD',
  CR:'CRI',CI:'CIV',HR:'HRV',CU:'CUB',CY:'CYP',CZ:'CZE',DK:'DNK',DJ:'DJI',DM:'DMA',DO:'DOM',
  EC:'ECU',EG:'EGY',SV:'SLV',GQ:'GNQ',ER:'ERI',EE:'EST',ET:'ETH',FJ:'FJI',FI:'FIN',FR:'FRA',
  GA:'GAB',GM:'GMB',GE:'GEO',DE:'DEU',GH:'GHA',GR:'GRC',GD:'GRD',GT:'GTM',GN:'GIN',GW:'GNB',
  GY:'GUY',HT:'HTI',HN:'HND',HU:'HUN',IS:'ISL',IN:'IND',ID:'IDN',IR:'IRN',IQ:'IRQ',IE:'IRL',
  IL:'ISR',IT:'ITA',JM:'JAM',JP:'JPN',JO:'JOR',KZ:'KAZ',KE:'KEN',KI:'KIR',KP:'PRK',KR:'KOR',
  KW:'KWT',KG:'KGZ',LA:'LAO',LV:'LVA',LB:'LBN',LS:'LSO',LR:'LBR',LY:'LBY',LI:'LIE',LT:'LTU',
  LU:'LUX',MK:'MKD',MG:'MDG',MW:'MWI',MY:'MYS',MV:'MDV',ML:'MLI',MT:'MLT',MH:'MHL',MR:'MRT',
  MU:'MUS',MX:'MEX',FM:'FSM',MD:'MDA',MC:'MCO',MN:'MNG',ME:'MNE',MA:'MAR',MZ:'MOZ',MM:'MMR',
  NA:'NAM',NR:'NRU',NP:'NPL',NL:'NLD',NZ:'NZL',NI:'NIC',NE:'NER',NG:'NGA',NO:'NOR',OM:'OMN',
  PK:'PAK',PW:'PLW',PA:'PAN',PG:'PNG',PY:'PRY',PE:'PER',PH:'PHL',PL:'POL',PT:'PRT',QA:'QAT',
  RO:'ROU',RU:'RUS',RW:'RWA',KN:'KNA',LC:'LCA',VC:'VCT',WS:'WSM',SM:'SMR',ST:'STP',SA:'SAU',
  SN:'SEN',RS:'SRB',SC:'SYC',SL:'SLE',SG:'SGP',SK:'SVK',SI:'SVN',SB:'SLB',SO:'SOM',ZA:'ZAF',
  SS:'SSD',ES:'ESP',LK:'LKA',SD:'SDN',SR:'SUR',SZ:'SWZ',SE:'SWE',CH:'CHE',SY:'SYR',TW:'TWN',
  TJ:'TJK',TZ:'TZA',TH:'THA',TL:'TLS',TG:'TGO',TO:'TON',TT:'TTO',TN:'TUN',TR:'TUR',TM:'TKM',
  TV:'TUV',UG:'UGA',UA:'UKR',AE:'ARE',GB:'GBR',US:'USA',UY:'URY',UZ:'UZB',VU:'VUT',VE:'VEN',
  VN:'VNM',YE:'YEM',ZM:'ZMB',ZW:'ZWE',PS:'PSE',XK:'XKX',
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AnalyticsPage() {
  const queryClient = useQueryClient();

  // Date range: default last 30 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDate(d);
  });
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));
  const [includeBots, setIncludeBots] = useState(false);

  // Visitor table filters
  const [visitorPage, setVisitorPage] = useState(1);
  const [visitorIP, setVisitorIP] = useState('');
  const [visitorCountry, setVisitorCountry] = useState('');
  const [visitorBotFilter, setVisitorBotFilter] = useState('');

  // Settings
  const [cleanupDate, setCleanupDate] = useState('');

  // Map tooltip
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const baseFilters: AnalyticsFilters = useMemo(
    () => ({ start: startDate, end: endDate }),
    [startDate, endDate]
  );

  // Queries
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: queryKeys.analytics.overview(baseFilters),
    queryFn: () => AnalyticsService.getOverview(baseFilters),
  });

  const { data: trends } = useQuery({
    queryKey: queryKeys.analytics.trends(baseFilters),
    queryFn: () => AnalyticsService.getTrends(baseFilters),
  });

  const { data: countries } = useQuery({
    queryKey: queryKeys.analytics.countries({ ...baseFilters, is_bot: includeBots ? undefined : 'false' }),
    queryFn: () => AnalyticsService.getCountries({ ...baseFilters, is_bot: includeBots ? undefined : 'false' }),
  });

  const { data: pages } = useQuery({
    queryKey: queryKeys.analytics.pages({ ...baseFilters, limit: 10 }),
    queryFn: () => AnalyticsService.getPages({ ...baseFilters, limit: 10 }),
  });

  const visitorFilters: AnalyticsFilters = useMemo(
    () => ({
      ...baseFilters,
      page: visitorPage,
      page_size: 15,
      country: visitorCountry || undefined,
      is_bot: visitorBotFilter || undefined,
      ip: visitorIP || undefined,
    }),
    [baseFilters, visitorPage, visitorCountry, visitorBotFilter, visitorIP]
  );

  const { data: visitors } = useQuery({
    queryKey: queryKeys.analytics.visitors(visitorFilters),
    queryFn: () => AnalyticsService.getVisitors(visitorFilters),
  });

  const { data: settings } = useQuery({
    queryKey: queryKeys.analytics.settings(),
    queryFn: () => AnalyticsService.getSettings(),
  });

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<Pick<AnalyticsSettings, 'retention_days' | 'auto_cleanup_enabled' | 'tracking_enabled'>>) =>
      AnalyticsService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.settings() });
      toast.success('Settings updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cleanupMutation = useMutation({
    mutationFn: (before: string) => AnalyticsService.manualCleanup(before),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
      toast.success(`Deleted ${data.deleted_count} records before ${data.before}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Build country map lookup { alpha3 -> count }
  const countryMap = useMemo(() => {
    if (!countries) return {};
    const m: Record<string, { count: number; name: string }> = {};
    for (const c of countries) {
      const a3 = alpha2ToAlpha3[c.country_code];
      if (a3) {
        m[a3] = { count: c.count, name: c.country };
      }
    }
    return m;
  }, [countries]);

  const maxCount = useMemo(() => {
    if (!countries || countries.length === 0) return 1;
    return Math.max(...countries.map((c) => c.count), 1);
  }, [countries]);

  // Pie chart data for bot vs human
  const botPieData = useMemo(() => {
    if (!overview) return [];
    const humans = overview.total_visitors - overview.total_bots;
    return [
      { name: 'Human', value: humans > 0 ? humans : 0 },
      { name: 'Bot', value: overview.total_bots },
    ];
  }, [overview]);

  const handleMouseEnter = useCallback((geo: any) => {
    const a3 = geo.properties?.ISO_A3 || geo.id;
    const entry = countryMap[a3];
    if (entry) {
      setTooltipContent(`${entry.name}: ${entry.count} visitors`);
    } else {
      setTooltipContent(geo.properties?.NAME || '');
    }
  }, [countryMap]);

  const handleMouseLeave = useCallback(() => {
    setTooltipContent('');
    setTooltipPos(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Visitor Analytics</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeBots}
              onChange={(e) => setIncludeBots(e.target.checked)}
              className="rounded border-gray-300"
            />
            Include bots
          </label>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Visitors"
          value={overview?.total_visitors ?? '-'}
          loading={overviewLoading}
          color="blue"
        />
        <StatCard
          label="Unique IPs"
          value={overview?.unique_ips ?? '-'}
          loading={overviewLoading}
          color="green"
        />
        <StatCard
          label="Bot %"
          value={overview ? `${overview.bot_percentage.toFixed(1)}%` : '-'}
          loading={overviewLoading}
          color="yellow"
        />
        <StatCard
          label="Top Country"
          value={overview?.top_country ? `${overview.top_country} (${overview.top_country_count})` : '-'}
          loading={overviewLoading}
          color="purple"
        />
      </div>

      {/* World Map */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Visitor Geography</h3>
        <div className="relative" onMouseMove={handleMouseMove}>
          {tooltipContent && tooltipPos && (
            <div
              className="fixed z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none"
              style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 20 }}
            >
              {tooltipContent}
            </div>
          )}
          <ComposableMap
            projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
            style={{ width: '100%', height: 'auto' }}
          >
            <ZoomableGroup>
              <Geographies geography={GEO_URL}>
                {({ geographies }: { geographies: any[] }) =>
                  geographies.map((geo) => {
                    const a3 = geo.properties?.ISO_A3 || geo.id;
                    const entry = countryMap[a3];
                    const intensity = entry ? Math.min(entry.count / maxCount, 1) : 0;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => handleMouseEnter(geo)}
                        onMouseLeave={handleMouseLeave}
                        style={{
                          default: {
                            fill: intensity > 0
                              ? `rgba(59, 130, 246, ${0.15 + intensity * 0.85})`
                              : '#E5E7EB',
                            stroke: '#D1D5DB',
                            strokeWidth: 0.5,
                            outline: 'none',
                          },
                          hover: {
                            fill: '#2563EB',
                            stroke: '#1D4ED8',
                            strokeWidth: 1,
                            outline: 'none',
                          },
                          pressed: { outline: 'none' },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>
        {/* Country legend table */}
        {countries && countries.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-1 font-medium">Country</th>
                  <th className="pb-1 font-medium text-right">Visitors</th>
                </tr>
              </thead>
              <tbody>
                {countries.slice(0, 20).map((c) => (
                  <tr key={c.country_code} className="border-t border-gray-100">
                    <td className="py-1">{c.country} ({c.country_code})</td>
                    <td className="py-1 text-right font-medium">{c.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Trends */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Daily Traffic Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3B82F6" name="Total" dot={false} />
              <Line type="monotone" dataKey="unique_ips" stroke="#10B981" name="Unique IPs" dot={false} />
              <Line type="monotone" dataKey="bots" stroke="#F59E0B" name="Bots" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bot vs Human Pie */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Bot vs Human Traffic</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={botPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {botPieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Pages */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Top 10 Visited Pages</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pages ?? []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="path" width={200} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6" name="Views" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Visitor Logs Table */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Visitor Log</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Filter by IP..."
            value={visitorIP}
            onChange={(e) => { setVisitorIP(e.target.value); setVisitorPage(1); }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-40"
          />
          <input
            type="text"
            placeholder="Country code..."
            value={visitorCountry}
            onChange={(e) => { setVisitorCountry(e.target.value.toUpperCase()); setVisitorPage(1); }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-32"
          />
          <select
            value={visitorBotFilter}
            onChange={(e) => { setVisitorBotFilter(e.target.value); setVisitorPage(1); }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All traffic</option>
            <option value="false">Humans only</option>
            <option value="true">Bots only</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">IP</th>
                <th className="pb-2 font-medium">Country</th>
                <th className="pb-2 font-medium">City</th>
                <th className="pb-2 font-medium">Path</th>
                <th className="pb-2 font-medium">Bot</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {visitors?.data?.map((v) => (
                <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{v.ip_address}</td>
                  <td className="py-2">{v.country_code || '-'}</td>
                  <td className="py-2">{v.city || '-'}</td>
                  <td className="py-2 max-w-[200px] truncate" title={v.path}>{v.path}</td>
                  <td className="py-2">
                    {v.is_bot ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        {v.bot_name || 'Bot'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Human
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(v.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(!visitors?.data || visitors.data.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No visitor records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {visitors && visitors.total_pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">
              Page {visitors.page} of {visitors.total_pages} ({visitors.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setVisitorPage((p) => Math.max(1, p - 1))}
                disabled={visitors.page <= 1}
                className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                onClick={() => setVisitorPage((p) => Math.min(visitors.total_pages, p + 1))}
                disabled={visitors.page >= visitors.total_pages}
                className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Analytics Settings</h3>
        {settings && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.tracking_enabled}
                  onChange={(e) =>
                    updateSettingsMutation.mutate({ tracking_enabled: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Tracking Enabled</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.auto_cleanup_enabled}
                  onChange={(e) =>
                    updateSettingsMutation.mutate({ auto_cleanup_enabled: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Auto Cleanup</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                Retention:
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={settings.retention_days}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (v > 0) updateSettingsMutation.mutate({ retention_days: v });
                  }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
                days
              </label>
            </div>

            {settings.last_cleanup_at && (
              <p className="text-xs text-gray-500">
                Last auto-cleanup: {new Date(settings.last_cleanup_at).toLocaleString()}
              </p>
            )}

            {/* Manual Cleanup */}
            <div className="flex items-end gap-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manual Cleanup: delete records before
                </label>
                <input
                  type="date"
                  value={cleanupDate}
                  onChange={(e) => setCleanupDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <button
                onClick={() => {
                  if (!cleanupDate) {
                    toast.error('Select a date first');
                    return;
                  }
                  if (confirm(`Delete all visitor records before ${cleanupDate}?`)) {
                    cleanupMutation.mutate(cleanupDate);
                  }
                }}
                disabled={!cleanupDate || cleanupMutation.isPending}
                className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {cleanupMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  loading,
  color,
}: {
  label: string;
  value: string | number;
  loading: boolean;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className={`rounded-lg p-4 ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold">
        {loading ? (
          <span className="inline-block w-16 h-7 bg-current opacity-10 rounded animate-pulse" />
        ) : (
          typeof value === 'number' ? value.toLocaleString() : value
        )}
      </p>
    </div>
  );
}
