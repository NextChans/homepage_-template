/**
 * 관리자 화면 공통 날짜 표기.
 *
 * ⚠️ `timeZone: 'Asia/Seoul'` 을 명시한다. 서버(Vercel)는 UTC 로 동작하므로
 *    지정하지 않으면 담당자가 보는 시각이 9시간 어긋난다. 처리 이력·감사 로그의
 *    시각이 어긋나면 사고 조사에서 바로 문제가 된다.
 */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
