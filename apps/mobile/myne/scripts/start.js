require("dotenv").config();
const { spawn } = require("child_process");

const proc = spawn("npx", ["expo", "start", "--dev-client"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
proc.on("exit", (code) => process.exit(code ?? 0));
