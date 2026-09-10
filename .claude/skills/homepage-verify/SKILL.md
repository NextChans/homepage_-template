---
name: homepage-verify
description: 이 홈페이지 변경 후 실행하는 표준 검증 루틴. 타입체크·린트·빌드·라이트/다크/모바일 스크린샷을 한 번에 돌려 디자인과 회귀를 확인한다. 사용자가 "확인해줘", "검증해줘", "빌드 되는지 봐줘", "스크린샷 찍어줘", "디자인 확인", "제대로 나오는지 봐줘" 등을 말할 때, 또는 페이지·컴포넌트·스타일을 수정한 직후 스스로 사용한다.
---

# 표준 검증 루틴

## 1. 정적 검사

```bash
npm run typecheck
npm run lint
npm run build
```

`build` 로그에서 확인할 것:
- `/services/[slug]` 아래에 서비스 slug 가 모두 나열되는지 (SSG 경로 누락 확인)
- `ƒ (Dynamic)` 이 `/admin`, `/admin/[id]`, `/admin/login` **3개뿐**인지.
  다른 페이지가 Dynamic 이면 원인을 찾는다.
  ⚠️ `/admin*` 이 `○ (Static)` 으로 나오면 **버그다** — 빌드 시점에는 `ADMIN_*` 환경변수가
  없으므로 그때의 `notFound()` 가 산출물에 굳어 **영구 404** 가 된다.
  해당 페이지에 `export const dynamic = 'force-dynamic'` 이 있는지 확인한다.
- First Load JS 가 크게 늘지 않았는지 (기준 약 102 kB shared)

## 2. 스크린샷

```bash
# 이전 서버가 남아 있으면 반드시 먼저 죽인다 (아래 함정 참고)
ps -o pid,cmd -C node | grep next-server     # 있으면 kill -9 <pid>

nohup npm run start -- -p 3100 > /tmp/next-start.log 2>&1 &
sleep 6
curl -s http://localhost:3100/ | grep -o 'href="/_next/static/css/[^"]*"' | head -1
#   → 위 CSS URL 이 200 인지 확인한 뒤 캡처한다
npm run screenshot -- .screenshots http://localhost:3100
```

### 함정 1 — 빌드하면 실행 중인 서버가 깨진다

`next start` 가 떠 있는 상태에서 `npm run build` 를 다시 돌리면 `.next/` 의 CSS/JS 해시가
바뀌어 **기존 서버가 404 를 반환한다.** 그러면 스크린샷이 **CSS 없는 HTML 덩어리**로 찍힌다.
사이트가 망가진 게 아니다. 순서를 지킨다: `build` → (기존 서버 종료) → `start` → 캡처.

### 함정 2 — 리빌이 발화되지 않으면 백지로 찍힌다

`.screenshots/` 에 `light-*`, `dark-*`, `mobile-*` 이 생성된다 (`.gitignore` 처리됨).
캡처된 이미지를 **직접 읽어서** 눈으로 확인한다.

스크립트는 `document.documentElement.style.scrollBehavior = 'auto'` 로 smooth scroll 을 끈 뒤
순차 스크롤한다. 이 처리가 없으면 `.reveal` 이 발화되지 않아 **본문이 전부 빈 화면으로 찍힌다.**

두 함정을 구분하는 방법: **텍스트는 보이는데 스타일이 없으면 함정 1**,
**레이아웃은 잡혀 있는데 섹션이 비어 있으면 함정 2**다.

### 함정 3 — 관리자 화면 테스트에서 `button[type="submit"]`.first() 는 **로그아웃**이다

`app/admin/layout.tsx` 헤더에 로그아웃 폼이 있다. 그래서 관리자 페이지에는 폼이 2개고,
`button[type="submit"]` 의 첫 번째가 로그아웃이다. 이걸 클릭하면
**세션이 끊겨 `/admin/login` 으로 튕기고, 마치 "액션이 실행되지 않는 버그" 처럼 보인다.**
실제로 이 착각으로 가드·쿠키·`secure` 속성까지 의심하며 오래 헤맸다.

```js
// ✗ 로그아웃을 누른다
await page.locator('button[type="submit"]').first().click()
// ✓ 대상 버튼으로 좁힌다
await page.locator('button[type="submit"]:has-text("문의 등록")').click()
```

### 함정 4 — Server Action 제출은 **303 리다이렉트 완료를 기다려야** 한다

`waitForLoadState('networkidle')` 만으로는 부족하다. 클릭 직후 단정하면 아직 이전
경로여서 정상 동작이 실패로 보인다. `waitForURL` 을 쓴다.

```js
await page.locator('...').click()
await page.waitForURL((u) => new URL(u).pathname === '/admin', { timeout: 15000 })
```

### 함정 5 — 브라우저 기본 검증을 `setAttribute` 로 벗길 수 없다

서버 검증(zod)을 확인하려고 `type="email"` 을 `text` 로 바꿔도 **React 가 리렌더에서
속성을 복원**한다. 그러면 제출 자체가 브라우저에서 막혀 POST 가 서버에 도달하지 않고,
"서버 검증이 없다" 는 잘못된 결론에 이른다.
→ `required` 제거는 통하지만 `type` 변경은 통하지 않는다. 서버 검증은
**스키마를 단독 실행**해 확인하는 편이 확실하다.

```bash
node -e '위 스키마를 그대로 옮겨 safeParse 결과를 출력'
```

### 함정 6 — 로컬 검증용 가짜 Supabase 주소는 **연결이 즉시 거부되는 것**으로

`https://fake.supabase.co` 처럼 실존하지 않는 외부 도메인을 쓰면 요청이 프록시를 타고
수 초씩 지연돼 브라우저 타이밍이 전부 엉킨다. `http://127.0.0.1:9` 를 쓰면 즉시
ECONNREFUSED 가 되어 화면·검증 흐름만 깔끔하게 볼 수 있다.

```bash
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:9"
export SUPABASE_SECRET_KEY="sb_secret_local_refused"
export NO_PROXY="127.0.0.1,localhost"
```

### 함정 7 — Vercel **Preview URL 로는 자산을 검증할 수 없다**

이 프로젝트의 Preview 배포는 **Vercel Authentication** 으로 보호되어 있다. 인증 없이
요청하면 **모든 경로가 200 으로 로그인 페이지 HTML** 을 돌려준다.

```
/icon.svg            200  text/html; charset=utf-8  338994bytes   ← 로그인 페이지다
/opengraph-image.png 200  text/html; charset=utf-8  339072bytes
```

**`200` 을 보고 "자산이 서빙된다" 고 판단하면 틀린다.** 구분법 두 가지 —

1. **`content_type` 을 본다.** `.png` 요청에 `text/html` 이 오면 로그인 페이지다.
   `curl -o /dev/null -w '%{http_code} %{content_type}'` 로 항상 함께 확인한다.
2. `head` 에 `assets.vercel.com/.../favicon/vercel/` 아이콘이 보이면 **우리 페이지가
   아니라 Vercel 페이지**다.

→ 자산 검증은 **로컬 `next start`** 로 한다(2절). 배포본 확인이 필요하면 **프로덕션
도메인**을 쓴다 — 그쪽은 보호되지 않는다.

### 함정 8 — `grep -c` 는 **줄 수**를 센다. 렌더된 HTML 은 한 줄이다

`grep -c 'viewBox'` 는 심볼이 2개여도 **1** 을 돌려준다. 출현 횟수를 세려면
`grep -o ... | wc -l` 을 쓴다.

```bash
# ✗ 항상 1 이다
curl -s localhost:3100/ | grep -c 'viewBox="0 0 28 33"'
# ✓ 실제 출현 횟수
curl -s localhost:3100/ | grep -o 'viewBox="0 0 28 33"' | wc -l
```

### 함정 9 — `pkill -f <패턴>` 이 **자기 명령줄을 죽인다**

`pkill -9 -f next-server` 는 그 문자열을 포함한 **자기 셸 명령줄에도 매칭**되어 셸이
즉시 죽는다(도구는 exit 1 만 보여주고 로그 파일도 안 생긴다). 패턴을 어긋나게 쓴다.

```bash
for p in $(ps -eo pid,args | grep '[n]ext-serv' | awk '{print $1}'); do kill -9 "$p"; done
```

### 함정 10 — Analytics 스크립트는 **서버 HTML 에 없다**

`<Analytics />` 는 클라이언트에서 `<script>` 를 주입한다. 서버 HTML 을 grep 해서
`_vercel/insights` 가 없다고 "배선이 안 됐다" 고 판단하면 틀린다. 번들을 본다.

```bash
grep -rl '_vercel/insights' .next/static/chunks/    # layout 청크에 있으면 배선됨
```

**실제 수집 여부는 Vercel 대시보드에 데이터가 들어오는지로만 확인된다.**

## 3. 눈으로 볼 체크리스트

- [ ] 히어로: 하위 페이지 헤드라인이 3줄 이상으로 깨지지 않는다 (`size="headline"` 확인)
- [ ] 다크 모드: 배경이 순검정(#000)이고 본문 텍스트가 순백이 아니다(#f5f5f7)
- [ ] 모바일 390px: 가로 스크롤 없음, 지표 숫자가 잘리지 않음
- [ ] 섹션 경계가 hairline 한 줄로만 구분된다
- [ ] `accent` 색이 링크·버튼·포커스·에러 외에 쓰이지 않았다
- [ ] 카드 그리드에서 마지막 행에 어색한 빈칸이 생기지 않는다
- [ ] 푸터의 템플릿 고지 문구가 남아 있다 (실데이터 교체 전까지)
- [ ] 헤더·푸터 심볼이 **사선 2개가 뚫린 방패**로 보인다 (통짜 방패면 `evenodd` 가 빠졌다)
- [ ] 다크 모드에서 심볼이 흰색으로 반전된다 (`currentColor` 확인)
- [ ] 브라우저 탭 파비콘이 네이비 사각형 + 골드 방패다
- [ ] 화면 어디에도 골드(`#C9A961`)가 텍스트·링크·버튼으로 쓰이지 않았다 (대비 2.25:1)

## 4. 폼 동작 확인 (Supabase 설정 시)

```bash
# .env.local 설정 후
# 1) 필수값 누락 → 필드별 한국어 에러 메시지 표시
# 2) 정상 입력 → "접수되었습니다" 성공 화면 + 폼 리셋
# 3) 10분 내 4회 제출 → 레이트리밋 메시지
# 4) Supabase Table Editor 에서 ip_hash 가 해시값인지, 원문 IP 가 없는지 확인
```

## 5. 정리

- 서버 종료: 백그라운드로 띄운 `next start` 프로세스를 정리한다.
  (`pkill -f "next start"` 는 실행 중인 셸까지 죽일 수 있으니 PID 를 기억해 `kill <pid>` 로 종료한다)
- 발견한 문제와 해결을 `doc/08-worklog.md` 에 한 줄로 남긴다.
