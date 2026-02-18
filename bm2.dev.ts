/**
 * bm2 development ecosystem configuration (PostgreSQL mode)
 *
 * For SQLite mode, just use: bun run dev
 * For PostgreSQL mode with bm2: bm2 start bm2.dev.ts
 */
export default {
  apps: [
    {
      name: "vamsa-dev",
      script: "node_modules/.bin/vite",
      args: "dev",
      cwd: "apps/web",
      watch: false, // Vite handles HMR
      env: {
        DB_DRIVER: "postgres",
        DATABASE_URL: "postgresql://vamsa:password@localhost:5432/vamsa",
      },
    },
  ],
};
