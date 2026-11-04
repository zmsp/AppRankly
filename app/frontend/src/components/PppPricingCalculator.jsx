import React, { useState, useEffect } from 'react';
import { DollarSign, Globe, TrendingUp, AlertCircle, ArrowUpRight, Check, Copy } from 'lucide-react';
import clsx from 'clsx';

export default function PppPricingCalculator() {
  const [basePrice, setBasePrice] = useState(9.99);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState('all');
  const [copied, setCopied] = useState(false);

  const presets = [
    { label: '$0.99', val: 0.99 },
    { label: '$4.99', val: 4.99 },
    { label: '$9.99', val: 9.99 },
    { label: '$19.99', val: 19.99 },
    { label: '$29.99', val: 29.99 },
    { label: '$49.99', val: 49.99 }
  ];

  const fetchPricing = async (price) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/aso/ppp-pricing?basePrice=${price}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch PPP pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing(basePrice);
  }, []);

  const handleApplyPreset = (val) => {
    setBasePrice(val);
    fetchPricing(val);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    fetchPricing(basePrice);
  };

  const filteredCountries = data?.countries?.filter(c => {
    if (selectedTier === 'all') return true;
    return String(c.tier) === String(selectedTier);
  }) || [];

  const severeOverpricedCount = data?.countries?.filter(c => c.overpricingPercentage >= 80).length || 0;

  const copyAsCsv = () => {
    if (!data?.countries) return;
    const headers = "CountryCode,Country,Currency,NominalPrice,RecommendedPPPPrice,EffectiveUSD,OverpricingGap,EstimatedCVRLift\n";
    const rows = data.countries.map(c => 
      `"${c.countryCode}","${c.countryName}","${c.currency}","${c.nominalFormatted}","${c.recommendedFormatted}","${c.effectiveUsdPrice}","+${c.overpricingPercentage}%","${c.estimatedCvrLift}"`
    ).join("\n");
    navigator.clipboard.writeText(headers + rows);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DollarSign size={16} />
            </span>
            <h3 className="text-sm font-bold text-white">Purchasing Power Parity (PPP) Pricing Optimizer</h3>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded-full font-medium">
              World Bank & Big Mac Index
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Detect overpricing in developing markets. Adjusting local store tiers to local purchasing power lifts conversion by up to 400%.
          </p>
        </div>

        <button
          onClick={copyAsCsv}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start md:self-auto border border-white/5"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{copied ? 'Copied CSV' : 'Export Table CSV'}</span>
        </button>
      </div>

      {/* Base Price Controls */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-950/70 rounded-xl border border-white/5">
        <span className="text-xs font-bold text-slate-300">Base USD Price:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map(p => (
            <button
              key={p.val}
              onClick={() => handleApplyPreset(p.val)}
              className={clsx(
                "px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all",
                basePrice === p.val
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5 ml-auto">
          <div className="relative">
            <span className="absolute left-2.5 top-2 text-xs text-slate-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0.49"
              value={basePrice}
              onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
              className="w-24 bg-slate-900 border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all"
          >
            Calculate
          </button>
        </form>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-white/5">
          <div className="text-[11px] text-slate-400">Total Covered Markets</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {data?.totalMarkets || 28} Countries
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Top App Store & Google Play regions</div>
        </div>

        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-rose-500/10">
          <div className="text-[11px] text-rose-300">Critically Overpriced Markets</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {severeOverpricedCount} Markets
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">&gt;80% above local median purchasing power</div>
        </div>

        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-emerald-500/10">
          <div className="text-[11px] text-emerald-300">Max Projected CVR Lift</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            +350% to +500%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">In India, Brazil, Turkey, Indonesia</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 text-xs border-b border-white/5 pb-2">
        <span className="text-slate-400 text-[11px] mr-2">Filter Market Tier:</span>
        {[
          { id: 'all', label: 'All Markets' },
          { id: '1', label: 'Tier 1 (Developed)' },
          { id: '2', label: 'Tier 2 (Growth)' },
          { id: '3', label: 'Tier 3 (Emerging / High Lift)' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedTier(t.id)}
            className={clsx(
              "px-3 py-1 rounded-lg text-xs font-medium transition-all",
              selectedTier === t.id
                ? "bg-white/10 text-white font-bold"
                : "text-slate-400 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[11px] text-slate-400">
              <th className="pb-2 font-medium">Market / Country</th>
              <th className="pb-2 font-medium">Default Store FX Price</th>
              <th className="pb-2 font-medium">Fair PPP Price</th>
              <th className="pb-2 font-medium">Effective USD</th>
              <th className="pb-2 font-medium">Overpricing Gap</th>
              <th className="pb-2 font-medium">Est. CVR Uplift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredCountries.map(c => (
              <tr key={c.countryCode} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 font-medium text-white flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded">
                    {c.countryCode}
                  </span>
                  <span>{c.countryName}</span>
                </td>
                <td className="py-2.5 text-slate-400 font-mono">
                  {c.nominalFormatted}
                </td>
                <td className="py-2.5 font-mono font-bold text-emerald-400">
                  {c.recommendedFormatted}
                </td>
                <td className="py-2.5 text-slate-300 font-mono">
                  ${c.effectiveUsdPrice.toFixed(2)}
                </td>
                <td className="py-2.5">
                  {c.overpricingPercentage > 0 ? (
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold",
                      c.overpricingPercentage >= 100
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    )}>
                      +{c.overpricingPercentage}% Overpriced
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">Baseline</span>
                  )}
                </td>
                <td className="py-2.5">
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                    c.tier === 3 ? "bg-emerald-500/20 text-emerald-300" :
                    c.tier === 2 ? "bg-blue-500/20 text-blue-300" :
                    "bg-slate-800 text-slate-400"
                  )}>
                    {c.estimatedCvrLift}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
