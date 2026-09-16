const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/daily-core.js');

test('Korean midnight switches the shared daily fortune, independent of client timezone', () => {
  assert.equal(core.dayKey(new Date('2026-09-16T14:59:59Z')), '2026-09-16');
  assert.equal(core.dayKey(new Date('2026-09-16T15:00:00Z')), '2026-09-17');
  const messages = new Set();
  for (let i = 0; i < 40; i++) {
    const day = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    const fortune = core.fortuneFor(day);
    assert.ok(fortune.label && fortune.message && fortune.lucky);
    assert.ok(fortune.number >= 1 && fortune.number <= 99);
    assert.deepEqual(fortune, core.fortuneFor(day));
    messages.add(fortune.message);
  }
  assert.ok(messages.size > 1);
});

test('saved data is validated and the previous day does not leak into the next fortune', () => {
  const day = '2026-09-16';
  const restored = core.restore({ version: 'v1', day, fortuneOpened: 'yes' }, day);
  assert.equal(restored.fortuneOpened, false);
  const opened = core.restore({ version: 'v1', day, fortuneOpened: true }, day);
  assert.equal(opened.fortuneOpened, true);
  assert.equal(core.restore(opened, '2026-09-17').fortuneOpened, false);
  assert.equal(core.restore({ version: 'v0', day, fortuneOpened: true }, day).fortuneOpened, false);
  assert.equal(core.restore(null, day).day, day);
});
