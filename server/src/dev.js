import { spawn } from "node:child_process";
import { env } from "./config/env.js";
import { isPortAvailable } from "./utils/port.js";

const available = await isPortAvailable(env.port);

if (!available) {
  console.log(`Backend already appears to be running on http://localhost:${env.port}`);
  console.log("Use the existing server, or stop the old process before starting another one.");
  process.exit(0);
}

const nodemonBin = process.platform === "win32"
  ? "node_modules\\.bin\\nodemon.cmd"
  : "node_modules/.bin/nodemon";

const child = spawn(nodemonBin, ["src/index.js"], {
  stdio: "inherit",
  shell: true
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
