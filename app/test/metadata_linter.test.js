const assert = require('assert');
const { lintMetadata, getUtf8ByteLength } = require('../lib/aso/metadataLinter');

console.log('Testing Pre-Flight Store Policy & Metadata Linter...');

// 1. Byte length calculation test (UTF-8 multi-byte check)
assert.strictEqual(getUtf8ByteLength('abc'), 3);
assert.strictEqual(getUtf8ByteLength('日本語'), 9); // 3 bytes per Japanese char
assert.strictEqual(getUtf8ByteLength('🔥'), 4); // 4 bytes for emoji

// 2. Apple Keyword 100-byte overflow test
const longKeywordString = 'fitness,workout,health,exercise,bodybuilding,weightloss,diet,calorie,running,marathon,gym,cardio,lift';
const appleByteTest = lintMetadata({
  platform: 'apple',
  title: 'MyFit App',
  subtitle: 'Daily Tracker',
  keywords: longKeywordString
});
assert.strictEqual(appleByteTest.valid, false, 'Should fail when keywords exceed 100 bytes');
assert(appleByteTest.errors.some(e => e.field === 'keywords' && e.message.includes('100-byte')), 'Should report 100-byte error');

// 3. Apple Keyword comma-space optimization warning
const commaSpaceTest = lintMetadata({
  platform: 'apple',
  title: 'MyFit',
  keywords: 'workout, fitness, gym'
});
assert(commaSpaceTest.warnings.some(w => w.message.includes('spaces after commas')), 'Should warn about spaces after commas');
assert.strictEqual(commaSpaceTest.fixes.keywords, 'workout,fitness,gym', 'Should provide sanitized keyword fix');

// 4. Duplicate keyword in title & subtitle warning
const dupTest = lintMetadata({
  platform: 'apple',
  title: 'MyFit Workout Planner',
  subtitle: 'Best Fitness Tool',
  keywords: 'workout,fitness,yoga'
});
assert(dupTest.warnings.some(w => w.message.includes('already in Title/Subtitle')), 'Should warn about keywords repeated from title/subtitle');

// 5. Banned pricing & unverified claims test
const claimTest = lintMetadata({
  platform: 'apple',
  title: 'Free Workout #1 App',
  subtitle: 'Cheap Gym Trainer'
});
assert.strictEqual(claimTest.valid, false, 'Should fail for "#1" and "Free" claims');
assert(claimTest.errors.some(e => e.message.includes('#1')), 'Should catch #1 claim');
assert(claimTest.errors.some(e => e.message.includes('Pricing/promotional')), 'Should catch Free / Cheap claim');

// 6. Google Play Title length & Emoji check
const playEmojiTest = lintMetadata({
  platform: 'play',
  title: 'Workout App 🔥'
});
assert.strictEqual(playEmojiTest.valid, false, 'Google Play should reject emoji in title');
assert(playEmojiTest.errors.some(e => e.field === 'title' && e.message.includes('emojis')), 'Should catch emoji error');

// 7. Clean valid metadata test
const validTest = lintMetadata({
  platform: 'apple',
  title: 'Apex Tracker',
  subtitle: 'Daily Habits & Routine',
  keywords: 'planner,journal,streak,goals,focus',
  description: 'Clean description under limit.'
});
assert.strictEqual(validTest.valid, true, 'Clean metadata should be valid');
assert.strictEqual(validTest.errors.length, 0);
assert.strictEqual(validTest.score, 100);

console.log('✓ All Pre-Flight Store Policy & Metadata Linter tests passed successfully!');
