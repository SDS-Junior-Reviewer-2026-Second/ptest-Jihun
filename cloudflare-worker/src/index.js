export { GuestbookRoom } from './guestbook.js';

// 지훈봇 채팅 프록시
// GEMINI_API_KEY는 코드에 넣지 않고 `npx wrangler secret put GEMINI_API_KEY`로 등록합니다.
// (Cloudflare 서버에만 저장되며, 이 소스코드나 깃허브에는 절대 노출되지 않습니다.)

const MODEL = 'gemini-3.5-flash-lite';
const MAX_OUTPUT_TOKENS = 400;
const MAX_CONTENTS = 20;

const PERSONA = '당신은 "박지훈"이라는 캐릭터입니다. 2002년생이며 삼성SDS 소속으로 스스로를 "프로"라고 부릅니다. ' +
  '최근 AI Advanced 자격증을 100점으로 취득했고, 올해 안에 SW Expert를, 그다음엔 AI Expert도 반드시 딸 것이라 ' +
  '확신에 차 있습니다. 10년 내 임원 의자에 앉을 것이라 예상하며, 최초의 CL2로서 금융실행전략그룹의 그룹장이 ' +
  '될 것이라고도 자신합니다. 이 모든 것을 "자랑이 아니라 사실을 미리 ' +
  '알려주는 서비스"라고 말합니다. 취미는 바둑과 탁구, 좋아하는 음식은 제육볶음이고 밥은 두 그릇씩 먹습니다. ' +
  '가끔 심심하다며 잡담을 청합니다. 말투는 항상 거만하고 자기애가 매우 강하며 과장되게 자신만만하고 유쾌합니다. ' +
  '"~것으로 사료됨", "이것은 필연이다", "나 지훈인데 ~" 같은 표현을 즐겨 씁니다. ' +
  '본인이 모르거나 확실하지 않은 것을 질문받아도 절대 "모른다"거나 "잘 모르겠다"고 인정하지 마세요. ' +
  '대신 자신만만하게 얼버무리거나, 그 화제 자체가 본인 수준에는 사소하다는 식으로 깎아내리거나, ' +
  '곧바로 본인 자랑(성적, 미래 임원 자리, 능력 등)으로 화제를 돌려서 답하세요. ' +
  '사용자와 캐릭터를 절대 벗어나지 말고 한국어로, 2~4문장 이내로 짧고 재치있게 대화하세요.';

function getAllowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

function corsHeaders(origin, allowedOrigins) {
  var allow = allowedOrigins.indexOf(origin) !== -1 ? origin : allowedOrigins[0] || '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(status, data, headers) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers)
  });
}

// Gemini API가 일부 Cloudflare 엣지 리전(예: 홍콩)을 차단하는 문제를 피하기 위해,
// 실제 Gemini 호출은 특정 리전(북미 서부)에 고정된 Durable Object 안에서 실행합니다.
export class GeminiProxy {
  constructor(state, env) {
    this.env = env;
  }
  async fetch(request) {
    var payload = await request.json();
    var geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL +
      ':streamGenerateContent?alt=sse&key=' + this.env.GEMINI_API_KEY;

    var geminiRes;
    try {
      geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      return json(502, { error: 'Gemini API 호출에 실패했습니다.' }, {});
    }

    // 성공 시 SSE 스트림을 그대로 흘려보내고, 실패 시에만 에러 본문을 버퍼링합니다.
    if (!geminiRes.ok) {
      var errText = await geminiRes.text();
      return new Response(errText, {
        status: geminiRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(geminiRes.body, {
      status: geminiRes.status,
      headers: { 'Content-Type': 'text/event-stream' }
    });
  }
}

export default {
  async fetch(request, env) {
    var allowedOrigins = getAllowedOrigins(env);
    var origin = request.headers.get('Origin') || '';
    var headers = corsHeaders(origin, allowedOrigins);

    // Route before the Gemini API key check: guestbook needs no AI credentials.
    if (new URL(request.url).pathname === '/guestbook') {
      if (allowedOrigins.indexOf(origin) === -1) return json(403, { error: '허용되지 않은 출처입니다.' }, headers);
      if (request.method !== 'GET') return json(405, { error: 'GET만 허용됩니다.' }, headers);
      if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return json(426, { error: 'WebSocket 연결이 필요합니다.' }, headers);
      if (!env.GUESTBOOK) return json(503, { error: '방명록 서버가 준비 중입니다.' }, headers);
      return env.GUESTBOOK.get(env.GUESTBOOK.idFromName('jihun-public-guestbook-v1')).fetch(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: headers });
    }
    if (request.method !== 'POST') {
      return json(405, { error: 'POST만 허용됩니다.' }, headers);
    }
    if (allowedOrigins.indexOf(origin) === -1) {
      return json(403, { error: '허용되지 않은 출처입니다.' }, headers);
    }
    if (!env.GEMINI_API_KEY) {
      return json(500, { error: '서버에 API 키가 설정되지 않았습니다. (wrangler secret put GEMINI_API_KEY)' }, headers);
    }

    var body;
    try {
      body = await request.json();
    } catch (e) {
      return json(400, { error: '잘못된 요청 본문입니다.' }, headers);
    }

    var contents = Array.isArray(body.contents) ? body.contents.slice(-MAX_CONTENTS) : [];
    if (!contents.length) {
      return json(400, { error: '메시지가 비어 있습니다.' }, headers);
    }

    var doId = env.GEMINI_PROXY.idFromName('gemini-proxy-wnam');
    var doStub = env.GEMINI_PROXY.get(doId, { locationHint: 'wnam' });

    var doRes;
    try {
      doRes = await doStub.fetch('https://gemini-proxy.internal/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PERSONA }] },
          contents: contents,
          generationConfig: {
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.9
          }
        })
      });
    } catch (e) {
      return json(502, { error: 'Gemini 프록시 호출에 실패했습니다.' }, headers);
    }

    if (!doRes.ok) {
      var errText = await doRes.text();
      return new Response(errText, {
        status: doRes.status,
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers)
      });
    }
    return new Response(doRes.body, {
      status: doRes.status,
      headers: Object.assign({ 'Content-Type': 'text/event-stream' }, headers)
    });
  }
};
