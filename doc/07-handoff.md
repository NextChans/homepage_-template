# 07. 인수인계 — 다른 계정 · 다른 환경에서 이어가기

## 1. 새 세션에서 3분 안에 복귀하기

```bash
git clone https://github.com/NextChans/homepage_-template.git
cd homepage_-template
git checkout claude/apple-style-homepage-iv3pxl
npm install
cp .env.example .env.local        # Supabase 값이 없어도 실행은 된다
npm run dev
```

읽는 순서:

1. 저장소 루트 `CLAUDE.md` — 에이전트가 자동으로 읽는 프로젝트 규칙
2. `doc/00-project-overview.md` — 무엇을 만들었나
3. `doc/04-decisions.md` — **왜 그렇게 했나** (여기를 읽지 않으면 결정을 되돌리게 된다)
4. `doc/06-security-compliance.md` — 남은 리스크
5. `doc/05-content-guide.md` — 다음에 할 일(임시 데이터 교체)

## 2. 스킬이 함께 따라온다

`.claude/skills/` 가 저장소에 커밋되어 있으므로, **클론만 하면 다른 계정·다른 머신에서도
같은 스킬이 로드된다.** Claude Code 는 세션 시작 시 프로젝트 레벨 스킬을 자동 인식한다.

| 스킬 | 언제 뜨는가 |
|---|---|
| `apple-design` | Apple 스타일 UI/랜딩 페이지를 만들 때 (외부 스킬, 출처 `SOURCE.md`) |
| `homepage-content` | 서비스·회사정보·문안을 고칠 때 |
| `homepage-section` | 새 페이지·섹션을 추가할 때 |
| `homepage-supabase` | DB 스키마·문의 폼 필드를 바꿀 때 |
| `homepage-verify` | 변경 후 검증할 때 |

> 세션 **중간에** 스킬을 새로 설치하면 그 세션에서는 `Skill` 툴로 로드되지 않는다
> (레지스트리가 세션 시작 시점에 고정된다). 다음 세션부터 자동 인식된다.
> 급하면 `SKILL.md` 를 직접 읽어서 규범을 따르면 된다.

## 3. 환경별로 다시 준비해야 하는 것

| 항목 | 저장소에 있나 | 조치 |
|---|---|---|
| 소스·문서·스킬 | O | 클론으로 끝 |
| `node_modules` | X | `npm install` |
| `.env.local` | X (`.gitignore`) | `.env.example` 복사 후 값 입력 |
| Supabase 프로젝트 | X | 새 환경이면 프로젝트 생성 → `supabase db push` |
| Playwright 브라우저 | X | 원격 세션은 `/opt/pw-browsers` 에 사전 설치됨. 로컬은 `npx playwright install chromium` |
| 스크린샷(`.screenshots/`) | X (`.gitignore`) | `npm run screenshot` 으로 재생성 |

## 4. Supabase 를 새로 만드는 경우

1. supabase.com 에서 프로젝트 생성 (리전은 국내 서비스면 서울 권장 —
   **국외 리전을 쓰면 개인정보 국외이전 고지가 필요하다**)
2. Settings → API 에서 URL / anon key / service_role key 복사 → `.env.local`
3. `openssl rand -hex 32` → `INQUIRY_IP_HASH_SALT`
4. `supabase link --project-ref <ref> && supabase db push`
5. Table Editor 에서 `inquiries` 의 **RLS enabled** 확인
6. `/contact` 에서 실제 제출 → Table Editor 에 행이 생기고 `ip_hash` 가 해시값인지 확인

## 5. 배포

아직 배포 설정이 없다. Vercel 을 쓸 경우:

- 환경변수 4개를 Production/Preview 양쪽에 등록 (`SUPABASE_SERVICE_ROLE_KEY` 는 Production 만 권장)
- `NEXT_PUBLIC_SITE_URL` 을 실도메인으로
- 배포 전 `doc/05-content-guide.md` 의 **필수 교체** 항목을 모두 처리
- 배포 후 `doc/06-security-compliance.md` 의 CSP 항목을 다시 검토

## 6. 작업 규칙 (사용자 요청사항)

1. **중요사항은 항상 `doc/` 하위에 문서로 남긴다.** 결정은 `04-decisions.md`,
   진행은 `08-worklog.md`, 리스크는 `06-security-compliance.md`.
2. **반복 작업은 스킬로 만들어 `.claude/skills/` 에 설치하고 커밋한다.**
   문서로 설명하고 끝내지 않는다.
3. **작업은 GitHub 에 푸시한다.** 브랜치 `claude/apple-style-homepage-iv3pxl`.
   컨테이너는 세션 종료 후 회수되므로 커밋하지 않은 것은 사라진다.
