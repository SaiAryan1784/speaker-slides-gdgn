import { config } from "dotenv";

config({ path: ".env" });
process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-123456";
process.env.ADMIN_PASSWORD ??= "test-password";
