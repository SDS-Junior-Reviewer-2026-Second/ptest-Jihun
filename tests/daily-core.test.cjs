const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/daily-core.js');

test('Korean midnight switches the shared daily puzzle, independent of client timezone', () => {
  assert.equal(core.dayKey(new Date('2026-09-16T14:59:59Z')), '2026-09-16');
  assert.equal(core.dayKey(new Date('2026-09-16T15:00:00Z')), '2026-09-17');
  const answers = new Set();
  for (let i = 0; i < core.words.length; i++) {
    const day = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    const answer = core.answerFor(day);
    assert.ok(core.words.includes(answer)); answers.add(answer);
    const ranking = core.rankingFor(day);
    assert.equal(ranking[0].word, answer);
    assert.equal(ranking[0].score, 100);
    assert.equal(ranking.filter(row => row.score === 100).length, 1);
    assert.equal(ranking[0].rank, 1);
    ranking.slice(1).forEach((row, j) => {
      assert.ok(Number.isFinite(row.score) && row.score >= 0 && row.score < 100);
      assert.equal(row.rank, row.score === ranking[j].score ? ranking[j].rank : j + 2);
    });
  }
  assert.equal(answers.size, core.words.length);
  assert.equal(new Set(core.words).size, core.words.length);
});

test('meaning-related words score above unrelated words; unknown words do not get a fake score', () => {
  assert.ok(core.similarity('김치찌개', '김치전골') > core.similarity('김치찌개', '컴퓨터'));
  assert.ok(core.similarity('행복', '기쁨') > core.similarity('행복', '메모리'));
  assert.equal(core.similarity('없는단어', '점심'), null);
  assert.equal(core.normalize('  점심  '), '점심');
});

test('saved data is validated and previous-day guesses do not leak into the next puzzle', () => {
  const day = '2026-09-16', answer = core.answerFor(day);
  const guesses = ['점심', '점심', null, '<script>', answer, '커피'];
  const restored = core.restore({ version: 'v1', day, guesses, hints: 900, fortuneOpened: 'yes' }, day);
  assert.equal(restored.hints, 2);
  assert.equal(restored.fortuneOpened, false);
  assert.equal(restored.guesses.at(-1), answer);
  assert.equal(new Set(restored.guesses).size, restored.guesses.length);
  assert.equal(core.restore(restored, '2026-09-17').guesses.length, 0);
  assert.equal(core.restore({ version: 'v1', day, guesses: {}, hints: NaN }, day).guesses.length, 0);
  assert.deepEqual(core.fortuneFor(day), core.fortuneFor(day));
  assert.ok(core.fortuneFor(day).number >= 1 && core.fortuneFor(day).number <= 99);
});
