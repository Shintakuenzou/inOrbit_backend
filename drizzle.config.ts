import { defineConfig } from "drizzle-kit";
import { env } from "./src/env";
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./.migrations", // vai definir onde vai ficar os arquivos de migrations (arquivos que definem a linha de tempo do nosso BD)
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
