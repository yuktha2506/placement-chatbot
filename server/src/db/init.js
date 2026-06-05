import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");

let connection;

try {
  connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true
  });

  await connection.query(schema);
  console.log("Database initialized successfully.");
} catch (error) {
  if (error.code === "ER_ACCESS_DENIED_ERROR") {
    console.error("\nMySQL access denied.");
    console.error("Check these values in D:\\placement_chatbot\\server\\.env:");
    console.error("- DB_USER");
    console.error("- DB_PASSWORD");
    console.error("\nCurrent connection:");
    console.error(`- DB_HOST=${env.db.host}`);
    console.error(`- DB_PORT=${env.db.port}`);
    console.error(`- DB_USER=${env.db.user}`);
    console.error(`- DB_PASSWORD=${env.db.password ? "(set)" : "(empty)"}`);
    console.error("\nAfter updating .env, run: npm run db:init\n");
    process.exit(1);
  }

  throw error;
} finally {
  await connection?.end();
}
