import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const config = [
  // 생성 파일과 빌드 산출물은 검사 대상이 아니다.
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '.screenshots/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
]

export default config
