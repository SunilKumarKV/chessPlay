import { prisma } from '../config/prisma';

export async function createGame(input: {
  whitePlayerId?: string | null;
  blackPlayerId?: string | null;
  status?: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  fen?: string | null;
  moves?: unknown;
  timeControl?: string | null;
}) {
  return prisma.game.create({
    data: {
      whitePlayerId: input.whitePlayerId ?? null,
      blackPlayerId: input.blackPlayerId ?? null,
      status: input.status ?? 'WAITING',
      fen: input.fen ?? null,
      moves: input.moves ?? null,
      timeControl: input.timeControl ?? null,
    },
  });
}

export async function findGameById(id: string) {
  return prisma.game.findUnique({ where: { id } });
}

export async function updateGame(id: string, data: Record<string, unknown>) {
  return prisma.game.update({ where: { id }, data: data as any });
}
