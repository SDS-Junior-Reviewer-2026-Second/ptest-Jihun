const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');

// DOM/socket simulation for acknowledgements and draft handling, not visual QA.
function setup() {
  const elements = new Map();
  class Element {
    constructor() { this.handlers = {}; this.children = []; this.dataset = {}; this.value = ''; this.textContent = ''; this.scrollTop = 0; this.scrollHeight = 0; this.clientHeight = 380; this.classList = { toggle() {} }; }
    addEventListener(type, fn) { this.handlers[type] = fn; }
    append(...children) { children.forEach(child => { child.parent = this; this.children.push(child); }); }
    replaceChildren(...children) { this.children.forEach(child => { child.parent = null; }); this.children = []; this.append(...children); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); elements.forEach((el, id) => { if (el === this) elements.delete(id); }); }
    get firstElementChild() { return this.children[0]; }
  }
  const html = fs.readFileSync(new URL('../index.html', 'file://' + __filename), 'utf8');
  for (const [, id] of html.matchAll(/id="(guestbook-[^"]+)"/g)) elements.set(id, new Element());
  const $ = id => elements.get(id);
  $('guestbook-entries').append($('guestbook-empty'));
  const sockets = [];
  class Socket {
    static OPEN = 1;
    constructor() { this.readyState = 1; this.sent = []; sockets.push(this); }
    send(raw) { this.sent.push(JSON.parse(raw)); }
    close() { this.readyState = 3; this.onclose?.(); }
    receive(packet) { this.onmessage({ data: JSON.stringify(packet) }); }
  }
  const timers = new Map(); let seq = 0;
  const context = {
    document: { getElementById: id => $(id) || null, createElement: () => new Element() },
    window: { addEventListener() {} }, navigator: { onLine: true },
    localStorage: { getItem() { return null; }, setItem() {} }, WebSocket: Socket, crypto: webcrypto,
    setTimeout(fn) { timers.set(++seq, fn); return seq; }, clearTimeout(id) { timers.delete(id); }, setInterval() { return 0; }, clearInterval() {},
  };
  vm.runInNewContext(fs.readFileSync(new URL('../assets/guestbook.js', 'file://' + __filename), 'utf8'), context);
  const submit = () => $('guestbook-form').handlers.submit({ preventDefault() {} });
  const history = (socket, messages = []) => socket.receive({ type: 'history', author: 'me', messages });
  return { $, sockets, submit, history };
}

test('client waits for server acknowledgement, preserves edits, and renders user HTML as text', () => {
  const { $, sockets, submit, history } = setup(), socket = sockets[0];
  history(socket);
  $('guestbook-name').value = '별명'; $('guestbook-message').value = '첫 메시지'; submit();
  assert.equal($('guestbook-message').value, '첫 메시지');
  assert.equal($('guestbook-send').disabled, true);
  const sent = socket.sent[0];
  $('guestbook-message').value = '다음 메시지 작성 중';
  socket.receive({ type: 'message', message: { ...sent, id: 'm1', author: 'me', createdAt: 1 } });
  assert.equal($('guestbook-message').value, '다음 메시지 작성 중');
  assert.equal($('guestbook-send').disabled, false);
  socket.receive({ type: 'message', message: { id: 'm2', name: '<img>', text: '<script>alert(1)</script>', author: 'other', createdAt: 2 } });
  assert.equal($('guestbook-entries').children.at(-1).children[1].textContent, '<script>alert(1)</script>');
});

test('a lost acknowledgement recovered in reconnect history clears the original draft exactly once', () => {
  const { $, sockets, submit, history } = setup();
  history(sockets[0]);
  $('guestbook-name').value = '별명'; $('guestbook-message').value = '연결 테스트'; submit();
  const sent = sockets[0].sent[0]; sockets[0].close();
  assert.equal($('guestbook-message').value, '연결 테스트');
  assert.equal($('guestbook-send').disabled, true);
  $('guestbook-reconnect').handlers.click();
  history(sockets[1], [{ ...sent, id: 'saved', author: 'old-connection', createdAt: 3 }]);
  assert.equal($('guestbook-message').value, '');
  assert.equal($('guestbook-entries').children.length, 1);
  assert.equal($('guestbook-entries').children[0].dataset.mine, 'true');
  assert.equal($('guestbook-send').disabled, false);
});
