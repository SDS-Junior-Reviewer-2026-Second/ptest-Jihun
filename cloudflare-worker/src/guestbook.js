// One Durable Object owns message ordering, SQLite persistence, and live broadcasts.
// The public room is anonymous; names are not verified identities.
export class GuestbookRoom {
  constructor(state, env) {
    this.state = state;
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, request_id TEXT UNIQUE NOT NULL, author TEXT NOT NULL, name TEXT NOT NULL, text TEXT NOT NULL, created_at INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS rate_limits (peer TEXT PRIMARY KEY, sent_at INTEGER NOT NULL)');
    state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  rows() {
    return this.sql.exec('SELECT * FROM (SELECT * FROM messages ORDER BY seq DESC LIMIT 200) ORDER BY seq').toArray().map(row => this.publicRow(row));
  }
  publicRow(row) {
    return { id: row.id, requestId: row.request_id, author: row.author, name: row.name, text: row.text, createdAt: row.created_at };
  }
  async fetch(request) {
    if (this.state.getWebSockets().length >= 100) return new Response('사랑방이 가득 찼어요. 잠시 후 다시 연결해 주세요.', { status: 503 });
    // Do not persist raw IP addresses. This short-lived digest only groups rate limits.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(new Date().toISOString().slice(0, 10) + ':' + ip));
    const peer = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (this.state.getWebSockets().length >= 100) return new Response('Room full', { status: 503 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const author = crypto.randomUUID();
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ author, peer });
    server.send(JSON.stringify({ type: 'history', author, messages: this.rows() }));
    return new Response(null, { status: 101, webSocket: client });
  }
  error(socket, message, requestId) { socket.send(JSON.stringify({ type: 'error', message, requestId })); }
  async webSocketMessage(socket, raw) {
    if (raw === 'ping') { socket.send('pong'); return; }
    if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > 4096) { this.error(socket, '메시지가 너무 큽니다.'); return; }
    let data;
    try { data = JSON.parse(raw); } catch (_) { this.error(socket, '메시지 형식을 확인해 주세요.'); return; }
    if (!data || data.type !== 'message' || typeof data.name !== 'string' || typeof data.text !== 'string' || typeof data.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(data.requestId)) {
      this.error(socket, '메시지 형식을 확인해 주세요.'); return;
    }
    const name = data.name.normalize('NFC').trim(), text = data.text.normalize('NFC').trim();
    if (!name || name.length > 24 || !text || text.length > 300 || /[\r\n\u0000-\u001f\u007f]/.test(name) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
      this.error(socket, '별명은 1~24자, 메시지는 1~300자로 입력해 주세요.', data.requestId); return;
    }
    // A retry after reconnect receives the same acknowledgement, without another insert.
    const existing = this.sql.exec('SELECT * FROM messages WHERE request_id = ?', data.requestId).toArray()[0];
    if (existing) {
      if (existing.name !== name || existing.text !== text) { this.error(socket, '새 메시지로 다시 입력해 주세요.', data.requestId); return; }
      socket.send(JSON.stringify({ type: 'message', message: this.publicRow(existing) })); return;
    }
    const { author, peer } = socket.deserializeAttachment();
    const now = Date.now();
    const last = this.sql.exec('SELECT sent_at FROM rate_limits WHERE peer = ?', peer).toArray()[0];
    if (last && now - last.sent_at < 2000) { this.error(socket, '잠시만요. 메시지는 2초에 한 번 보낼 수 있어요.', data.requestId); return; }
    const row = { id: crypto.randomUUID(), request_id: data.requestId, author, name, text, created_at: now };
    try {
      // Synchronous SQLite transaction keeps insert, rate limit and retention atomic.
      this.state.storage.transactionSync(() => {
        this.sql.exec('INSERT INTO messages (id, request_id, author, name, text, created_at) VALUES (?, ?, ?, ?, ?, ?)', row.id, row.request_id, author, name, text, now);
        this.sql.exec('INSERT OR REPLACE INTO rate_limits (peer, sent_at) VALUES (?, ?)', peer, now);
        this.sql.exec('DELETE FROM rate_limits WHERE sent_at < ?', now - 60000);
        this.sql.exec('DELETE FROM messages WHERE seq NOT IN (SELECT seq FROM messages ORDER BY seq DESC LIMIT 200)');
      });
    } catch (_) { this.error(socket, '저장하지 못했어요. 잠시 후 다시 보내주세요.', data.requestId); return; }
    const packet = JSON.stringify({ type: 'message', message: this.publicRow(row) });
    for (const client of this.state.getWebSockets()) {
      try { client.send(packet); } catch (_) { try { client.close(1011, 'Reconnect'); } catch (_) {} }
    }
  }
  webSocketClose(socket, code) { socket.close(code === 1005 || code === 1006 ? 1000 : code, 'Connection closed'); }
  webSocketError(socket) { try { socket.close(1011, 'Reconnect'); } catch (_) {} }
}
