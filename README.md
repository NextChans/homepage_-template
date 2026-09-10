# 홈페이지 템플릿 — 전자금융 인프라 사업자용

밴(VAN) 단말기, PG 영업대행, 전자금융업 등록, 금융 클라우드 이용등록, 금융결제원 오픈뱅킹
컨설팅을 제공하는 기업의 홈페이지 템플릿. **Apple 디자인 언어**를 적용했다.

> ⚠️ **회사 정보·실적 수치·서비스 설명은 전부 임시 데이터다.**
> 실서비스 전에 [`doc/05-content-guide.md`](./doc/05-content-guide.md) 의 교체 체크리스트를 처리할 것.

## 스택

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · zod · Supabase (PostgreSQL)

웹폰트를 쓰지 않고 시스템 폰트 스택(`-apple-system` → `SF Pro` → `Pretendard`)을 사용한다.

## 시작

```bash
npm install
cp .env.example .env.local     # Supabase 값 입력 (없어도 실행됨)
npm run dev                    # http://localhost:3000
```

| 스크립트 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `start` | 프로덕션 빌드 / 실행 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run screenshot` | 라이트/다크/모바일 스크린샷 (`next start` 실행 중일 때) |

## 구성

| 경로 | 렌더링 |
|---|---|
| `/` | Static — 히어로 · 지표 · 서비스 벤토 그리드 · 교차 소개 블록 · 프로세스 · CTA |
| `/services` | Static — 서비스 5종 목록 |
| `/services/[slug]` | SSG — 문제 / 산출물 / 진행단계 / FAQ |
| `/about` | Static — 원칙 · 연혁 · 사업자 정보 |
| `/contact` | Dynamic — 문의 폼 (`?service=<slug>` 프리셋) |
| `/privacy` | Static — 개인정보처리방침 (`noindex`) |

## 문의 접수

`Client 폼 → Server Action → Supabase`. 검증(zod)·봇 차단(honeypot + 최소 작성시간)·
레이트리밋(IP 해시 기준 10분 3건)을 서버에서 수행한다.

`inquiries` 테이블은 **RLS on + 정책 없음**이라 anon 키로는 접근할 수 없고, 삽입은
`service_role` 을 쓰는 Server Action 에서만 일어난다. 접속 IP 는 원문을 저장하지 않고
salt 를 적용한 SHA-256 해시만 남긴다.

스키마: [`supabase/migrations/`](./supabase/migrations) · 상세: [`doc/03-supabase.md`](./doc/03-supabase.md)

## 문서

[`doc/`](./doc) 에 개요·아키텍처·디자인 시스템·DB·의사결정(ADR)·콘텐츠 가이드·
보안 체크리스트·인수인계·작업기록이 있다. 새 환경에서 이어받을 때는
[`doc/07-handoff.md`](./doc/07-handoff.md) 부터 읽는다.

## 스킬

`.claude/skills/` 에 프로젝트 스킬이 커밋되어 있다. 클론하면 다른 계정·다른 머신에서도
같은 절차가 로드된다.

- `apple-design` — Apple 스타일 UI 제작 규범 (외부 스킬, 출처는 `SOURCE.md`)
- `homepage-content` — 서비스·회사정보·문안 수정
- `homepage-section` — 새 페이지·섹션 추가
- `homepage-supabase` — DB 스키마·문의 폼 변경
- `homepage-verify` — 변경 후 검증 루틴
