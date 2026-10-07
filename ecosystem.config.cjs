/* PM2 process for the production server.
   Secrets are NOT here: they live in .env.production on the server (git-ignored),
   which `next start` loads by itself. The port is confirmed per server (another
   app may already use 3000). */
module.exports = {
  apps: [
    {
      name: "chebba",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p " + (process.env.PORT || 3100),
      exec_mode: "fork",
      instances: 1,
      env: { NODE_ENV: "production" },
      max_memory_restart: "600M",
      kill_timeout: 8000,
      time: true,
    },
  ],
};
