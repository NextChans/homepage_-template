---
name: homepage-content
description: 이 홈페이지 템플릿의 콘텐츠(서비스 항목, 회사 정보, 지표, 파트너, 문안)를 추가·수정·삭제한다. 사용자가 "서비스 추가해줘", "밴 단말기 설명 바꿔줘", "회사 정보 실제 값으로 교체", "지표 수정", "새 서비스 페이지 만들어줘", "FAQ 추가" 등을 말할 때 사용한다. 콘텐츠는 코드가 아니라 content/ 하위 데이터 모듈에만 존재하므로, 페이지 컴포넌트를 직접 고치기 전에 반드시 이 스킬을 먼저 확인한다.
---

# 콘텐츠 변경 절차

이 프로젝트의 모든 사용자 노출 문안은 **`content/` 하위 데이터 모듈**에만 있다.
페이지(`app/**/page.tsx`)는 데이터를 렌더링만 한다. 문안을 페이지에 하드코딩하지 않는다.

## 1. 파일 위치

| 대상 | 파일 |
|---|---|
| 회사명·법인명·연락처·주소·개인정보 보호책임자 | `content/site.ts` → `site`, `company` |
| 상단/하단 내비게이션 | `content/site.ts` → `nav` |
| 홈 신뢰 지표(숫자 4개) | `content/site.ts` → `metrics` |
| 파트너 표기 | `content/site.ts` → `partnerLogos` |
| 서비스 5종 전체(카드·상세·FAQ·산출물·프로세스) | `content/services.ts` → `services` |
| 홈 전용 문안(히어로, 두 개의 FeatureSplit, 여정 4단계) | `app/page.tsx` 상수 및 JSX |
| 회사소개 원칙·연혁 | `app/about/page.tsx` 상수 |
| 개인정보처리방침 | `app/privacy/page.tsx` → `sections` |

## 2. 서비스 항목을 추가할 때

1. `content/services.ts` 의 `ServiceSlug` 유니온에 새 slug 를 추가한다.
2. `services` 배열에 `Service` 타입을 모두 채운 객체를 추가한다. **필드를 비우지 않는다** —
   `problems`, `deliverables`, `process`, `faq`, `duration`, `mark` 전부 필수다.
3. `mark` 는 표시 순서대로 `01`…`06` 형태로 부여한다.
4. `supabase/migrations/` 에 새 마이그레이션을 추가해
   `inquiries_service_slug_check` 제약에 새 slug 를 포함시킨다.
   → 이 단계를 빠뜨리면 해당 분야로 들어온 문의 저장이 DB 제약에서 실패한다.
   (제약 변경은 `homepage-supabase` 스킬 참고)
5. `/services`, `/services/[slug]`, 푸터, 문의 폼 select 는 배열을 순회하므로 코드 수정 불필요.
6. `npm run build` 로 `generateStaticParams` 가 새 경로를 생성하는지 확인한다.

## 3. 문안 작성 규칙 (apple-design 스킬과 함께 지킨다)

- 카드/히어로 헤드라인(`headline`)은 **명사구 + 마침표**로 끊는다. 예: `설치. 하루면 끝.`
- 한 문장에 하나의 주장만 담는다. 접속사로 이어붙이지 않는다.
- 전문용어는 사용자 이익으로 번역한다. `RLS 적용` (X) → `공개 API 로는 조회되지 않습니다` (O)
- 헤드라인은 한국어 기준 12자 이내를 목표로 한다. 넘으면 `type-display` 스케일에서 줄바꿈이 깨진다.

## 4. 규제 도메인 문안 주의 (필수)

이 사이트는 전자금융·PG·오픈뱅킹 업종이다. 다음은 **작성 즉시 리스크**가 된다.

- 인가·등록 **소요기간과 통과율을 확정적으로 단정**하는 표현 → `표준 N주`, `평균` 등 추정임을 명시
- `100% 승인`, `반드시 통과`, `최저 수수료 보장` 류의 단정·최상급 표현 → 표시광고법 리스크
- 법령 요건(자본금·물적설비 등) 수치의 직접 인용 → 개정 가능. 인용 시 근거 조문과 확인일자를 함께 남긴다
- 제휴사·금융기관 상호와 로고 → **서면 사용 동의 전 게재 금지** (`partnerLogos` 는 현재 임시 텍스트)
- 실적 수치(`metrics`) → 근거 자료 없이 대외 공개 금지

변경 후에는 `doc/05-content-guide.md` 의 교체 체크리스트를 갱신한다.

## 5. 마무리

- `npm run typecheck && npm run lint && npm run build`
- 문안 변경이 레이아웃을 깨뜨리지 않았는지 `homepage-verify` 스킬로 확인한다.
- 중요한 판단(문안 기조 변경, 지표 확정 등)은 `doc/04-decisions.md` 에 기록한다.
