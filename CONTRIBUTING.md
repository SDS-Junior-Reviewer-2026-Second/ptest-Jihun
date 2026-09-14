# 자기소개 기여 안내

이 레포에는 규칙이 거의 없습니다. 딱 하나, 지훈이 직접 남긴 부탁만 있습니다.

> 충돌 좀 안 나게 해주세요... 계속 충돌나서 따라가기가 힘들어요.
>
> — `jihun.txt` 6번째 줄

그래서 규칙은 세 줄입니다.

## 규칙 세 줄

1. **남의 줄은 고치지 않는다.** 고칠 말이 있으면 아래에 이어 씁니다. 같은 줄을 두 사람이 만지는 순간이 충돌입니다.
2. **할 말이 길면 파일을 새로 판다.** 본인 이름으로 파일 하나. `jihunadd.txt`가 이미 증명한 방식입니다.
3. **올리기 전에 한 번 당겨온다.** `git pull --rebase` 후 `push`. 이 한 줄이 지훈의 하루를 지킵니다.

## 이어 쓰는 법

```bash
git switch -c feature/본인이름
printf '\n## 나 OOO인데 한마디 하고 간다\n' >> 본인이름.md   # 새 파일이면 마음껏
git commit -am "add: OOO 자기소개"
git pull --rebase origin main
git push -u origin feature/본인이름
```

## PR을 올리면 생기는 일

- **충돌 파수꾼**(`.github/workflows/conflict-guard.yml`)이 기존 파일을 고쳤는지 확인하고 안내를 남깁니다. 막는 검사가 아니라서 PR을 실패시키지 않습니다.
- `main`에 들어간 `index.html` 변경은 **열전 배포**(`.github/workflows/pages.yml`)가 GitHub Pages로 올립니다.
  단, 최초 1회는 `Settings → Pages → Source`를 **GitHub Actions**로 직접 바꿔야 합니다.
  워크플로 토큰에는 Pages를 새로 켤 권한이 없어 이 한 번만 사람 손이 필요합니다.
  켜기 전까지는 배포를 건너뛰고 안내만 남기므로, PR이나 푸시가 실패하지는 않습니다.

## 어록을 페이지에도 올리고 싶다면

`index.html`의 `語錄` 구역에 카드를 하나 더합니다. 화자에 따라 색이 정해져 있습니다.

```html
<div class="quote" data-by="지훈" tabindex="0">
  <blockquote>여기에 어록</blockquote>
  <cite><b>지훈</b> · 분류</cite>
</div>
```

`data-by` 값은 `지훈`(주사 붉은색), `강현`(청자색), `admin`(금색), 그 외(기본색)입니다.
