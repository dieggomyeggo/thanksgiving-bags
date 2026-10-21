import { defineConfig } from 'vitest/config';

// Unit tests for the pure shared modules and the Edge Function cores (plain Node, no Angular).
// Angular component/service specs run through `ng test`.
export default defineConfig({
  test: {
    include: ['supabase/functions/**/*.spec.ts', 'scripts/**/*.spec.ts'],
    environment: 'node',
  },
});
