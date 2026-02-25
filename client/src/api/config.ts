/**
 * API base URL. Set VITE_API_URL in .env or at build time.
 * Default for local dev: http://localhost:5001/api
 */
export const getApiBaseUrl = (): string =>
  import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
