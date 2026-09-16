(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('guestbook-form')) return;
  const ENDPOINT = 'wss://jihun-chat-proxy.jihunpark.workers.dev/guestbook';
  const log = $('guestbook-entries'), input = $('guestbook-message'), name = $('guestbook-name');
  let socket, ready = false, retryTimer, heartbeat, ackTimer, connectTimer, attempts = 0, pending = null, requestId = null, lastDraft = null, author = '', stopped = false;
  let received = new Set(), ownIds = new Set();
  try { name.value = localStorage.getItem('jihun-guestbook-name') || '방문자'; } catch (_) {}
  function connection(text, online) {
    $('guestbook-connection').textContent = text;
    $('guestbook-dot').classList.toggle('is-online', online);
    $('guestbook-send').disabled = !online || Boolean(pending);
  }
  function count() { $('guestbook-count').textContent = input.value.length + ' / 300'; }
  function nearBottom() { return log.scrollHeight - log.scrollTop - log.clientHeight < 70; }
  function bottom() { log.scrollTop = log.scrollHeight; $('guestbook-latest').hidden = true; }
  function acknowledge(message) {
    if (!pending || message.requestId !== pending.requestId) return;
    ownIds.add(message.id);
    if (input.value.trim().normalize('NFC') === pending.text) { input.value = ''; count(); }
    pending = null; requestId = null; clearTimeout(ackTimer);
    $('guestbook-status').textContent = '메시지를 남겼어요.';
    $('guestbook-send').disabled = !ready;
  }
  function append(message, history) {
    if (!message || typeof message.id !== 'string' || typeof message.name !== 'string' || typeof message.text !== 'string' || !Number.isFinite(message.createdAt)) return;
    acknowledge(message);
    if (received.has(message.id)) return;
    received.add(message.id);
    $('guestbook-empty')?.remove();
    const follow = nearBottom();
    const mine = message.author === author || ownIds.has(message.id);
    const article = document.createElement('article'); article.className = 'guestbook-bubble'; article.dataset.mine = String(mine); article.dataset.messageId = message.id;
    const who = document.createElement('strong'); who.textContent = message.name.slice(0, 24) + (mine ? ' · 나' : '');
    const text = document.createElement('p'); text.textContent = message.text.slice(0, 300);
    const time = document.createElement('time'); time.dateTime = new Date(message.createdAt).toISOString(); time.textContent = new Date(message.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    article.append(who, text, time); log.append(article);
    while (log.children.length > 200) { const first = log.firstElementChild; received.delete(first.dataset.messageId); ownIds.delete(first.dataset.messageId); first.remove(); }
    if (!history) {
      if (follow || mine) bottom(); else $('guestbook-latest').hidden = false;
    }
  }
  function retry() {
    if (stopped || retryTimer || !navigator.onLine) return;
    const delay = Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5));
    retryTimer = setTimeout(() => { retryTimer = null; connect(); }, delay);
  }
  function connect() {
    if (stopped) return;
    clearTimeout(retryTimer); retryTimer = null; clearInterval(heartbeat); clearTimeout(ackTimer); clearTimeout(connectTimer);
    if (socket) { socket.onclose = null; socket.onmessage = null; socket.close(); }
    ready = false;
    if (!navigator.onLine) { connection('오프라인 · 연결을 기다리는 중', false); return; }
    connection('사랑방에 연결 중', false);
    let ws;
    try { ws = new WebSocket(ENDPOINT); } catch (_) { connection('연결 실패 · 다시 시도 중', false); retry(); return; }
    socket = ws;
    connectTimer = setTimeout(() => { if (socket === ws && !ready) ws.close(); }, 12000);
    ws.onmessage = event => {
      if (socket !== ws || event.data === 'pong') return;
      let packet;
      try { packet = JSON.parse(event.data); } catch (_) { return; }
      if (packet.type === 'history' && Array.isArray(packet.messages)) {
        clearTimeout(connectTimer);
        author = packet.author;
        // Preserve old messages until the server has delivered the replacement history.
        log.replaceChildren(); received = new Set();
        packet.messages.forEach(message => append(message, true));
        if (!log.children.length) { const empty = document.createElement('p'); empty.id = 'guestbook-empty'; empty.className = 'daily-empty'; empty.textContent = '아직 인사가 없어요. 첫 메시지를 남겨주세요!'; log.append(empty); }
        if (pending) { pending = null; clearTimeout(ackTimer); $('guestbook-status').textContent = '전송 여부를 확인하지 못했어요. 내용은 남아 있으니 다시 보내주세요.'; }
        ready = true; attempts = 0; connection('실시간 연결됨', true); bottom();
        heartbeat = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('ping'); }, 25000);
      } else if (packet.type === 'message') append(packet.message, false);
      else if (packet.type === 'error') {
        if (!packet.requestId || pending?.requestId === packet.requestId) { pending = null; clearTimeout(ackTimer); }
        $('guestbook-status').textContent = typeof packet.message === 'string' ? packet.message : '전송에 실패했어요.';
        $('guestbook-send').disabled = !ready || Boolean(pending);
      }
    };
    ws.onclose = () => {
      if (socket !== ws) return;
      ready = false; clearInterval(heartbeat); clearTimeout(ackTimer); clearTimeout(connectTimer);
      connection(navigator.onLine ? '연결 끊김 · 자동 재연결 중' : '오프라인', false);
      $('guestbook-status').textContent = '연결을 기다리고 있어요. 작성 중인 메시지는 그대로 유지됩니다.';
      if (!received.size && $('guestbook-empty')) $('guestbook-empty').textContent = '아직 사랑방 서버에 연결할 수 없어요. 잠시 후 다시 연결해 주세요.';
      retry();
    };
    ws.onerror = () => { connection('연결할 수 없음 · 다시 시도 중', false); };
  }
  input.addEventListener('input', () => { count(); if (!pending) requestId = null; });
  name.addEventListener('input', () => { if (!pending) requestId = null; });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); $('guestbook-form').requestSubmit(); }
  });
  $('guestbook-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!ready || socket?.readyState !== WebSocket.OPEN || pending) { $('guestbook-status').textContent = '연결 또는 전송 완료를 기다려 주세요.'; return; }
    const nickname = name.value.normalize('NFC').trim(), text = input.value.normalize('NFC').trim();
    if (!nickname || !text) { $('guestbook-status').textContent = '별명과 메시지를 입력해 주세요.'; return; }
    if (nickname.length > 24 || text.length > 300) { $('guestbook-status').textContent = '별명은 24자, 메시지는 300자까지 남길 수 있어요.'; return; }
    try { localStorage.setItem('jihun-guestbook-name', nickname); } catch (_) {}
    if (lastDraft && (lastDraft.name !== nickname || lastDraft.text !== text)) requestId = null;
    requestId = requestId || crypto.randomUUID();
    lastDraft = { name: nickname, text };
    pending = { type: 'message', requestId, name: nickname, text };
    $('guestbook-send').disabled = true;
    $('guestbook-status').textContent = '보내는 중…';
    try {
      socket.send(JSON.stringify(pending));
      ackTimer = setTimeout(() => { $('guestbook-status').textContent = '전송 확인이 늦어져 다시 연결하고 있어요.'; socket.close(); }, 10000);
    } catch (_) { pending = null; socket.close(); }
  });
  $('guestbook-latest').addEventListener('click', bottom);
  log.addEventListener('scroll', () => { if (nearBottom()) $('guestbook-latest').hidden = true; });
  $('guestbook-reconnect').addEventListener('click', () => { attempts = 0; connect(); });
  window.addEventListener('online', connect);
  window.addEventListener('offline', () => { ready = false; connection('오프라인', false); socket?.close(); });
  window.addEventListener('pagehide', () => { stopped = true; clearTimeout(retryTimer); clearTimeout(ackTimer); clearTimeout(connectTimer); clearInterval(heartbeat); socket?.close(); });
  window.addEventListener('pageshow', () => { if (stopped) { stopped = false; connect(); } });
  connect();
})();
