// Local dev default: the whole app (storefront and admin) runs on the in-memory mock API. No network needed.
export const environment = {
  production: false,
  useMock: true,
  allowDateOverride: true, // ?today=2026-11-10 simulates a date (mock/test only)
  supabaseUrl: '',
  supabaseAnonKey: '',
};
