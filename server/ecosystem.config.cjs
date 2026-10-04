// ============================================================
// [COMMENTED OUT FOR VERCEL] PM2 CLUSTER CONFIGURATION
// Vercel handles autoscaling and process management automatically.
// PM2 is not used when deploying to serverless environments like Vercel.
// ============================================================
/*
module.exports = {
  apps: [
    {
      name: "exam-api",
      script: "./Api/Index.js",

      // Running 1 instance prevents burning through free-tier API rate limits
      instances: 1,

      // "cluster" enables PM2's built-in round-robin load balancing
      exec_mode: "cluster",

      // Automatically restart a worker if its memory exceeds 500 MB
      max_memory_restart: "500M",

      // Automatically restart if a process ever crashes
      autorestart: true,

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
*/
module.exports = {};