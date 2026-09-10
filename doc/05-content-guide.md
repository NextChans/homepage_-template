# 05. 콘텐츠 교체 체크리스트

현재 사이트의 **모든 회사 정보·수치·문안은 임시 데이터**다. 실서비스 전에 아래를 교체한다.
작업 절차는 `.claude/skills/homepage-content/SKILL.md` 참고.

## 필수 교체 (법적·사실 정보)

- [ ] `content/site.ts` → `site.name`, `site.nameEn`, `site.legalName`
- [ ] `content/site.ts` → `company.ceo` (대표자명)
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

- [ ] `content/site.ts` → `metrics` 4개 (`320+`, `12,000대`, `90일`, `24/7`)
- [ ] `app/page.tsx` → `PanelStats` 수치 (`90일`, `3영업일`, `96%`, `자동`, `5년`, `24/7`)
- [ ] `app/about/page.tsx` → `history` 연혁 4건
- [ ] `content/services.ts` → 각 서비스 `duration` (`표준 3 – 10 영업일` 등)
- [ ] `content/services.ts` → 상세 본문의 요건·절차 서술 (법령 개정 여부 확인)

## 서면 동의 후 게재

- [ ] `content/site.ts` → `partnerLogos` (현재 `VAN A`, `PG C` 등 임시 텍스트)
      → 실제 상호/로고는 **제휴사 서면 사용 동의 필수**
- [ ] `components/logo-strip.tsx` → 텍스트를 `next/image` 로 교체

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
