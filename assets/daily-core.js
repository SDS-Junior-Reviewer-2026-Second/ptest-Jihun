/* Daily fortune cookie logic, shared by the page script and the tests.
 * Keep VERSION and the fortune order stable: daily fortunes depend on them. */
(function (root) {
  'use strict';
  const VERSION = 'v1';
  function hash(text) {
    let value = 2166136261;
    for (const char of text) value = Math.imul(value ^ char.codePointAt(0), 16777619) >>> 0;
    return value;
  }
  function dayKey(date = new Date()) { return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10); }
  function restore(saved, day) {
    const blank = { version: VERSION, day, fortuneOpened: false };
    if (!saved || saved.version !== VERSION || saved.day !== day) return blank;
    blank.fortuneOpened = saved.fortuneOpened === true;
    return blank;
  }
  const fortunes = [
    ['성장운', '오늘 이해한 한 줄이, 내일의 실력이 됩니다. 프로도 한 줄부터 시작한 것으로 사료됨.', '복습'],
    ['점심운', '고민하던 메뉴에 한 표를 던져보세요. 오늘의 점심 회의는 당신이 끝낼 차례.', '제육볶음'],
    ['협업운', '혼자 막힌 문제는 함께 보면 풀립니다. 오늘의 좋은 질문 하나가 팀을 구할지도.', '동료'],
    ['도전운', '어려워 보이는 문제에도 첫 수는 있습니다. 오늘은 한 칸만 더 올라가 보시죠.', '계단'],
    ['휴식운', '잠깐의 산책이 긴 고민을 정리해 줍니다. 미래의 임원도 쉬는 시간은 필요합니다.', '산책'],
    ['개발운', '작은 테스트 하나가 큰 버그를 막아줄 날. 초록색 체크 표시가 당신을 기다립니다.', '테스트'],
    ['인연운', '먼저 건넨 인사 한마디가 좋은 대화로 돌아옵니다. 오늘은 안부를 먼저 물어보는 건 어떤가요?', '인사'],
    ['성취운', '끝내지 못했던 작은 일 하나를 마무리할 날. 완료 버튼의 기쁨을 누려보시죠.', '완료'],
    ['행운', '뜻밖의 좋은 소식이 찾아올지도. 작은 행운을 알아보는 것도 프로의 능력입니다.', '미소'],
    ['집중운', '알림을 잠시 내려놓으면 생각이 또렷해집니다. 오늘의 한 가지에 집중해 보세요.', '집중'],
    ['발견운', '익숙한 코드에서도 새로운 방법을 발견할 수 있습니다. 호기심을 한 번 따라가 보시죠.', '질문'],
    ['우정운', '함께 웃었던 이야기를 다시 꺼내보세요. 별것 아닌 추억이 하루를 따뜻하게 만듭니다.', '친구'],
    ['여유운', '오늘은 속도보다 방향을 살펴볼 날. 천천히 가도 제대로 가면 됩니다.', '여유'],
    ['자신감운', '준비한 만큼 말해보세요. 떨려도 괜찮습니다. 자신감은 연습 끝에 찾아오는 것으로 사료됨.', '연습'],
    ['정리운', '책상 한쪽을 비우면 머릿속에도 자리가 생깁니다. 작은 정리부터 시작해 보세요.', '책상'],
    ['감사운', '고마웠던 사람에게 짧은 한마디를 전해보세요. 좋은 마음은 나누면 더 오래갑니다.', '감사']
  ];
  function fortuneFor(day) {
    const seed = hash('fortune:' + VERSION + ':' + day);
    const [label, message, lucky] = fortunes[seed % fortunes.length];
    return { label, message, lucky, number: (seed % 99) + 1 };
  }
  const api = { VERSION, dayKey, restore, fortuneFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JihunDaily = api;
})(typeof window !== 'undefined' ? window : this);
