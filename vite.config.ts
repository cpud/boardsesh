import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    singleQuote: true,
    semi: true,
    trailingComma: 'all',
  },
  test: {
    projects: [
      './packages/web/vite.config.ts',
      './packages/backend/vite.config.ts',
      './packages/moonboard-ocr/vite.config.ts',
      './packages/board-constants/vite.config.ts',
    ],
  },
  staged: {
    '*.{ts,tsx,js,mjs,cjs}': 'vp check --fix',
  },
  run: {
    tasks: {
      'db:up': {
        command: 'sh scripts/dev-db-up.sh',
        cache: false,
      },
      'dev:backend': {
        command: 'bun run --filter=boardsesh-backend dev',
        dependsOn: ['db:up'],
        cache: false,
      },
      'dev:web': {
        command: 'bun run --filter=@boardsesh/web dev',
        dependsOn: ['db:up'],
        cache: false,
      },
      dev: {
        command: 'tsx scripts/dev-orchestrator.ts',
        dependsOn: ['db:up'],
        cache: false,
      },
    },
  },
});
