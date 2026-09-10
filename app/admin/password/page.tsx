import type { Metadata } from 'next'
import Link from 'next/link'
import { OwnPasswordForm } from '@/components/admin/user-forms'
import { Container } from '@/components/ui'
import { requireSessionAllowingPasswordChange } from '@/lib/admin/guard'
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/admin/roles'

export const metadata: Metadata = {
  title: '비밀번호 변경',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

/**
 * 비밀번호 변경 화면. **첫 로그인 안내를 겸한다.**
 *
 * ⚠️ 일반 가드를 쓰면 `mustChangePassword` 상태에서 이 화면이 자신으로
 *    리다이렉트되어 무한 루프가 된다. 그래서 전용 가드를 쓴다.
 *
 * ⚠️ 첫 로그인(초기 비밀번호) 상태와 평상시 변경을 **같은 화면에서 다르게 안내**한다.
 *    처음 들어온 담당자는 "왜 바꿔야 하는지"와 "바꾸면 무엇을 할 수 있는지" 를 모른다.
 *    한 줄 경고만 두면 지시로만 읽히고, 초기 비밀번호를 그대로 쓰려는 시도가 생긴다.
 */
export default async function AdminPasswordPage() {
  const session = await requireSessionAllowingPasswordChange()
  const first = session.mustChangePassword

  return (
    <Container className="py-12">
      {!first ? (
        <Link href="/admin" className="text-[13px] font-medium text-accent hover:text-accent-hover">
          ‹ 문의
        </Link>
      ) : null}

      {first ? (
        <p className="type-eyebrow mt-6">첫 로그인</p>
      ) : null}

      <h1 className="type-title mt-2">
        {first ? '비밀번호를 변경해 주세요.' : '비밀번호 변경'}
      </h1>

      {first ? (
        <>
          <p className="type-body mt-4 max-w-xl text-[15px]">
            <b className="font-medium text-ink">{session.username}</b> 님, 환영합니다. 지금 쓰신
            비밀번호는 관리자가 정해 전달한 <b className="font-medium text-ink">초기 비밀번호</b>
            입니다. 본인만 아는 비밀번호로 바꾸기 전까지는 다른 화면을 이용할 수 없습니다.
          </p>

          <div className="mt-8 max-w-xl rounded-squircle-lg border border-hairline bg-surface p-6">
            <p className="text-[13px] font-medium text-ink">왜 지금 바꿔야 하나요</p>
            <ul className="mt-3 space-y-2 text-[14px] text-ink-muted">
              <li className="flex gap-2.5">
                <span aria-hidden className="text-ink-muted">
                  —
                </span>
                <span>
                  초기 비밀번호는 <b className="font-medium text-ink">전달 경로(메신저·메일)에
                  그대로 남아 있습니다.</b> 그 경로를 볼 수 있는 사람은 누구나 로그인할 수
                  있습니다.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden className="text-ink-muted">
                  —
                </span>
                <span>
                  이 화면 안쪽은 <b className="font-medium text-ink">고객의 이름·연락처·문의
                  내용</b>을 다룹니다. 모든 조회·변경은 담당자 이름으로 기록됩니다.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden className="text-ink-muted">
                  —
                </span>
                <span>
                  비밀번호를 바꾸면 <b className="font-medium text-ink">관리자도 그 값을 알 수
                  없습니다.</b> 기록에 남는 행위가 본인의 것임이 그때부터 성립합니다.
                </span>
              </li>
            </ul>

            <div className="mt-6 border-t border-hairline pt-5">
              <p className="text-[13px] font-medium text-ink">
                변경하면 {ROLE_LABEL[session.role]} 권한으로 이용할 수 있습니다
              </p>
              <p className="mt-2 text-[14px] text-ink-muted">{ROLE_DESCRIPTION[session.role]}</p>
            </div>
          </div>

          <div className="mt-6 max-w-xl rounded-2xl border border-hairline bg-surface-2 px-5 py-4 text-[13px] text-ink-muted">
            <b className="font-medium text-ink">비밀번호를 정할 때</b> — 12자 이상, 다른 서비스와
            재사용하지 않기, 비밀번호 관리자에 보관하기. 잊으면 관리자가 초기화해 줄 수 있지만
            그때 이 절차를 다시 거쳐야 합니다.
            <br />
            <b className="font-medium text-ink">전달받은 초기 비밀번호는 지금 삭제하세요.</b>{' '}
            메신저·메일에 남겨두면 변경한 의미가 줄어듭니다.
          </div>
        </>
      ) : (
        <p className="type-body mt-4 max-w-xl text-[15px]">
          변경하면 <b className="font-medium text-ink">다른 기기의 세션이 모두 만료</b>됩니다.
          공용 PC 에 로그인이 남아 있을 때도 이 방법으로 정리할 수 있습니다.
        </p>
      )}

      {session.isBootstrap ? (
        <p className="mt-6 max-w-xl rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          지금은 <b className="font-medium text-ink">비상 복구 계정</b>으로 로그인해 있습니다.
          이 계정의 비밀번호는 환경변수(<code>ADMIN_PASSWORD_HASH</code>)에 있어 여기서 바꿀 수
          없습니다. Vercel 에서 값을 교체하고 재배포하세요.
        </p>
      ) : (
        <OwnPasswordForm />
      )}
    </Container>
  )
}
