import 'server-only'

/**
 * 상담 문의 접수 Slack 알림.
 *
 * 현재는 **배선만 되어 있고 동작하지 않는다.** `features.inquiryForm` 이 꺼져 있어
 * 호출 지점이 실행되지 않고, `SLACK_INQUIRY_WEBHOOK_URL` 도 설정되어 있지 않다.
 * 문의 폼을 켜는 시점에 웹훅 URL 만 넣으면 그대로 동작한다.
 *
 * ⚠️ 개인정보를 Slack 으로 보내지 않는다 —
 *    Slack 은 제3자 서비스이고 메시지는 워크스페이스에 장기 보존되며 검색된다.
 *    이름·이메일·연락처·문의 본문을 알림에 넣으면 **개인정보 처리 위탁 범위가
 *    Slack 까지 확대**되어 처리방침의 수탁자 목록에 Slack 을 추가해야 한다.
 *    그래서 알림에는 "무엇이 들어왔는지" 만 담고, 실제 내용은 Supabase 에서 본다.
 *
 *    보내는 것:   접수 시각 · 문의 분야 · 회사명(법인 정보) · 행 id
 *    보내지 않는 것: 담당자 이름 · 이메일 · 연락처 · 문의 본문 · IP 해시
 *
 *    회사명조차 제외하려면 `payload` 에서 `company` 를 빼면 된다. 알림의 유용성과
 *    최소수집 원칙 사이의 트레이드오프이며, 법무 판단에 따라 조정할 것.
 */

export type InquiryNotification = {
  /** Supabase `inquiries.id`. 실제 내용은 이 id 로 대시보드에서 조회한다. */
  id: string
  /** 문의 분야 slug */
  serviceSlug: string
  /** 회사명. 개인정보가 아닌 법인 정보. 제외하려면 호출부에서 빼면 된다. */
  company?: string
}

/** 웹훅이 설정되어 있는가. 미설정이면 알림은 조용히 건너뛴다. */
export function isSlackNotifyConfigured(): boolean {
  return Boolean(process.env.SLACK_INQUIRY_WEBHOOK_URL)
}

function buildBlocks(input: InquiryNotification) {
  const lines = [
    `*분야* ${input.serviceSlug}`,
    input.company ? `*회사* ${input.company}` : null,
    `*접수 id* \`${input.id}\``,
  ].filter(Boolean)

  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `:inbox_tray: *새 상담 문의*\n${lines.join('\n')}` },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '담당자 이름·연락처·문의 내용은 개인정보라 알림에 넣지 않습니다. Supabase 에서 확인하세요.',
        },
      ],
    },
  ]
}

/**
 * 접수 알림을 보낸다. **실패해도 절대 throw 하지 않는다.**
 * 알림 실패가 문의 접수 자체를 실패로 만들면 안 된다 — 접수가 우선이다.
 *
 * @returns 실제로 전송했는지 여부
 */
export async function notifyInquiry(input: InquiryNotification): Promise<boolean> {
  const webhook = process.env.SLACK_INQUIRY_WEBHOOK_URL
  if (!webhook) return false

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: buildBlocks(input) }),
      // 알림이 접수 응답을 붙잡지 않도록 짧게 끊는다.
      signal: AbortSignal.timeout(3_000),
    })

    if (!res.ok) {
      console.error('[inquiry] Slack 알림 실패', { status: res.status })
      return false
    }
    return true
  } catch (error) {
    // 입력값은 절대 로깅하지 않는다.
    console.error('[inquiry] Slack 알림 예외', {
      name: error instanceof Error ? error.name : 'unknown',
    })
    return false
  }
}
