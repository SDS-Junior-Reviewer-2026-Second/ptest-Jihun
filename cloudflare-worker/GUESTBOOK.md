# 열전 사랑방 운영

`assets/guestbook.js`는 기존 Worker의 `/guestbook` WebSocket 경로에 연결한다.
`GuestbookRoom` Durable Object가 메시지 순서, 전체 접속자 전파, SQLite 저장을 담당한다.
기존 지훈봇의 Gemini 경로·키·Durable Object는 유지한다.

## 배포 순서

1. Cloudflare 계정에서 기존 `jihun-chat-proxy` Worker에 접근 가능한 상태인지 확인한다.
2. 이 변경이 포함된 브랜치를 체크아웃하고 실행한다.

   ```bash
   cd cloudflare-worker
   npx wrangler deploy
   ```

   `wrangler.toml`의 `v2-guestbook` migration이 새 SQLite Durable Object를 만든다.
   기존 `v1` migration과 `GEMINI_PROXY` binding을 삭제하거나 초기화하지 않는다.
   방명록은 Gemini API 키가 없어도 동작하며, 추가 AI 호출이 없다.

3. 실제 사이트의 Origin이 `ALLOWED_ORIGINS`에 포함되어 있는지 확인한다.
   현재 설정에는 기존 GitHub Pages 도메인과 5566 포트의 로컬 개발 주소가 들어 있다.
   Worker 주소를 변경하면 `assets/guestbook.js`의 `ENDPOINT`도 함께 바꾼다.
4. 프런트엔드 변경을 `main`에 병합하면 기존 Pages 워크플로가 배포한다.
5. 서로 다른 두 브라우저에서 별명을 입력하고 메시지를 보내 동시 수신을 확인한다.
   새로고침 후 기록, 오프라인/재접속, 한국어 Enter 입력도 확인한다.

## 동작과 한계

- 익명 공개 방명록이다. 별명은 로그인 계정이나 본인 인증을 뜻하지 않는다.
- 최근 200개 메시지를 서버에 보관하며, 오래된 글은 자동으로 제거한다.
- 서버는 메시지 300자, 별명 24자, 최대 동시 접속 100개를 제한한다.
- 같은 IP에서 전송은 2초당 한 번으로 제한한다. 같은 회사 네트워크 사용자끼리 제한을 공유할 수 있다.
- 원본 IP는 DB에 저장하지 않는다. 전송 제한용 일별 해시를 사용하고, 다음 전송 시 1분 지난 제한 기록을 정리한다.
- HTML은 실행하지 않고 일반 텍스트로 출력한다. 클라이언트는 서버 저장 확인 후 입력창을 비운다.
- 연결이 끊기면 최대 30초 간격으로 재연결하며, 재전송 시 같은 요청 ID로 중복 저장을 방지한다.
- GitHub Pages 배포만으로 Worker가 업데이트되지는 않는다. Worker 배포가 선행되어야 실제 채팅이 연결된다.
- Cloudflare의 Workers / Durable Objects 사용량 정책이 적용된다. 공개 서비스 확장 시 별도 인증·관리 기능을 검토한다.

## 자동 검증

저장소 루트에서 Node.js 24 이상으로 실행:

```bash
node --test tests/*.test.cjs tests/*.test.mjs
```

게임의 한국 자정·일일 정답·점수·저장 복구, 실제 SQLite를 사용한 메시지 보존·순서·중복 방지·길이 제한·전송 제한·Origin 검증을 확인한다.
Cloudflare WebSocket 인터페이스는 테스트에서 모의 구현되므로 배포 후 실제 두 브라우저 검증을 대체하지 않는다.
