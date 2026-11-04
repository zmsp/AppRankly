const assert = require('assert');
const { validateReadOnlySql, getDatabaseSchemaSummary, generateExecutiveBrief } = require('../lib/ai/textToSql');

console.log('Testing Text-to-SQL Analyst & Executive Brief Engine...');

// 1. Valid SELECT queries
const valid1 = validateReadOnlySql('SELECT id, term FROM aso_keyword WHERE tracked = 1');
assert.strictEqual(valid1.valid, true);
assert(valid1.sql.includes('LIMIT 50'), 'Should append safety LIMIT 50 when absent');

const valid2 = validateReadOnlySql('SELECT * FROM campaign_links LIMIT 10');
assert.strictEqual(valid2.valid, true);
assert.strictEqual(valid2.sql, 'SELECT * FROM campaign_links LIMIT 10', 'Preserves existing LIMIT');

// 2. Destructive SQL injection prevention
const dropTest = validateReadOnlySql('DROP TABLE apps');
assert.strictEqual(dropTest.valid, false, 'Should block DROP statement');

const insertTest = validateReadOnlySql('INSERT INTO aso_keyword (term) VALUES ("hack")');
assert.strictEqual(insertTest.valid, false, 'Should block INSERT statement');

const deleteTest = validateReadOnlySql('DELETE FROM metadata_timeline');
assert.strictEqual(deleteTest.valid, false, 'Should block DELETE statement');

const multiStmt = validateReadOnlySql('SELECT 1; DROP TABLE users;');
assert.strictEqual(multiStmt.valid, false, 'Should block semicolon multi-statements');

const commentInjection = validateReadOnlySql('SELECT * FROM apps -- comment injection');
assert.strictEqual(commentInjection.valid, false, 'Should block SQL comments');

const pragmaTest = validateReadOnlySql('PRAGMA table_info(apps)');
assert.strictEqual(pragmaTest.valid, false, 'Should block PRAGMA inspection');

// 3. Schema summary inspection
const schema = getDatabaseSchemaSummary();
assert(typeof schema === 'string', 'Schema should return string summary');
assert(schema.includes('aso_keyword') || schema.includes('campaign_links'), 'Schema should list application tables');

// 4. Executive Brief Generation
generateExecutiveBrief().then(brief => {
  assert(brief.timestamp, 'Executive brief must have timestamp');
  assert(Array.isArray(brief.summaryBullets), 'Brief should contain bullet points');
  assert(brief.summaryBullets.length >= 4, 'Should contain 4 core portfolio bullets');
  assert(typeof brief.metrics === 'object', 'Should include raw metrics map');

  console.log('✓ All Text-to-SQL Analyst tests passed successfully!');
}).catch(err => {
  console.error('Text-to-SQL test error:', err);
  process.exit(1);
});
