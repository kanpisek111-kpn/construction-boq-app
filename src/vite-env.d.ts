/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OWNER_PASSCODE?: string;
  readonly VITE_OWNER_PASSCODE_HASH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

