import { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '../config/prisma';

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

type CreateUserInput = {
  email: string;
  username: string;
  displayName?: string | null;
  passwordHash?: string | null;
  rating?: number;
  isPremium?: boolean;
  emailVerified?: boolean;
};

export async function findUserById(id: string, client: PrismaClientLike = prisma) {
  return client.user.findUnique({ where: { id } });
}

export async function findUserByEmail(email: string, client: PrismaClientLike = prisma) {
  return client.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function findUserByUsername(username: string, client: PrismaClientLike = prisma) {
  return client.user.findUnique({ where: { username } });
}

export async function findUserByEmailOrUsername(email: string, username: string, client: PrismaClientLike = prisma) {
  return client.user.findFirst({ where: { OR: [{ email: email.toLowerCase() }, { username }] } });
}

export async function findUserByEmailVerificationHash(tokenHash: string, now = new Date(), client: PrismaClientLike = prisma) {
  return client.user.findFirst({ where: { emailVerificationTokenHash: tokenHash, emailVerificationExpires: { gt: now } } });
}

export async function findUserByPasswordResetHash(tokenHash: string, now = new Date(), client: PrismaClientLike = prisma) {
  return client.user.findFirst({ where: { passwordResetTokenHash: tokenHash, passwordResetExpires: { gt: now } } });
}

export async function createUser(input: CreateUserInput, client: PrismaClientLike = prisma) {
  return client.user.create({
    data: {
      email: input.email.toLowerCase(),
      username: input.username,
      displayName: input.displayName ?? null,
      passwordHash: input.passwordHash ?? null,
      rating: input.rating ?? 1200,
      isPremium: input.isPremium ?? false,
      emailVerified: input.emailVerified ?? false,
    },
  });
}

export async function updateUserRating(userId: string, rating: number, client: PrismaClientLike = prisma) {
  return client.user.update({ where: { id: userId }, data: { rating } });
}

export async function setUserPremium(userId: string, isPremium: boolean, client: PrismaClientLike = prisma) {
  return client.user.update({ where: { id: userId }, data: { isPremium } });
}

export async function updateUserAuthSession(userId: string, input: { refreshTokenHash?: string | null; lastLogin?: Date; tokenVersion?: number }, client: PrismaClientLike = prisma) {
  return client.user.update({
    where: { id: userId },
    data: {
      ...(Object.prototype.hasOwnProperty.call(input, 'refreshTokenHash') ? { refreshTokenHash: input.refreshTokenHash } : {}),
      ...(input.lastLogin ? { lastLogin: input.lastLogin } : {}),
      ...(typeof input.tokenVersion === 'number' ? { tokenVersion: input.tokenVersion } : {}),
    },
  });
}

export async function clearUserRefreshToken(userId: string, client: PrismaClientLike = prisma) {
  return client.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
}

export async function setEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date, client: PrismaClientLike = prisma) {
  return client.user.update({ where: { id: userId }, data: { emailVerificationTokenHash: tokenHash, emailVerificationExpires: expiresAt } });
}

export async function markEmailVerified(userId: string, client: PrismaClientLike = prisma) {
  return client.user.update({ where: { id: userId }, data: { emailVerified: true, emailVerificationTokenHash: null, emailVerificationExpires: null } });
}

export async function setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date, client: PrismaClientLike = prisma) {
  return client.user.update({ where: { id: userId }, data: { passwordResetTokenHash: tokenHash, passwordResetExpires: expiresAt } });
}

export async function clearPasswordResetToken(userId: string, client: PrismaClientLike = prisma) {
  return client.user.update({ where: { id: userId }, data: { passwordResetTokenHash: null, passwordResetExpires: null } });
}

export async function updateUserPassword(userId: string, passwordHash: string, client: PrismaClientLike = prisma) {
  return client.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function softDeleteUser(userId: string, input: { email: string; username: string; passwordHash: string; deletedAt: Date; refreshTokenHash?: string | null }, client: PrismaClientLike = prisma) {
  return client.user.update({
    where: { id: userId },
    data: {
      email: input.email.toLowerCase(),
      username: input.username,
      passwordHash: input.passwordHash,
      refreshTokenHash: input.refreshTokenHash ?? null,
      deletedAt: input.deletedAt,
      tokenVersion: { increment: 1 },
    },
  });
}

export async function incrementUserStats(userId: string, delta: Record<string, number>, client: PrismaClientLike = prisma) {
  const current = await client.stats.findUnique({ where: { userId } });
  const data = {
    ...((current?.data as Record<string, unknown>) || {}),
  } as Record<string, number>;

  for (const [key, value] of Object.entries(delta)) {
    data[key] = Number(data[key] || 0) + Number(value);
  }

  return client.stats.upsert({
    where: { userId },
    create: { userId, data },
    update: { data },
  });
}

export async function recordUserDraw(userId: string, client: PrismaClientLike = prisma) {
  return incrementUserStats(userId, { gamesPlayed: 1, gamesDrawn: 1 }, client);
}
