/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL for backend. Default in dev: http://localhost:5001/api */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
