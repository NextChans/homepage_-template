import { partnerLogos } from '@/content/site'
import { Container } from './ui'
import { Reveal } from './reveal'

/**
 * 파트너 표기. 실제 로고 이미지가 준비되면 텍스트를 <Image /> 로 교체한다.
 * ⚠️ 제휴사 로고는 서면 사용 동의 후에만 게재할 것.
 */
export function LogoStrip() {
  return (
    <Container className="py-20">
      <Reveal as="p" className="text-center text-[13px] text-ink-muted">
        주요 VAN · PG · 금융기관과 연동합니다
      </Reveal>
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-16">
        {partnerLogos.map((name, i) => (
          <Reveal
            as="li"
            key={name}
            delay={i * 40}
            className="text-[15px] font-medium tracking-[-0.01em] text-ink-muted/70"
          >
            {name}
          </Reveal>
        ))}
      </ul>
    </Container>
  )
}
