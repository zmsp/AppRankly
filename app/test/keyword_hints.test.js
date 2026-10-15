const assert = require('assert');
const { getKeywordHints, fetchAppleHints, fetchGoogleHints } = require('../lib/aso/keywordHints');

async function runTests() {
  console.log('Testing Zero-Auth Keyword Hints & Volume Radar...');

  // 1. Empty term handling
  const emptyRes = await getKeywordHints({ term: '' });
  assert.strictEqual(emptyRes.total, 0, 'Empty term should return 0 keywords');
  assert.deepStrictEqual(emptyRes.keywords, [], 'Empty term returns empty array');

  // 2. Format and fields validation with simulated inputs
  // Test Apple hints live if network available, or mock if offline
  const appleResults = await fetchAppleHints('habit');
  assert(Array.isArray(appleResults), 'Apple hints should return an array');

  const googleResults = await fetchGoogleHints('habit');
  assert(Array.isArray(googleResults), 'Google hints should return an array');

  // 3. getKeywordHints comprehensive structure
  const hints = await getKeywordHints({ term: 'habit', platform: 'all', expand: true });
  assert.strictEqual(typeof hints.term, 'string');
  assert(hints.total >= 0);
  assert(Array.isArray(hints.keywords));

  if (hints.keywords.length > 0) {
    const first = hints.keywords[0];
    assert(first.term, 'Keyword should have term property');
    assert(first.score >= 10 && first.score <= 100, 'Score should be between 10 and 100');
    assert(typeof first.wordCount === 'number');
    assert(typeof first.charCount === 'number');
    assert(typeof first.isLongTail === 'boolean');
    assert(Array.isArray(first.platforms));
  }

  // 4. Platform filtering test
  const appleOnly = await getKeywordHints({ term: 'habit', platform: 'apple' });
  assert(appleOnly.keywords.every(k => k.platforms.includes('apple')), 'All keywords in apple mode should include apple');

  console.log('✓ All Zero-Auth Keyword Hints tests passed successfully!');
}

runTests().catch(err => {
  console.error('Keyword Hints test failed:', err);
  process.exit(1);
});
