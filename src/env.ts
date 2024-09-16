import z from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
});

// Ao fazer o parse, basicamente verifica se o meu objeto process.env está seguindo o formato do envSchema
export const env = envSchema.parse(process.env);
