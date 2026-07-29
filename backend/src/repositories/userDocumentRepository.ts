import { prisma } from '../config/prisma';

type FriendRequest = { _id?: string; from: string; status?: string; createdAt?: string };

export async function getFriendsAndRequests(prismaUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: prismaUserId } });
  if (!user || !user.mongoUserId) return { friends: [], requests: [] };

  const doc = await prisma.documentRecord.findUnique({ where: { id: user.mongoUserId } });
  if (!doc) return { friends: [], requests: [] };

  const data = (doc.data as any) || {};
  const friends: string[] = Array.isArray(data.friends) ? data.friends : [];
  const friendRequests: FriendRequest[] = Array.isArray(data.friendRequests) ? data.friendRequests : [];

  // Load basic profile info for each friend from document records
  const friendDocs = friends.length
    ? await prisma.documentRecord.findMany({ where: { id: { in: friends } } })
    : [];

  const friendsList = friendDocs.map((row) => ({ id: row.id, username: (row.data as any)?.username || null, rating: (row.data as any)?.rating || 1200 }));

  const requestsList = await Promise.all(
    friendRequests
      .filter((r) => r.status === 'pending' && r.from)
      .map(async (r) => {
        const fromDoc = await prisma.documentRecord.findUnique({ where: { id: r.from } });
        return {
          id: r._id || `${r.from}-${r.createdAt || ''}`,
          from: fromDoc ? { id: fromDoc.id, username: (fromDoc.data as any)?.username || null } : { id: r.from },
          createdAt: r.createdAt,
        };
      }),
  );

  return { friends: friendsList, requests: requestsList };
}

export async function sendFriendRequest(prismaUserId: string, targetMongoId: string) {
  const user = await prisma.user.findUnique({ where: { id: prismaUserId } });
  if (!user || !user.mongoUserId) throw new Error('User not found');
  if (!targetMongoId) throw new Error('Invalid target');

  const target = await prisma.documentRecord.findUnique({ where: { id: targetMongoId } });
  if (!target) throw new Error('Target not found');

  const data = (target.data as any) || {};
  data.friendRequests = Array.isArray(data.friendRequests) ? data.friendRequests : [];

  const existing = data.friendRequests.some((req: any) => String(req.from) === String(user.mongoUserId) && req.status === 'pending');
  if (!existing) {
    data.friendRequests.push({ _id: `${Date.now()}-${user.id}`, from: user.mongoUserId, status: 'pending', createdAt: new Date().toISOString() });
    await prisma.documentRecord.update({ where: { id: target.id }, data: { data } });
  }

  return true;
}

export async function respondFriendRequest(prismaUserId: string, requestId: string, action: 'accept' | 'decline') {
  const user = await prisma.user.findUnique({ where: { id: prismaUserId } });
  if (!user || !user.mongoUserId) throw new Error('User not found');

  const doc = await prisma.documentRecord.findUnique({ where: { id: user.mongoUserId } });
  if (!doc) throw new Error('User document not found');

  const data = (doc.data as any) || {};
  data.friendRequests = Array.isArray(data.friendRequests) ? data.friendRequests : [];

  const idx = data.friendRequests.findIndex((r: any) => String(r._id) === String(requestId));
  if (idx === -1) throw new Error('Request not found');

  const request = data.friendRequests[idx];
  if (request.status !== 'pending') throw new Error('Request not pending');

  if (action === 'accept') {
    data.friends = Array.isArray(data.friends) ? data.friends : [];
    if (!data.friends.map(String).includes(String(request.from))) data.friends.push(request.from);

    // Add reciprocal friend relationship
    const other = await prisma.documentRecord.findUnique({ where: { id: request.from } });
    if (other) {
      const otherData = (other.data as any) || {};
      otherData.friends = Array.isArray(otherData.friends) ? otherData.friends : [];
      if (!otherData.friends.map(String).includes(String(doc.id))) otherData.friends.push(doc.id);
      await prisma.documentRecord.update({ where: { id: other.id }, data: { data: otherData } });
    }

    request.status = 'accepted';
  } else {
    request.status = 'declined';
  }

  data.friendRequests[idx] = request;
  await prisma.documentRecord.update({ where: { id: doc.id }, data: { data } });
  return { message: action === 'accept' ? 'Friend added' : 'Request declined' };
}

export default null;
