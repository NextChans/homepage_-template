import { ButtonLink, Container } from '@/components/ui'

export default function NotFound() {
  return (
    <Container className="py-40 text-center">
      <p className="type-eyebrow">404</p>
      <h1 className="type-headline mt-4">여기엔 없습니다.</h1>
      <p className="type-lede mx-auto mt-6 max-w-md">
        주소가 바뀌었거나 삭제된 페이지입니다. 처음부터 다시 시작하세요.
      </p>
      <div className="mt-10 flex justify-center gap-3">
        <ButtonLink href="/">홈으로</ButtonLink>
        <ButtonLink href="/services" variant="secondary">
          서비스 보기
        </ButtonLink>
      </div>
    </Container>
  )
}
