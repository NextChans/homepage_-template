# 01. 아키텍처

## 디렉터리 구조

```
app/
  layout.tsx              루트 레이아웃 · metadata · noscript 리빌 폴백 · skip link
  page.tsx                홈
  globals.css             @theme 디자인 토큰 + 타이포 스케일 + 리빌 CSS
  not-found.tsx           404
  sitemap.ts, robots.ts   SEO
  services/page.tsx       서비스 목록
  services/[slug]/page.tsx  서비스 상세 (generateStaticParams)
  about/page.tsx          회사소개
  contact/page.tsx        문의 (Server Component + 폼만 Client)
  privacy/page.tsx        개인정보처리방침
  actions/inquiry.ts      Server Action — 문의 접수

components/
  site-header.tsx   (Client) 글래스 내비 · 모바일 메뉴
  site-footer.tsx   (Server)
  hero.tsx          (Server) size: display | headline
  reveal.tsx        (Client) IntersectionObserver 스크롤 리빌
  ui.tsx            (Server) Container · Section · ButtonLink · ButtonAnchor · ArrowLink
  metrics-band.tsx  feature-split.tsx  service-grid.tsx
  process-steps.tsx faq.tsx  cta-band.tsx  logo-strip.tsx
  contact-form.tsx  (Client) useActionState 기반 폼

content/
  site.ts       회사·내비·지표·파트너
  services.ts   서비스 5종 (타입 + 데이터 + slug 조회 Map)

lib/
  inquiry-schema.ts   zod 스키마 · 폼 상태 타입 (클라이언트/서버 공용)
  supabase/server.ts  'server-only' service_role 클라이언트

supabase/migrations/   SQL 마이그레이션
scripts/screenshot.mjs 디자인 회귀 확인
doc/                   이 문서들
.claude/skills/        apple-design(외부) + homepage-* (이 프로젝트 반복작업)
```

## 렌더링 전략

**Server Component 우선.** `'use client'` 는 4개 파일뿐이다.

| 파일 | Client 인 이유 |
|---|---|
| `components/site-header.tsx` | `usePathname`, 모바일 메뉴 토글, 스크롤 잠금 |
| `components/reveal.tsx` | `IntersectionObserver` |
| `components/contact-form.tsx` | `useActionState`, `useFormStatus` |

나머지는 전부 서버에서 렌더링된다. 홈/서비스/회사소개는 정적 프리렌더되어 First Load JS 가
공유 청크(약 102 kB) 수준에 머문다.

`/contact` 만 Dynamic 인 이유는 `searchParams.service` 로 문의 분야를 프리셋하기 때문이다.
(`/contact?service=open-banking` 형태로 서비스 상세에서 유입시킬 수 있다.)

## 문의 접수 데이터 흐름

```
ContactForm (Client)
  ├ hidden startedAt   ← 마운트 후 Date.now(). 2초 미만 제출은 봇으로 간주
  ├ honeypot company_website ← 값이 있으면 봇. 성공처럼 응답하고 저장하지 않는다
  └ FormData
        ↓ Server Action (app/actions/inquiry.ts)
   1. 봇 차단 (honeypot + 최소 작성시간)
   2. zod 검증 → 실패 시 필드별 한국어 메시지 반환
   3. Supabase 미설정 → 명시적 에러 상태 + console.error (조용히 실패하지 않는다)
   4. IP 해시 (salt + SHA-256). salt 없으면 해시도 남기지 않는다
   5. 레이트리밋 — 동일 ip_hash 10분 내 3건 초과 차단
        · 카운트 조회 실패는 접수를 막지 않는다(가용성 우선) + 반드시 로깅
   6. insert (service_role, RLS 우회)
        · 실패 시 error.code/message 만 로깅. 입력값은 절대 로깅하지 않는다
```

### 리뷰 관점에서 남는 약점

- **레이트리밋이 DB 카운트 기반**이다. 동시 요청에서는 원자적이지 않아 순간적으로 한도를
  초과할 수 있다. 목적이 어뷰징 억제이므로 현 수준을 허용했다. 강화가 필요하면
  Upstash Redis 등 외부 카운터로 옮긴다.
- **`x-forwarded-for` 를 신뢰**한다. 신뢰 프록시 앞단이 없으면 위조 가능하다.
  IP 해시는 어뷰징 억제 용도로만 쓰고 인증·권한 판단에 쓰지 않는다.
- **CSRF** 는 Next.js Server Action 의 Origin 검증에 의존한다. 별도 토큰을 두지 않았다.
- **접수 알림이 없다.** 현재는 DB 에만 쌓인다. Slack/이메일 웹훅은 미구현.
