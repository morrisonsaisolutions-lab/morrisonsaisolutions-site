import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .filter(line => line.includes('=') && !line.startsWith('#'))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim()]; }));
if (!env.PUBLIC_POSTHOG_TOKEN?.startsWith('phc_') || !/^https:\/\//.test(env.PUBLIC_POSTHOG_HOST || '')) {
  throw new Error('Set PUBLIC_POSTHOG_TOKEN and PUBLIC_POSTHOG_HOST in .env');
}
await build({
  entryPoints: ['scripts/analytics.js'], bundle: true, minify: true,
  outfile: 'assets/analytics-v1.js', format: 'iife', target: ['es2020'],
  define: { POSTHOG_TOKEN: JSON.stringify(env.PUBLIC_POSTHOG_TOKEN), POSTHOG_HOST: JSON.stringify(env.PUBLIC_POSTHOG_HOST) }
});
