import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { GuestbookRoom } from '../cloudflare-worker/src/guestbook.js';
import worker from '../cloudflare-worker/src/index.js';

// Cloudflare socket API is simulated; production SQL runs on a real SQLite engine.
globalThis.WebSocketRequestResponsePair = class {};
function setup() {
  const db = new DatabaseSync(':memory:');
  const clients = [];
  const state = {
    storage: {
      sql: { exec(query, ...bindings) { const stmt = db.prepare(query); const result = stmt.columns().length ? stmt.all(...bindings) : (stmt.run(...bindings), []); return { toArray: () => result }; } },
      transactionSync(fn) { db.exec('BEGIN'); try { const value = fn(); db.exec('COMMIT'); return value; } catch (e) { db.exec('ROLLBACK'); throw e; } }
    },
    setWebSocketAutoResponse() {},
    getWebSockets: () => clients
  };
  function client(peer) {
    const socket = { packets: [], deserializeAttachment: () => ({ peer, author: peer }), send(raw) { this.packets.push(JSON.parse(raw)); }, close() {} };
    clients.push(socket); return socket;
  }
  return { db, state, room: new GuestbookRoom(state, {}), client };
}
const message = (text, id = crypto.randomUUID()) => JSON.stringify({ type: 'message', requestId: id, name: '방문자', text });

test('messages persist, broadcast to two clients, deduplicate retries and survive room reconstruction', async () => {
  const { db, state, room, client } = setup();
  const a = client('a'), b = client('b'), raw = message('안녕하세요 <img onerror=alert(1)>');
  await room.webSocketMessage(a, raw);
  assert.equal(a.packets.at(-1).type, 'message');
  assert.deepEqual(a.packets.at(-1), b.packets.at(-1));
  assert.equal(room.rows().length, 1);
  await room.webSocketMessage(a, raw);
  assert.equal(room.rows().length, 1);
  assert.equal(b.packets.length, 1);
  const restored = new GuestbookRoom(state, {});
  assert.deepEqual(restored.rows(), room.rows());
  assert.equal(restored.rows()[0].text, '안녕하세요 <img onerror=alert(1)>');
  db.close();
});

test('validation and server-side rate limits reject blank, oversized, binary and rapid messages', async () => {
  const { db, room, client } = setup(), a = client('shared-ip'), b = client('shared-ip');
  for (const raw of [message(' '), message('가'.repeat(301)), '{bad', 'null', new ArrayBuffer(10), message('a'.repeat(5000))]) {
    await room.webSocketMessage(a, raw); assert.equal(a.packets.at(-1).type, 'error');
  }
  assert.equal(room.rows().length, 0);
  await room.webSocketMessage(a, message('첫 글'));
  await room.webSocketMessage(b, message('연속 도배'));
  assert.equal(b.packets.at(-1).type, 'error');
  assert.equal(room.rows().length, 1);
  db.close();
});

test('retention keeps exactly the newest 200 messages in insertion order', async () => {
  const { db, room, client } = setup();
  for (let i = 0; i < 205; i++) await room.webSocketMessage(client('peer' + i), message('메시지 ' + i));
  const rows = room.rows();
  assert.equal(rows.length, 200); assert.equal(rows[0].text, '메시지 5'); assert.equal(rows.at(-1).text, '메시지 204');
  db.close();
});

test('guestbook requires allowed Origin and WebSocket GET, and does not require Gemini key', async () => {
  const origin = 'https://sds-junior-reviewer-2026-second.github.io';
  const env = { ALLOWED_ORIGINS: origin, GUESTBOOK: { idFromName: () => 'room', get: () => ({ fetch: async () => new Response('routed') }) } };
  const request = (method, headers) => new Request('https://worker.example/guestbook', { method, headers });
  assert.equal((await worker.fetch(request('GET', { Origin: 'https://other.example', Upgrade: 'websocket' }), env)).status, 403);
  assert.equal((await worker.fetch(request('POST', { Origin: origin }), env)).status, 405);
  assert.equal((await worker.fetch(request('GET', { Origin: origin }), env)).status, 426);
  assert.equal(await (await worker.fetch(request('GET', { Origin: origin, Upgrade: 'websocket' }), env)).text(), 'routed');
  assert.equal((await worker.fetch(new Request('https://worker.example', { method: 'POST', headers: { Origin: origin } }), env)).status, 500);
});
