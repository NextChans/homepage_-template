# 문서 인덱스

이 디렉터리는 **다른 계정·다른 환경에서 작업을 이어받을 수 있게** 하는 것이 목적이다.
새 세션을 시작하면 `doc/07-handoff.md` 를 먼저 읽는다.

| 문서 | 내용 |
|---|---|
| [00-project-overview.md](./00-project-overview.md) | 무엇을 만들었나, 기술 스택, 실행 방법 |
| [01-architecture.md](./01-architecture.md) | 디렉터리 구조, 렌더링 전략, 데이터 흐름 |
| [02-design-system.md](./02-design-system.md) | apple-design 스킬 적용 규범, 토큰, 컴포넌트 계약 |
| [03-supabase.md](./03-supabase.md) | 스키마, RLS, 마이그레이션, 환경변수 |
| [04-decisions.md](./04-decisions.md) | 의사결정 기록 (ADR) |
| [05-content-guide.md](./05-content-guide.md) | 임시 데이터 교체 체크리스트 |
| [06-security-compliance.md](./06-security-compliance.md) | 보안·개인정보·표시광고 리스크와 미해결 항목 |
| [07-handoff.md](./07-handoff.md) | **다른 환경에서 이어가기** |
| [08-worklog.md](./08-worklog.md) | 작업 기록 |
| [09-deployment.md](./09-deployment.md) | **Supabase + Vercel 연동 절차** (비밀키를 채팅에 노출하지 않는 경로) |
| [10-admin.md](./10-admin.md) | **관리자 페이지 운영** — 활성화 절차, 사고 대응, 감사 로그 조회 |

## 문서 작성 규칙

- 중요한 판단은 **결정한 순간에** `04-decisions.md` 에 남긴다. 나중에 몰아 쓰지 않는다.
- 임시(placeholder) 데이터를 실데이터로 바꾸면 `05-content-guide.md` 체크박스를 갱신한다.
- 미해결 리스크는 지우지 않고 `06-security-compliance.md` 에 남겨둔다.
- 반복되는 작업 절차를 발견하면 문서가 아니라 **스킬**로 만든다 (`.claude/skills/`).
