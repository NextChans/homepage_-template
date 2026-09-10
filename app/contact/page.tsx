import type { Metadata } from 'next'
import { ContactForm } from '@/components/contact-form'
import { Hero } from '@/components/hero'
import { Reveal } from '@/components/reveal'
import { Container, Section } from '@/components/ui'
import { services } from '@/content/services'
import { company } from '@/content/site'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '문의',
  description: '결제 인프라 구축과 전자금융 규제 대응 상담을 접수합니다. 1영업일 내 회신드립니다.',
}

const options = [
  ...services.map((s) => ({ value: s.slug, label: s.name })),
  { value: 'other', label: '기타 문의' },
] as const

type PageProps = { searchParams: Promise<{ service?: string }> }

export default async function ContactPage({ searchParams }: PageProps) {
  const { service } = await searchParams
  const preset = options.find((o) => o.value === service)?.value

  return (
    <>
      <Hero
        size="headline"
        eyebrow="문의"
        title="한 번만 적으면 됩니다."
        lede="현재 상황과 목표만 알려주세요. 필요한 절차와 순서, 예상 일정을 정리해 회신드립니다."
        meta="첫 회신까지 평균 1영업일"
      />

      <Section className="border-t border-hairline pt-16 sm:pt-20 lg:pt-24">
        <Container>
          <div className="grid gap-16 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
            <Reveal>
              <h2 className="type-title">직접 연락도 좋습니다.</h2>
              <dl className="mt-8 space-y-6 text-[15px]">
                <div>
                  <dt className="text-[13px] text-ink-muted">전화</dt>
                  <dd className="mt-1">
                    <a
                      href={`tel:${company.tel.replace(/-/g, '')}`}
                      className="text-ink hover:text-accent"
                    >
                      {company.tel}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] text-ink-muted">이메일</dt>
                  <dd className="mt-1">
                    <a href={`mailto:${company.email}`} className="text-ink hover:text-accent">
                      {company.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] text-ink-muted">운영시간</dt>
                  <dd className="mt-1 text-ink">{company.hours}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-ink-muted">주소</dt>
                  <dd className="mt-1 text-ink">{company.address}</dd>
                </div>
              </dl>
            </Reveal>

            <Reveal delay={80}>
              {isSupabaseConfigured() ? null : (
                <p className="mb-6 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[13px] text-ink-muted">
                  개발 안내: Supabase 환경변수가 설정되지 않아 접수가 저장되지 않습니다.{' '}
                  <code className="text-ink">.env.local</code> 을 확인하세요. (운영 배포 전 제거)
                </p>
              )}
              <ContactForm options={options} defaultServiceSlug={preset} />
            </Reveal>
          </div>
        </Container>
      </Section>
    </>
  )
}
