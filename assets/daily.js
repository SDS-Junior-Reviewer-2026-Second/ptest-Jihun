(function () {
  'use strict';
  const core = window.JihunDaily;
  if (!core || !document.getElementById('fortune')) return;
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'jihun-daily-v1';
  let state;
  function storageNotice() { $('fortune-status').textContent = '브라우저 저장을 사용할 수 없어 새로고침하면 기록이 초기화됩니다.'; }
  function read() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
    catch (_) { storageNotice(); return null; }
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { storageNotice(); } }
  function loadDay() {
    state = core.restore(read(), core.dayKey());
    $('fortune-date').textContent = state.day + ' · 오늘의 행운';
    $('fortune-status').textContent = '';
    renderFortune();
  }
  function ensureDay() {
    if (core.dayKey() === state.day) return false;
    loadDay();
    $('fortune-status').textContent = '새로운 날의 쿠키가 도착했어요. 다시 열어보세요!';
    return true;
  }
  async function copy(text, statusId) {
    try {
      await navigator.clipboard.writeText(text);
      $(statusId).textContent = '복사했어요. 원하는 곳에 붙여넣어 주세요!';
    } catch (_) {
      $(statusId).textContent = '자동 복사를 사용할 수 없어요. 아래 내용을 선택해 복사해 주세요: ' + text;
    }
  }
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
  loadDay();
})();
