/**
 * bm2 production ecosystem configuration
 *
 * Start:   bm2 start bm2.config.ts
 * Status:  bm2 list
 * Logs:    bm2 logs vamsa --follow
 * Reload:  bm2 reload vamsa (zero-downtime)
 * Stop:    bm2 stop all
 */
export default {
  apps: [
    {
      name: "vamsa",
      script: "apps/web/server/index.ts",
      instances: "max",
      exec_mode: "cluster",
      port: 3000,
      env: {
        NODE_ENV: "production",
        DB_DRIVER: "postgres",
      },
      health_check_url: "http://localhost:3000/health",
      health_check_interval: 30000,
      max_memory_restart: "512M",
      log_max_size: "10M",
      log_retain: 5,
      log_compress: true,
    },
  ],
};
