module.exports = {
  apps: [
    {
      name: "exam-api",
      script: "./Api/Index.js",

      // "max" automatically detects all CPU cores on your machine
      // and spawns 1 worker process per core (e.g. 4, 8, or 16)
      instances: "max",

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