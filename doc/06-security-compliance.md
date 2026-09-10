# 06. 보안 · 개인정보 · 표시광고

전자금융 업종 사이트라 마케팅 페이지라도 리스크가 일반 기업 홈페이지보다 크다.
**해결한 것과 남은 것을 분리해 기록한다. 남은 항목은 지우지 않는다.**

## 적용한 조치

### 애플리케이션

| 항목 | 구현 |
|---|---|
| 보안 헤더 | `next.config.ts` — `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS(preload) |
| 서버 정보 은닉 | `poweredByHeader: false` |
| 서버 전용 모듈 격리 | `lib/supabase/server.ts` 에 `import 'server-only'` |
| 비밀키 노출 방지 | `SUPABASE_SERVICE_ROLE_KEY` / `INQUIRY_IP_HASH_SALT` 에 `NEXT_PUBLIC_` 미사용 |
| 입력 검증 | `lib/inquiry-schema.ts` (zod) — 서버에서 재검증. 클라이언트 검증만 신뢰하지 않는다 |
| 봇 차단 | honeypot(`company_website`) + 최소 작성시간 2초 |
| 어뷰징 억제 | `ip_hash` 기준 10분 3건 레이트리밋 |
| 로그 위생 | 에러 로그에 입력값(개인정보) 미출력. `error.code`/`message` 만 |

### 데이터

| 항목 | 구현 |
|---|---|
| 접근 통제 | `inquiries` RLS on + 정책 없음 + `revoke all from anon, authenticated` |
| 수집 최소화 | 이름·회사·이메일·연락처·문의내용만. 고유식별정보·금융정보 미수집 |
| IP 비식별화 | salt + SHA-256 해시만 저장. salt 없으면 미저장 |
| 동의 증빙 | `privacy_consent` (필수, `check` 제약으로 false 저장 차단), `marketing_consent` (선택) 분리 저장 |
| 감사 필드 | `created_at`, `updated_at`(트리거), `status`, `handled_at`, `handled_by` |
| 민감정보 입력 억제 | 폼에 "주민등록번호·계좌·카드번호 입력 금지" 안내 문구 |

### 접근성

skip link, `aria-invalid` / `aria-describedby` 로 필드 에러 연결, `aria-expanded`/`aria-controls`
모바일 메뉴, 포커스 링 유지, `prefers-reduced-motion` 대응, `<noscript>` 리빌 폴백.

## 남은 리스크 (운영 전 처리)

### 높음

- [ ] **`service_role` 키 관리** — 유출 시 DB 전체 노출. 배포 플랫폼 시크릿 저장소 사용,
      로테이션 주기 정의, 접근 권한자 명단 관리가 필요하다.
- [ ] **개인정보처리방침이 초안**이다 — 수집 항목·보유기간(3년)·수탁자·국외이전 여부를
      실제 운영과 일치시키고 법무/준법감시 검토를 받아야 한다.
- [ ] **보관기간 경과 데이터 삭제가 미구현** — 방침에 3년으로 적어두고 삭제 잡이 없으면
      그 자체가 위반이다. `pg_cron` 등으로 구성해야 한다.
- [ ] **실적 수치가 근거 없이 게재**되어 있다 (`320+`, `96%`, `12,000대` 등).
      근거 자료 없이 대외 공개하면 표시광고법 리스크.

### 중간

- [ ] **CSP 미설정** — 현재 헤더에 `Content-Security-Policy` 가 없다. 서드파티 스크립트를
      붙이기 전에 nonce 기반 CSP 를 도입한다.
- [ ] **`x-forwarded-for` 신뢰** — 신뢰 프록시 앞단이 없으면 위조 가능. IP 해시를
      인증·권한 판단에 쓰지 않는다는 전제를 유지해야 한다.
- [ ] **레이트리밋이 비원자적** — 동시 요청에서 한도 초과 가능. 어뷰징 억제 목적이라 허용했다.
- [ ] **접수 알림 없음** — 문의가 DB 에만 쌓인다. 대응 SLA(1영업일)를 사이트에 명시했으므로
      알림 채널이 없으면 약속을 지킬 수 없다.
- [ ] **관리자 조회 경로 없음** — 만들 경우 인증 + 접근 감사 로그를 함께 설계한다.
- [ ] **제휴사 로고/상호** — 서면 사용 동의 전 게재 금지.

### 낮음

- [ ] CSRF 는 Next.js Server Action 의 Origin 검증에 의존. 별도 토큰 없음.
- [ ] 백업/복구 정책(Supabase PITR) 미정.
- [ ] 취약점 스캔·의존성 감사(`npm audit`)를 CI 에 넣지 않았다.

## 절대 하지 않을 것

- `inquiries` 에 anon 접근 정책을 열기
- 주민등록번호·계좌번호·카드번호를 이 테이블에 저장
- 원문 IP 저장
- 로그·에러 메시지에 개인정보 출력
- 공개 페이지에서 문의 목록 조회
