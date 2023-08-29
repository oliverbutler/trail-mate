import { z } from 'zod';
// @ts-ignore
import cuid from 'cuid';

export type UserId = string & {
  __id: 'user';
};

export const UserIdSchema = z.string().refine((val) => {
  const [prefix, id] = val.split('_');

  return prefix === 'u' && cuid.isCuid(id);
});

export type UserSessionId = string & {
  __id: 'userSession';
};

export const UserSessionIdSchema = z.string().refine((val) => {
  const [prefix, id] = val.split('_');

  return prefix === 'us' && cuid.isCuid(id);
});

export const UserSchema = z.object({
  id: UserIdSchema,
  givenName: z.string(),
  familyName: z.string(),
  email: z.string().email(),
  emailVerifiedAt: z.string().datetime().nullable(),
  username: z.string(),
});

export const CreateUserSchema = z.object({
  givenName: z.string(),
  familyName: z.string(),
  username: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;

export const JwtPayloadSchema = z.object({
  sub: UserIdSchema,
  email: z.string().email(),
  iat: z.number(),
  exp: z.number(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
