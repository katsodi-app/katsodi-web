import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([...nextVitals, ...nextTs, globalIgnores(['.next/**', '.next-audit*/**', '.claude/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**', '.local/**', 'brag-output/**', 'desktop/dist/**', 'desktop/out/**', 'desktop/dist-test-results/**', 'public/sw.js', 'native-desktop/build/**', 'native-desktop/staging/**', 'native-api/dist/**'])]);
