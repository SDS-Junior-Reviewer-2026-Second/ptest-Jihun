(function () {
  'use strict';
  const core = window.JihunDaily;
  if (!core || !document.getElementById('word-game')) return;
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'jihun-daily-v1';
  let state, ranking, ranks;
  function storageNotice() { $('daily-storage').textContent = '브라우저 저장을 사용할 수 없어 새로고침하면 기록이 초기화됩니다.'; }
  function read() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
    catch (_) { storageNotice(); return null; }
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { storageNotice(); } }
  function solved() { return state.guesses.includes(core.answerFor(state.day)); }
  function loadDay() {
    state = core.restore(read(), core.dayKey());
    ranking = core.rankingFor(state.day);
    ranks = new Map(ranking.map(row => [row.word, row]));
    $('word-date').textContent = state.day + ' · 한국 시간 자정에 새 단어';
    $('fortune-date').textContent = state.day + ' · 오늘의 행운';
    $('word-input').value = '';
    $('word-status').textContent = state.guesses.length ? '오늘의 추측 기록을 불러왔어요.' : '단어를 입력해 첫 추측을 시작하세요.';
    $('fortune-status').textContent = '';
    renderWord(); renderFortune();
  }
  function ensureDay() {
    if (core.dayKey() === state.day) return false;
    loadDay();
    $('word-status').textContent = '새로운 날의 문제가 도착했어요. 다시 도전해 보세요!';
    return true;
  }
  function renderWord() {
    const won = solved();
    $('word-input').disabled = won;
    $('word-submit').disabled = won;
    $('word-hint').disabled = won || state.hints >= 2;
    $('word-hint').textContent = '힌트 보기 (' + state.hints + '/2)';
    $('word-share').hidden = !won;
    const answer = core.answerFor(state.day);
    const hints = [];
    if (state.hints > 0) hints.push('첫 글자: ' + answer[0] + ' · ' + answer.length + '글자');
    if (state.hints > 1) hints.push('가까운 단어: ' + ranking[1].word);
    $('word-hints').textContent = hints.join(' / ');
    if (won) $('word-status').textContent = '정답은 「' + answer + '」! ' + state.guesses.length + '번 만에 성공. 내일 다시 만나요.';
    const rows = state.guesses.map((word, i) => ({ ...ranks.get(word), attempt: i + 1 })).sort((a, b) => b.score - a.score || b.attempt - a.attempt);
    $('word-history').replaceChildren();
    if (!rows.length) {
      const row = document.createElement('tr'), cell = document.createElement('td');
      cell.colSpan = 4; cell.className = 'daily-empty'; cell.textContent = '아직 추측한 단어가 없어요.';
      row.append(cell); $('word-history').append(row);
    }
    rows.forEach(item => {
      const row = document.createElement('tr');
      row.dataset.latest = String(item.attempt === state.guesses.length);
      row.dataset.solved = String(item.score === 100);
      [item.attempt, item.word, item.score.toFixed(2), item.rank + '위'].forEach(value => {
        const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell);
      });
      $('word-history').append(row);
    });
  }
  $('word-form').addEventListener('submit', event => {
    event.preventDefault();
    if (ensureDay() || solved()) return;
    const word = core.normalize($('word-input').value);
    if (!word) { $('word-status').textContent = '추측할 단어를 입력해 주세요.'; return; }
    if (!ranks.has(word)) { $('word-status').textContent = '아직 사전에 없는 단어예요. 게임 안내의 단어 사전을 확인해 주세요.'; return; }
    if (state.guesses.includes(word)) { $('word-status').textContent = '이미 추측한 단어예요. 다른 단어를 입력해 주세요.'; return; }
    state.guesses.push(word); save(); renderWord();
    if (!solved()) {
      const result = ranks.get(word);
      $('word-status').textContent = word + ' · 유사도 ' + result.score.toFixed(2) + ' · ' + result.rank + '위';
      $('word-input').value = ''; $('word-input').focus();
    }
  });
  $('word-hint').addEventListener('click', () => {
    if (ensureDay() || solved() || state.hints >= 2) return;
    state.hints++; save(); renderWord();
    $('word-status').textContent = $('word-hints').textContent;
  });
  function renderDictionary() {
    const filter = core.normalize($('word-dictionary-filter').value);
    const results = core.words.filter(word => word.includes(filter));
    $('word-dictionary').textContent = results.length ? results.length + '개 · ' + results.join(' · ') : '등록된 단어가 없어요.';
  }
  $('word-dictionary-filter').addEventListener('input', renderDictionary);
  async function copy(text, statusId) {
    try {
      await navigator.clipboard.writeText(text);
      $(statusId).textContent = '복사했어요. 원하는 곳에 붙여넣어 주세요!';
    } catch (_) {
      $(statusId).textContent = '자동 복사를 사용할 수 없어요. 아래 내용을 선택해 복사해 주세요: ' + text;
    }
  }
  $('word-share').addEventListener('click', () => {
    if (ensureDay() || !solved()) return;
    copy('지훈 꼬맨틀 미니 ' + state.day + '\n' + state.guesses.length + '번 만에 성공 · 힌트 ' + state.hints + '/2\n' + location.href.split('#')[0] + '#word-game', 'word-status');
  });
  function renderFortune() {
    const fortune = core.fortuneFor(state.day);
    $('fortune-open').hidden = state.fortuneOpened;
    $('fortune-teaser').hidden = state.fortuneOpened;
    $('fortune-result').hidden = !state.fortuneOpened;
    $('fortune-cookie').classList.toggle('is-open', state.fortuneOpened);
    if (state.fortuneOpened) {
      $('fortune-label').textContent = fortune.label;
      $('fortune-message').textContent = fortune.message;
      $('fortune-lucky').textContent = '행운의 단어: ' + fortune.lucky + ' · 행운의 숫자: ' + fortune.number;
    }
  }
  $('fortune-open').addEventListener('click', () => {
    ensureDay(); state.fortuneOpened = true; save(); renderFortune();
    $('fortune-status').textContent = '오늘의 쿠키를 열었어요. 내일 새로운 행운을 만나보세요.';
    $('fortune-share').focus({ preventScroll: true });
  });
  $('fortune-share').addEventListener('click', () => {
    if (ensureDay() || !state.fortuneOpened) return;
    const fortune = core.fortuneFor(state.day);
    copy('🥠 오늘의 포춘쿠키 · ' + state.day + '\n' + fortune.message + '\n행운의 단어: ' + fortune.lucky + ' · 숫자: ' + fortune.number, 'fortune-status');
  });
  window.addEventListener('focus', ensureDay);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ensureDay(); });
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) loadDay(); });
  setInterval(ensureDay, 30000);
  loadDay(); renderDictionary();
})();
