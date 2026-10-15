const assert = require('assert');
const { calculatePppPricing } = require('../lib/aso/pppPricing');

console.log('Testing Purchasing Power Parity (PPP) Pricing Calculator...');

// 1. Basic calculation for $10
const res = calculatePppPricing(10.00);
assert.strictEqual(res.baseUsdPrice, 10.00);
assert(res.countries.length > 20, 'Should cover over 20 countries');

// 2. US baseline check
const us = res.countries.find(c => c.countryCode === 'US');
assert(us, 'US must exist');
assert.strictEqual(us.pppFactor, 1.0);
assert.strictEqual(us.effectiveUsdPrice, 10.00);
assert.strictEqual(us.overpricingPercentage, 0);

// 3. Emerging market checks (India & Brazil)
const india = res.countries.find(c => c.countryCode === 'IN');
assert(india, 'India must exist');
assert(india.pppFactor <= 0.35, 'India PPP factor should be around ~0.30');
assert(india.effectiveUsdPrice < 5.0, 'Effective USD price in India should be discounted');
assert(india.overpricingPercentage > 100, 'Nominal USD is >100% overpriced relative to Indian purchasing power');
assert(india.estimatedCvrLift.includes('x'), 'Should provide estimated CVR multiplier');

const brazil = res.countries.find(c => c.countryCode === 'BR');
assert(brazil, 'Brazil must exist');
assert(brazil.recommendedLocalPrice < brazil.nominalLocalPrice, 'Recommended price must be lower than nominal FX price in Brazil');

// 4. Fallback on invalid / empty inputs
const fallback = calculatePppPricing(-5);
assert.strictEqual(fallback.baseUsdPrice, 0.49, 'Should enforce minimum base price');

console.log('✓ All Purchasing Power Parity (PPP) Pricing tests passed successfully!');
