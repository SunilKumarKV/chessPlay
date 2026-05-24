import { prisma } from '../config/prisma';

type CreateUserInput = {
  email: string;
  username: string;
  displayName?: string | null;
  passwordHash?: string | null;
  rating?: number;
  isPremium?: boolean;
  emailVerified?: boolean;
};

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username } });
}

export async function findUserByEmailOrUsername(email: string, username: string) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        { username },
      ],
    },
  });
}

export async function createUser(input: CreateUserInput) {
  return prisma.user.create({
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

export async function updateUserRating(userId: string, rating: number) {
  return prisma.user.update({ where: { id: userId }, data: { rating } });
}

export async function setUserPremium(userId: string, isPremium: boolean) {
  return prisma.user.update({ where: { id: userId }, data: { isPremium } });
}

export async function updateUserAuthSession(userId: string, input: { refreshTokenHash?: string | null; lastLogin?: Date; tokenVersion?: number }) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(Object.prototype.hasOwnProperty.call(input, 'refreshTokenHash') ? { refreshTokenHash: input.refreshTokenHash } : {}),
      ...(input.lastLogin ? { lastLogin: input.lastLogin } : {}),
      ...(typeof input.tokenVersion === 'number' ? { tokenVersion: input.tokenVersion } : {}),
    },
  });
}

export async function clearUserRefreshToken(userId: string) {
  return prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
}

export async function recordUserDraw(userId: string) {
  const current = await prisma.stats.findUnique({ where: { userId } });
  const data = {
    ...((current?.data as Record<string, unknown>) || {}),
    gamesPlayed: Number((current?.data as any)?.gamesPlayed || 0) + 1,
    gamesDrawn: Number((current?.data as any)?.gamesDrawn || 0) + 1,
  };
  return prisma.stats.upsert({
    where: { userId },
    create: { userId, data },
    update: { data },
  });
}
