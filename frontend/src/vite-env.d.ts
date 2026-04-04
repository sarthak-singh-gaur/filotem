/// <reference types="vite/client" />

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.jsx' {
  import type { ComponentType } from 'react'
  const component: ComponentType
  export default component
}
