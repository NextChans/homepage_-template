import type { Metadata } from 'next'
import { Container, Section } from '@/components/ui'
import { company, site } from '@/content/site'

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '상담 문의 시 수집하는 개인정보의 항목, 목적, 보유기간과 이용자의 권리를 안내합니다.',
  robots: { index: false, follow: true },
}

const sections = [
  {
    title: '1. 수집하는 개인정보 항목',
    body: [
      '상담 문의 접수 시 다음 항목을 수집합니다.',
      '· 필수: 담당자 이름, 회사명, 이메일, 연락처, 문의 내용',
      '· 자동 수집: 접속 IP 의 해시값(원문 IP 미저장), User-Agent, 유입 경로',
      '주민등록번호, 계좌번호, 카드번호 등 고유식별정보 및 금융정보는 수집하지 않습니다.',
    ],
  },
  {
    title: '2. 수집·이용 목적',
    body: [
      '· 상담 요청에 대한 회신 및 서비스 안내',
      '· 계약 체결 전 요건 검토 및 제안서 제공',
      '· 문의 폼 어뷰징 차단(IP 해시값에 한함)',
      '· (선택 동의 시) 규제 변경 등 정보성 메일 발송',
    ],
  },
  {
    title: '3. 보유 및 이용기간',
    body: [
      '수집일로부터 3년간 보유한 후 지체 없이 파기합니다.',
      '단, 계약이 체결된 경우 관련 법령이 정한 기간(예: 전자상거래법상 계약 및 청약철회 기록 5년) 동안 보관합니다.',
      '선택 동의로 수집한 마케팅 수신 정보는 동의 철회 시 즉시 파기합니다.',
    ],
  },
  {
    title: '4. 처리 위탁 및 국외 이전',
    body: [
      '문의 데이터의 저장·관리를 위해 아래 수탁자를 이용합니다.',
      '· 수탁자: Supabase Inc. — 위탁 업무: 데이터베이스 호스팅',
      '· 보관 리전: 서울(AWS ap-northeast-2). 문의 데이터가 저장되는 데이터베이스는 국내 리전에 위치합니다.',
      '· 다만 수탁자는 국외 법인이며, 백업·로그·기술지원 목적의 접근 경로와 수탁자의 재위탁 업체(sub-processor) 구성에 따라 일부 처리가 국외 이전에 해당할 수 있습니다. 해당 여부와 고지·동의 방식은 법무 검토를 거쳐 확정한 뒤 본 항에 반영합니다. (검토 진행 중)',
      '수탁자에 대해서는 개인정보 보호 관련 지시 준수, 재위탁 제한, 안전성 확보 조치를 계약에 반영합니다.',
    ],
  },
  {
    title: '5. 정보주체의 권리',
    body: [
      '이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다.',
      `요청은 개인정보 보호책임자(${company.privacyOfficer})에게 접수하며, 접수일로부터 10일 내 처리 결과를 통지합니다.`,
    ],
  },
  {
    title: '6. 안전성 확보 조치',
    body: [
      '· 접근권한 최소화: 문의 데이터는 서버 측 권한(service role)으로만 접근하며, 공개 API 로는 조회되지 않습니다.',
      '· 전송 구간 암호화(TLS) 적용',
      '· 접속 IP 는 salt 를 적용한 단방향 해시로만 저장',
      '· 접근 기록 보관 및 주기적 점검',
    ],
  },
  {
    title: '7. 개인정보 보호책임자',
    body: [`· 보호책임자: ${company.privacyOfficer}`, `· 전화: ${company.tel}`],
  },
  {
    title: '8. 방침 변경',
    body: [
      '본 방침은 2026년 9월 10일부터 적용됩니다. 내용이 추가·삭제·수정될 경우 시행 7일 전부터 공고합니다.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <Section>
      <Container>
        <div className="mx-auto max-w-3xl">
          <h1 className="type-headline">개인정보처리방침</h1>
          <p className="type-body mt-6">
            {site.legalName}(이하 &ldquo;회사&rdquo;)는 「개인정보 보호법」에 따라 이용자의
            개인정보를 보호하고 관련 고충을 신속히 처리하기 위해 다음과 같이 처리방침을 수립합니다.
          </p>

          <div className="mt-8 rounded-2xl border border-hairline bg-surface p-5">
            <p className="text-[13px] leading-relaxed text-ink-muted">
              ⚠️ 본 문서는 템플릿 초안입니다. 실제 공개 전 수집 항목, 보유기간, 수탁자, 국외 이전
              여부를 실제 운영 내용과 일치시키고 법무·준법감시 검토를 받아야 합니다.
            </p>
          </div>

          <div className="mt-14 space-y-12">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{s.title}</h2>
                <div className="mt-4 space-y-2">
                  {s.body.map((line) => (
                    <p key={line} className="text-[15px] leading-relaxed text-ink-muted">
                      {line}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}
