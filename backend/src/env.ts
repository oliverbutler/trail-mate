import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

export const envSchema = z.object({
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10)),
  DB_CONNECTION_STRING: z.string(),
  IMAGE_TAG: z.string().optional(),
  HOST: z.string().default('localhost'),
});

export type Environment = z.infer<typeof envSchema>;

const environmentResult = envSchema.safeParse(process.env);

if (!environmentResult.success) {
  throw {
    message: 'Environment validation failed',
    errors: environmentResult.error.errors,
  };
}

export const environment = environmentResult.data;
