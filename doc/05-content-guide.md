# 05. 콘텐츠 교체 체크리스트

**확정된 값과 임시 값이 섞여 있다.** 체크가 안 된 항목이 아직 임시다.
실서비스 전에 아래를 교체한다. 작업 절차는 `.claude/skills/homepage-content/SKILL.md` 참고.

**확정 (2026-09-10)**: 상호 `Work In Trust`, 약어 표기 `W.I.T`, 대표자 `최봉균`.

## 필수 교체 (법적·사실 정보)

- [x] `content/site.ts` → `site.name` = `W.I.T`, `site.nameEn` = `WORK IN TRUST` (2026-09-10 확정)
- [x] `content/site.ts` → `company.ceo` = `최봉균` (2026-09-10 확정)
- [ ] `content/site.ts` → `site.legalName` — **사업자등록증 상의 정식 법인명**
      (법인 형태 포함). 현재 `Work In Trust` 로 두었고 **임의로 '주식회사' 를 붙이지
      않았다** — 푸터·개인정보처리방침의 사업자 표시 정보라 틀리면 문제가 된다
- [ ] `content/site.ts` → `company.bizNo` (사업자등록번호)
- [ ] `content/site.ts` → `company.address`
- [ ] `content/site.ts` → `company.tel`, `company.fax`, `company.email`
- [ ] `content/site.ts` → `company.privacyOfficer` (개인정보 보호책임자 성명·연락처)
- [ ] `.env` → `NEXT_PUBLIC_SITE_URL` (실도메인)
- [x] `app/privacy/page.tsx` → 4항 보관 리전 = 서울(`ap-northeast-2`) 반영 (2026-09-10)
- [ ] `app/privacy/page.tsx` → 4항 **국외 이전 해당 여부 법무 확정** 후 "검토 진행 중" 문구 교체
- [ ] `app/privacy/page.tsx` → 8항 시행일
- [ ] `components/site-footer.tsx` 하단 "본 사이트는 템플릿 예시입니다" 고지 **제거**
- [ ] `app/contact/page.tsx` 의 Supabase 미설정 개발 안내 배너 제거 검토

## 검증 후 공개 (근거 없으면 삭제)

> 아래 수치는 **`XXX+` / `X,XXX대` / `OO` / `OOOO` 플레이스홀더로 치환된 상태**다
> (2026-09-10, ADR-014). 근거를 확보한 항목만 실제 숫자로 바꾸고,
> **확보하지 못한 항목은 숫자를 만들지 말고 배열에서 제거**할 것.

- [ ] `content/site.ts` → `metrics` 4개 (`XXX+`, `X,XXX대`, `XX일`, `OO`)
- [ ] `app/page.tsx` → `PanelStats` 수치 (`XX일`, `X영업일`, `XX%`, `OO`, `X년`, `OO`)
- [ ] `app/about/page.tsx` → `history` 연혁 4건 (연도 `OOOO`)
- [ ] `content/services.ts` → 각 서비스 `duration` (`표준 3 – 10 영업일` 등)
- [ ] `content/services.ts` → 상세 본문의 요건·절차 서술 (법령 개정 여부 확인)

## 서면 동의 후 게재

- [ ] `content/site.ts` → `partnerLogos` (현재 `VAN A`, `PG C` 등 임시 텍스트)
      → 실제 상호/로고는 **제휴사 서면 사용 동의 필수**
- [ ] `components/logo-strip.tsx` → 텍스트를 `next/image` 로 교체

## 현재 내려둔 기능

`content/features.ts` 플래그로 비활성. 재활성화 체크리스트는 그 파일 주석 참고.

- [ ] 상담 문의 폼 (`features.inquiryForm`) — 전화·이메일로만 문의 접수 중
- [ ] 개인정보처리방침 공개 (`features.privacyPolicy`) — 초안 상태
- [ ] 접수 Slack 알림 — 배선 완료, `SLACK_INQUIRY_WEBHOOK_URL` 미설정

## 없는 것 (필요하면 추가)

- [ ] 파비콘 / OG 이미지 (`app/icon.png`, `app/opengraph-image.png`)
- [ ] 이용약관 페이지
- [ ] 채용, 고객사례, 뉴스/인사이트 페이지
- [ ] 애널리틱스 (GA4 / GTM)
- [ ] 다국어 (현재 `lang="ko"` 단일)

## 문안 톤 (교체 시 유지할 것)

- 헤드라인은 명사구 + 마침표. 12자 이내 목표. 예: `설치. 하루면 끝.`
- 한 문장에 하나의 주장. 접속사로 이어붙이지 않는다.
- 전문용어를 이익 표현으로 번역한다.
- **단정·최상급 금지**: `100% 승인`, `반드시 통과`, `최저 수수료 보장` → 표시광고법 리스크.
  기간·통과율은 `표준`, `평균` 등 추정임을 명시한다.
