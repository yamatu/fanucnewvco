'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import { ShippingRateService, type ShippingQuote } from '@/services/shipping-rate.service';
import { useAdminI18n } from '@/lib/admin-i18n';

type Country = { country_code: string; country_name: string; currency: string };

export default function ShippingQuoteCalculator(props: {
	weightKg?: number;
	price?: number;
	defaultCountryCode?: string;
	onSetPrice?: (nextPrice: number) => void;
}) {
	const { locale, t } = useAdminI18n();
	const { weightKg = 0, price = 0, defaultCountryCode = 'US', onSetPrice } = props;
	const w = Number(weightKg || 0);

	const [countries, setCountries] = useState<Country[]>([]);
	const [loadingCountries, setLoadingCountries] = useState(false);
	const [carrier, setCarrier] = useState('');
	const [serviceCode, setServiceCode] = useState('');
	const [countryCode, setCountryCode] = useState('');
	const [quote, setQuote] = useState<ShippingQuote | null>(null);
	const [loadingQuote, setLoadingQuote] = useState(false);
	const [quoteError, setQuoteError] = useState<string>('');
	const [autoApply, setAutoApply] = useState(true);
	const [appliedFee, setAppliedFee] = useState(0);

	useEffect(() => {
		let alive = true;
		(async () => {
			setLoadingCountries(true);
			try {
				const list = (await ShippingRateService.publicCountries({
					carrier: carrier || undefined,
					service: carrier ? (serviceCode || undefined) : undefined,
				})) as any as Country[];
				if (!alive) return;
				setCountries(Array.isArray(list) ? list : []);
			} catch (e: any) {
				if (!alive) return;
				setCountries([]);
				console.warn('Failed to load shipping countries', e);
			} finally {
				if (alive) setLoadingCountries(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [carrier, serviceCode]);

	useEffect(() => {
		if (countryCode) return;
		if (!countries.length) return;
		const preferred = (defaultCountryCode || '').toUpperCase();
		const found = countries.find((c) => c.country_code === preferred);
		setCountryCode(found?.country_code || countries[0].country_code);
	}, [countries, countryCode, defaultCountryCode]);

	useEffect(() => {
		// When switching carrier/service, reset selection so list matches.
		setCountryCode('');
		setQuote(null);
		setQuoteError('');
	}, [carrier, serviceCode]);

	useEffect(() => {
		let alive = true;
		(async () => {
			setQuote(null);
			setQuoteError('');
			if (!countryCode || !w || w <= 0) return;
			setLoadingQuote(true);
			try {
				const q = await ShippingRateService.quote(countryCode, w, {
					carrier: carrier || undefined,
					service: carrier ? (serviceCode || undefined) : undefined,
				});
				if (!alive) return;
				setQuote(q);
			} catch (e: any) {
				if (!alive) return;
				setQuoteError(e?.message || 'Failed to calculate shipping');
			} finally {
				if (alive) setLoadingQuote(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [countryCode, w, carrier, serviceCode]);

	const shippingFee = Number(quote?.shipping_fee || 0);
	const billingWeightKg = Number((quote as any)?.billing_weight_kg || (quote as any)?.billingWeight || 0);

	const calcNextPrice = (nextFee: number) => {
		const base = Number(price || 0) - Number(appliedFee || 0);
		return Number((base + Number(nextFee || 0)).toFixed(2));
	};

	const nextPriceWithShipping = useMemo(() => {
		return calcNextPrice(shippingFee);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shippingFee, appliedFee, price]);

	useEffect(() => {
		if (!autoApply) return;
		if (!quote || shippingFee <= 0) return;
		if (!onSetPrice) return;
		if (Number(price || 0) <= 0) return;
		if (shippingFee === appliedFee) return;
		const nextPrice = calcNextPrice(shippingFee);
		onSetPrice(nextPrice);
		setAppliedFee(shippingFee);
	}, [autoApply, quote, shippingFee, onSetPrice, price, appliedFee, countryCode, w]);

	return (
		<div className="bg-white shadow rounded-lg p-6">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h3 className="text-lg font-medium text-gray-900">{t('shipping.calc.title', '运费预览（按重量）')}</h3>
					<p className="mt-1 text-sm text-gray-500">{t('shipping.calc.subtitle', '根据已配置模板预览运费，并可自动加到标价。')}</p>
				</div>
			</div>

			<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">{t('shipping.calc.carrier', locale === 'zh' ? '承运商' : 'Carrier')}</label>
					<select
						value={carrier}
						onChange={(e) => setCarrier(e.target.value)}
						className="block w-full px-3 py-2 border border-gray-300 rounded-md"
					>
						<option value="">{t('shipping.calc.carrier.default', locale === 'zh' ? '默认(按国家模板)' : 'Default (country templates)')}</option>
						<option value="FEDEX">FEDEX</option>
						<option value="DHL">DHL</option>
					</select>
					{carrier && (
						<input
							value={serviceCode}
							onChange={(e) => setServiceCode(e.target.value)}
							className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md"
							placeholder={t('shipping.calc.servicePh', locale === 'zh' ? '服务代码 (IP/IE...)' : 'Service code (IP/IE...)')}
						/>
					)}
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">{t('shipping.calc.country', '国家')}</label>
					<select
						value={countryCode}
						onChange={(e) => setCountryCode(e.target.value)}
						className="block w-full px-3 py-2 border border-gray-300 rounded-md"
						disabled={loadingCountries || countries.length === 0}
					>
						<option value="">{loadingCountries ? t('common.loading', '加载中...') : t('shipping.calc.country', '国家')}</option>
						{countries.map((c) => (
							<option key={c.country_code} value={c.country_code}>
								{c.country_name} ({c.country_code})
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">{t('shipping.calc.weight', '重量(kg)')}</label>
					<div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">{w > 0 ? w : '-'}</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">{t('shipping.calc.shippingFee', '运费')}</label>
					<div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
						{loadingQuote ? t('common.loading', '加载中...') : quote ? `${quote.currency || 'USD'} ${shippingFee.toFixed(2)}` : '-'}
					</div>
				</div>
			</div>

			{quoteError && (
				<div className="mt-3 text-sm text-red-600">{quoteError}</div>
			)}

			{quote && (
				<div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 grid grid-cols-1 gap-2 sm:grid-cols-2">
					<div>{t('shipping.calc.ratePerKg', '每公斤价格')}: {Number(quote.rate_per_kg || 0).toFixed(3)}</div>
					<div>{t('shipping.calc.baseQuote', '基础运费')}: {Number(quote.base_quote || 0).toFixed(2)}</div>
					<div>{t('shipping.calc.additionalFee', '附加费')}: {Number(quote.additional_fee || 0).toFixed(2)}</div>
					<div>
						{t('shipping.calc.billingWeight', '计费重量')}: {billingWeightKg ? Number(billingWeightKg).toFixed(3) : '-'}
						{w > 0 && w < 21 ? <span className="ml-2 text-gray-500">{t('shipping.calc.roundUpHint', '（<21kg 向上取整）')}</span> : null}
					</div>
					<div>{t('shipping.calc.priceWithShipping', '标价 + 运费')}: {nextPriceWithShipping.toFixed(2)}</div>
				</div>
			)}

			<div className="mt-4 flex items-center gap-2">
				<label className="inline-flex items-center gap-2 text-sm text-gray-700">
					<input
						type="checkbox"
						checked={autoApply}
						onChange={(e) => {
							setAutoApply(e.target.checked);
							if (!e.target.checked) setAppliedFee(0);
						}}
						className="h-4 w-4"
						disabled={!onSetPrice}
					/>
					{t('shipping.calc.autoApply', '自动加到标价')}
				</label>
				<button
					type="button"
					disabled={!quote || shippingFee <= 0 || !onSetPrice}
					onClick={() => {
						if (!quote || shippingFee <= 0 || !onSetPrice) return;
						const nextPrice = calcNextPrice(shippingFee);
						onSetPrice(nextPrice);
						setAppliedFee(shippingFee);
						toast.success(`${t('common.save', '保存')}: ${nextPrice.toFixed(2)} (${t('shipping.calc.shippingFee', '运费')} ${shippingFee.toFixed(2)})`);
					}}
					className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
				>
					{t('shipping.calc.setPrice', '设置：标价 = 原价 + 运费')}
				</button>
				<span className="text-xs text-gray-500">{t('shipping.calc.helperNote', '后台助手：以当前标价为基准，避免重复叠加。')}</span>
			</div>
		</div>
	);
}
