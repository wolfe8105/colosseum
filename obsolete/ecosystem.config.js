module.exports = {
  apps: [
    {
      name: 'colosseum-bots',
      script: 'dist/bot-engine.js',
      node_args: '--max-old-space-size=256',
      autorestart: true,
      max_restarts: 50,
      min_uptime: '10s',
      restart_delay: 5000,
      max_memory_restart: '200M',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'production',
      },
      cron_restart: '0 4 * * *',
      watch: false,
    },
  ],
};
