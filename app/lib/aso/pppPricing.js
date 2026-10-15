/**
 * Purchasing Power Parity (PPP) Pricing Calculator
 * Computes fair, localized pricing across global App Store & Google Play markets
 * based on World Bank PPP factors and Big Mac Index parity.
 */

// PPP adjustment factors relative to US Dollar (1.0 = baseline USA)
// Factors < 1.0 indicate lower purchasing power where standard FX is overpriced
const PPP_COUNTRY_DATA = {
  us: { name: 'United States', code: 'US', currency: 'USD', symbol: '$', pppFactor: 1.0, tier: 1 },
  ca: { name: 'Canada', code: 'CA', currency: 'CAD', symbol: 'CA$', pppFactor: 0.95, tier: 1 },
  gb: { name: 'United Kingdom', code: 'GB', currency: 'GBP', symbol: '£', pppFactor: 0.92, tier: 1 },
  de: { name: 'Germany', code: 'DE', currency: 'EUR', symbol: '€', pppFactor: 0.90, tier: 1 },
  fr: { name: 'France', code: 'FR', currency: 'EUR', symbol: '€', pppFactor: 0.88, tier: 1 },
  au: { name: 'Australia', code: 'AU', currency: 'AUD', symbol: 'A$', pppFactor: 0.95, tier: 1 },
  jp: { name: 'Japan', code: 'JP', currency: 'JPY', symbol: '¥', pppFactor: 0.82, tier: 1 },
  kr: { name: 'South Korea', code: 'KR', currency: 'KRW', symbol: '₩', pppFactor: 0.78, tier: 1 },
  it: { name: 'Italy', code: 'IT', currency: 'EUR', symbol: '€', pppFactor: 0.80, tier: 2 },
  es: { name: 'Spain', code: 'ES', currency: 'EUR', symbol: '€', pppFactor: 0.75, tier: 2 },
  pl: { name: 'Poland', code: 'PL', currency: 'PLN', symbol: 'zł', pppFactor: 0.58, tier: 2 },
  cz: { name: 'Czech Republic', code: 'CZ', currency: 'CZK', symbol: 'Kč', pppFactor: 0.62, tier: 2 },
  mx: { name: 'Mexico', code: 'MX', currency: 'MXN', symbol: 'Mex$', pppFactor: 0.48, tier: 2 },
  br: { name: 'Brazil', code: 'BR', currency: 'BRL', symbol: 'R$', pppFactor: 0.42, tier: 3 },
  tr: { name: 'Turkey', code: 'TR', currency: 'TRY', symbol: '₺', pppFactor: 0.32, tier: 3 },
  in: { name: 'India', code: 'IN', currency: 'INR', symbol: '₹', pppFactor: 0.30, tier: 3 },
  id: { name: 'Indonesia', code: 'ID', currency: 'IDR', symbol: 'Rp', pppFactor: 0.35, tier: 3 },
  ph: { name: 'Philippines', code: 'PH', currency: 'PHP', symbol: '₱', pppFactor: 0.38, tier: 3 },
  vn: { name: 'Vietnam', code: 'VN', currency: 'VND', symbol: '₫', pppFactor: 0.32, tier: 3 },
  th: { name: 'Thailand', code: 'TH', currency: 'THB', symbol: '฿', pppFactor: 0.45, tier: 3 },
  my: { name: 'Malaysia', code: 'MY', currency: 'MYR', symbol: 'RM', pppFactor: 0.45, tier: 2 },
  za: { name: 'South Africa', code: 'ZA', currency: 'ZAR', symbol: 'R', pppFactor: 0.40, tier: 3 },
  ng: { name: 'Nigeria', code: 'NG', currency: 'NGN', symbol: '₦', pppFactor: 0.25, tier: 3 },
  co: { name: 'Colombia', code: 'CO', currency: 'COP', symbol: 'COL$', pppFactor: 0.38, tier: 3 },
  ar: { name: 'Argentina', code: 'AR', currency: 'ARS', symbol: 'AR$', pppFactor: 0.30, tier: 3 },
  cl: { name: 'Chile', code: 'CL', currency: 'CLP', symbol: 'CLP$', pppFactor: 0.52, tier: 2 },
  eg: { name: 'Egypt', code: 'EG', currency: 'EGP', symbol: 'E£', pppFactor: 0.28, tier: 3 },
  pk: { name: 'Pakistan', code: 'PK', currency: 'PKR', symbol: 'Rs', pppFactor: 0.22, tier: 3 }
};

// Approximate nominal FX rates to 1 USD for display
const APPROX_FX_RATES = {
  USD: 1.0,
  CAD: 1.38,
  GBP: 0.79,
  EUR: 0.92,
  AUD: 1.54,
  JPY: 155.0,
  KRW: 1380.0,
  PLN: 4.02,
  CZK: 23.5,
  MXN: 19.8,
  BRL: 5.65,
  TRY: 34.5,
  INR: 84.2,
  IDR: 15600.0,
  PHP: 57.5,
  VND: 25200.0,
  THB: 33.5,
  MYR: 4.32,
  ZAR: 17.8,
  NGN: 1650.0,
  COP: 4250.0,
  ARS: 990.0,
  CLP: 940.0,
  EGP: 48.5,
  PKR: 278.0
};

/**
 * Format currency nicely for display
 */
function formatLocalPrice(amount, currency, symbol) {
  if (['JPY', 'KRW', 'IDR', 'VND', 'CLP', 'COP', 'ARS'].includes(currency)) {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Calculate PPP recommended pricing table for a given base price
 */
function calculatePppPricing(baseUsdPrice = 9.99) {
  const base = Math.max(0.49, Number(baseUsdPrice) || 9.99);

  const countries = Object.entries(PPP_COUNTRY_DATA).map(([key, country]) => {
    const fxRate = APPROX_FX_RATES[country.currency] || 1.0;
    const nominalLocalPrice = base * fxRate;
    const pppAdjustedLocalPrice = base * fxRate * country.pppFactor;
    const effectiveUsdEquivalent = base * country.pppFactor;

    // Overpricing gap compared to local purchasing power
    const overpricingPercentage = country.pppFactor < 1.0
      ? Math.round(((1 - country.pppFactor) / country.pppFactor) * 100)
      : 0;

    // Estimated conversion rate uplift multiplier if PPP adjusted
    let estimatedCvrLift = '1.0x';
    if (country.pppFactor <= 0.35) estimatedCvrLift = '3.5x - 5.0x';
    else if (country.pppFactor <= 0.50) estimatedCvrLift = '2.5x - 3.5x';
    else if (country.pppFactor <= 0.70) estimatedCvrLift = '1.8x - 2.5x';
    else if (country.pppFactor < 0.90) estimatedCvrLift = '1.2x - 1.5x';

    return {
      countryCode: country.code,
      countryName: country.name,
      currency: country.currency,
      currencySymbol: country.symbol,
      tier: country.tier,
      pppFactor: country.pppFactor,
      nominalLocalPrice: Number(nominalLocalPrice.toFixed(2)),
      nominalFormatted: formatLocalPrice(nominalLocalPrice, country.currency, country.symbol),
      recommendedLocalPrice: Number(pppAdjustedLocalPrice.toFixed(2)),
      recommendedFormatted: formatLocalPrice(pppAdjustedLocalPrice, country.currency, country.symbol),
      effectiveUsdPrice: Number(effectiveUsdEquivalent.toFixed(2)),
      overpricingPercentage,
      estimatedCvrLift
    };
  });

  return {
    baseUsdPrice: base,
    totalMarkets: countries.length,
    countries
  };
}

module.exports = {
  calculatePppPricing,
  PPP_COUNTRY_DATA,
  APPROX_FX_RATES
};
