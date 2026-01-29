/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOST: string
  readonly VITE_PORT: string
  readonly VITE_SERVER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
