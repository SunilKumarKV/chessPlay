import { prisma } from '../config/prisma';

type CreateUserInput = {
  email: string;
  username: string;
  displayName?: string | null;
  passwordHash?: string | null;
  rating?: number;
  isPremium?: boolean;
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

export async function createUser(input: CreateUserInput) {
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      username: input.username,
      displayName: input.displayName ?? null,
      passwordHash: input.passwordHash ?? null,
      rating: input.rating ?? 1200,
      isPremium: input.isPremium ?? false,
    },
  });
}

export async function updateUserRating(userId: string, rating: number) {
  return prisma.user.update({ where: { id: userId }, data: { rating } });
}

export async function setUserPremium(userId: string, isPremium: boolean) {
  return prisma.user.update({ where: { id: userId }, data: { isPremium } });
}
