/* Hand-authored semantic tags, not pretrained embeddings or original Semantle scores.
 * Keep dictionary order and version stable: daily answers and saved games depend on them.
 * Static casual game: answers are intentionally available in this public source. */
(function (root) {
  'use strict';
  const VERSION = 'v1';
  const groups = [
    ['음식 식사 일상', '밥 식사 점심 저녁 아침 도시락 급식 식당 한식 반찬'],
    ['음식 한식 매운맛', '김치 김치찌개 김치전골 제육볶음 떡볶이 고추장 비빔밥 불닭 닭갈비 육개장'],
    ['음식 국물 따뜻함', '국 수프 국밥 설렁탕 갈비탕 된장찌개 라면 우동 전골 어묵'],
    ['음식 간식 달콤함', '과자 쿠키 초콜릿 사탕 케이크 빵 도넛 아이스크림 꿀 푸딩'],
    ['음식 음료 휴식', '커피 차 우유 주스 물 탄산수 녹차 라테 에스프레소 음료'],
    ['음식 과일 자연', '사과 배 바나나 딸기 포도 복숭아 수박 귤 오렌지 레몬'],
    ['기술 개발 논리', '개발 코딩 코드 프로그램 소프트웨어 알고리즘 함수 변수 배열 객체'],
    ['기술 개발 협업', '깃허브 커밋 브랜치 병합 충돌 리뷰 저장소 배포 버전 테스트'],
    ['기술 컴퓨터 장비', '컴퓨터 노트북 키보드 마우스 모니터 화면 메모리 서버 네트워크 인터넷'],
    ['기술 학습 지능', '인공지능 데이터 모델 학습 추론 예측 분석 통계 챗봇 자동화'],
    ['학습 학교 성취', '공부 시험 자격증 합격 성적 문제 정답 오답 복습 수업'],
    ['직장 사람 조직', '회사 사원 대리 과장 차장 부장 임원 사장 동료 팀장'],
    ['직장 협업 일상', '업무 회의 보고 기획 프로젝트 일정 출근 퇴근 야근 휴가'],
    ['성취 미래 노력', '목표 꿈 도전 성장 성공 노력 연습 실력 전문가 프로'],
    ['놀이 운동 경쟁', '운동 탁구 축구 농구 야구 배구 테니스 배드민턴 수영 달리기'],
    ['놀이 게임 논리', '게임 바둑 체스 장기 퍼즐 퀴즈 전략 승리 패배 대결'],
    ['자연 풍경 여행', '산 바다 강 호수 숲 나무 꽃 하늘 구름 별'],
    ['자연 날씨 일상', '날씨 비 눈 바람 햇빛 태풍 안개 무지개 기온 장마'],
    ['시간 계절 자연', '봄 여름 가을 겨울 계절 새벽 낮 밤 오늘 내일'],
    ['감정 행복 관계', '행복 기쁨 웃음 미소 즐거움 사랑 우정 감사 설렘 만족'],
    ['감정 어려움 위로', '슬픔 눈물 걱정 불안 외로움 분노 피로 스트레스 고민 위로'],
    ['사람 관계 협업', '친구 가족 부모 형제 자매 선배 후배 동기 이웃 동반자'],
    ['여행 이동 장소', '여행 산책 소풍 휴양 관광 모험 목적지 지도 길 풍경'],
    ['여행 이동 장비', '버스 지하철 기차 비행기 자동차 자전거 택시 배편 역 공항'],
    ['예술 문화 휴식', '음악 노래 영화 드라마 책 소설 시 그림 사진 공연'],
    ['집 휴식 일상', '집 방 침대 베개 이불 소파 의자 책상 거실 잠'],
    ['행운 성취 선물', '행운 운세 포춘쿠키 선물 축하 응원 기회 소원 희망 기대']
  ];
  const extras = {
    점심: '직장 휴식', 저녁: '집 시간', 아침: '시간 시작', 밥: '한식', 식당: '장소',
    김치전골: '국물 따뜻함', 김치찌개: '국물 따뜻함', 제육볶음: '식사', 라면: '매운맛 간식',
    쿠키: '행운 선물', 포춘쿠키: '음식 간식 달콤함', 커피: '직장 음료', 물: '자연 건강',
    코드: '논리 작성', 함수: '논리 수학', 배열: '데이터 구조', 알고리즘: '시험 학습',
    깃허브: '저장 공유', 저장소: '저장 데이터', 커밋: '저장 기록', 충돌: '어려움',
    리뷰: '분석 개선', 테스트: '분석 검증', 인공지능: '자동화 미래', 챗봇: '대화 사람',
    합격: '성취 행복', 시험: '도전 경쟁', 정답: '성취 논리', 오답: '어려움 복습',
    임원: '목표 성취', 사장: '성취 리더', 동료: '관계 협업', 회의: '사람 대화',
    퇴근: '휴식 행복', 휴가: '여행 휴식', 야근: '피로 밤', 출근: '이동 아침',
    프로: '직장 전문가', 성장: '학습 개선', 연습: '학습 운동', 탁구: '공 실내',
    축구: '공 야외', 농구: '공 실내', 야구: '공 야외', 테니스: '공 야외',
    바둑: '전략 사고', 체스: '전략 사고', 퍼즐: '문제 사고', 승리: '성취 행복',
    산: '운동 야외', 바다: '물 여름', 강: '물', 호수: '물 고요', 숲: '휴식 고요',
    나무: '성장', 꽃: '선물 봄', 비: '물', 눈: '겨울', 햇빛: '따뜻함',
    행복: '행운 성취', 사랑: '가족', 감사: '선물', 위로: '관계 사랑',
    친구: '놀이 우정', 가족: '집 사랑', 동기: '직장 학교', 동반자: '여행',
    산책: '휴식 운동', 소풍: '놀이 봄', 자전거: '운동', 기차: '역', 비행기: '공항',
    음악: '노래 감정', 영화: '이야기 화면', 책: '학습 이야기', 소설: '이야기',
    침대: '잠', 베개: '잠', 이불: '잠 따뜻함', 책상: '공부 직장', 의자: '직장',
    소원: '꿈 미래', 응원: '관계 도전', 희망: '꿈 미래', 기회: '미래 도전'
  };
  const words = groups.flatMap(([tags, list]) => list.split(' ').map(word => {
    const vector = {};
    tags.split(' ').forEach(tag => { vector[tag] = 1; });
    (extras[word] || '').split(' ').filter(Boolean).forEach(tag => { vector[tag] = 0.8; });
    // A word-specific dimension prevents different words with identical tags scoring 100.
    vector['word:' + word] = 0.65;
    return { word, vector };
  }));
  const dictionary = new Map(words.map(entry => [entry.word, entry]));
  function hash(text) {
    let value = 2166136261;
    for (const char of text) value = Math.imul(value ^ char.codePointAt(0), 16777619) >>> 0;
    return value;
  }
  const schedule = words.map(entry => entry.word).sort((a, b) => hash(a) - hash(b) || (a < b ? -1 : 1));
  function dayKey(date = new Date()) { return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10); }
  function dayNumber(day) { return Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000); }
  function answerFor(day) { const n = dayNumber(day); return schedule[((n % schedule.length) + schedule.length) % schedule.length]; }
  function normalize(word) { return String(word).normalize('NFC').trim(); }
  function similarity(a, b) {
    if (!dictionary.has(a) || !dictionary.has(b)) return null;
    if (a === b) return 100;
    const av = dictionary.get(a).vector, bv = dictionary.get(b).vector;
    const dot = Object.keys(av).reduce((n, key) => n + av[key] * (bv[key] || 0), 0);
    const norm = vector => Math.sqrt(Object.values(vector).reduce((n, v) => n + v * v, 0));
    return Math.min(99.99, Math.round(dot / (norm(av) * norm(bv)) * 10000) / 100);
  }
  function rankingFor(day) {
    const answer = answerFor(day);
    const ranked = words.map(({word}) => ({word, score: similarity(word, answer)})).sort((a, b) => b.score - a.score || (a.word < b.word ? -1 : 1));
    ranked.forEach((item, i) => { item.rank = i && item.score === ranked[i - 1].score ? ranked[i - 1].rank : i + 1; });
    return ranked;
  }
  function restore(saved, day) {
    const blank = { version: VERSION, day, guesses: [], hints: 0, fortuneOpened: false };
    if (!saved || saved.version !== VERSION || saved.day !== day) return blank;
    blank.guesses = [...new Set((Array.isArray(saved.guesses) ? saved.guesses : []).filter(word => typeof word === 'string' && dictionary.has(word)))].slice(0, words.length);
    const solvedAt = blank.guesses.indexOf(answerFor(day));
    if (solvedAt !== -1) blank.guesses = blank.guesses.slice(0, solvedAt + 1);
    blank.hints = Number.isInteger(saved.hints) ? Math.max(0, Math.min(2, saved.hints)) : 0;
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
    ['인연운', '먼저 건넨 인사 한마디가 좋은 대화로 돌아옵니다. 방명록에 한 줄 남겨보는 건 어떤가요?', '인사'],
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
  const api = { VERSION, words: words.map(entry => entry.word), dayKey, answerFor, normalize, similarity, rankingFor, restore, fortuneFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JihunDaily = api;
})(typeof window !== 'undefined' ? window : this);
