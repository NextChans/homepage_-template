import { Reveal } from './reveal'
import { ButtonAnchor, ButtonLink, Container } from './ui'
import { company } from '@/content/site'

export function CtaBand({
  title = '어디서부터 시작할지 모르겠다면.',
  body = '현재 사업 구조만 알려주시면 필요한 절차와 순서를 정리해 회신드립니다. 상담은 무료입니다.',
}: {
  title?: string
  body?: string
}) {
  return (
    <div className="border-t border-hairline bg-surface">
      <Container className="py-24 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal as="h2" className="type-headline">
            {title}
          </Reveal>
          <Reveal as="p" className="type-lede mt-6" delay={60}>
            {body}
          </Reveal>
          <Reveal className="mt-10 flex flex-wrap justify-center gap-3" delay={120}>
            <ButtonLink href="/contact">상담 신청</ButtonLink>
            <ButtonAnchor href={`tel:${company.tel.replace(/-/g, '')}`}>
              {company.tel}
            </ButtonAnchor>
          </Reveal>
        </div>
      </Container>
    </div>
  )
}
