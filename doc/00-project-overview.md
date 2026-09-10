# 00. 프로젝트 개요

## 무엇인가

전자금융 인프라 사업자용 **기업 홈페이지 템플릿**. Apple 디자인 언어를 적용한 정적 중심 사이트에
상담 문의 접수(Supabase) 기능을 붙였다.

대상 업종(임시 설정):

1. 밴(VAN) 단말기 공급·설치·유지보수
2. PG 영업대행
3. 전자금융업 등록 컨설팅
4. 금융 클라우드 이용등록 컨설팅
5. 금융결제원 오픈뱅킹 컨설팅

> ⚠️ 회사명(`넥스트챈스`), 대표·사업자번호·주소·연락처, 실적 지표, 연혁, 파트너 표기는
> **전부 임시 데이터**다. 교체 목록은 `05-content-guide.md` 참고.

## 기술 스택

| 영역 | 선택 | 버전 |
|---|---|---|
| 프레임워크 | Next.js App Router | 15.5.4 |
| 언어 | TypeScript (strict, `noUncheckedIndexedAccess`) | 5.9 |
| 스타일 | Tailwind CSS v4 (`@theme` 토큰) | 4.1 |
| 검증 | zod | 4.6 |
| DB | Supabase (PostgreSQL) | `@supabase/supabase-js` 2.58 |
| 스크린샷 | Playwright (devDependency) | 1.56 |

폰트는 로드하지 않는다. **시스템 폰트 스택**(`-apple-system` → `SF Pro` → `Pretendard` →
`Apple SD Gothic Neo`)을 사용한다. 웹폰트 요청이 없어 LCP 가 빠르고, apple-design 스킬의
타이포그래피 원칙과도 일치한다.

## 실행

```bash
npm install
cp .env.example .env.local     # Supabase 값 입력 (없어도 실행은 된다)
npm run dev                    # http://localhost:3000
```

| 스크립트 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (SSG/SSR 경로 확인 가능) |
| `npm run start` | 빌드 산출물 실행 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next/core-web-vitals + next/typescript) |
| `npm run screenshot` | 라이트/다크/모바일 스크린샷 캡처 |

## 라우트

| 경로 | 렌더링 | 설명 |
|---|---|---|
| `/` | Static | 홈 |
| `/services` | Static | 서비스 목록 |
| `/services/[slug]` | SSG (5경로) | 서비스 상세 |
| `/about` | Static | 회사소개 |
| `/contact` | Dynamic | 문의 (searchParams `?service=` 프리셋) |
| `/privacy` | Static | 개인정보처리방침 (`robots: noindex`) |
| `/sitemap.xml`, `/robots.txt` | Static | SEO |
