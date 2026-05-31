const assert = require('node:assert');
const { describe, it } = require('node:test');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/chessplay_test?schema=public';

const authCore = require('../routes/authCore');
const repo = require('../src/repositories/userRepository');

describe('backend authCore route coverage', () => {
  it('registers POST /reset-password', () => {
    const routePaths = authCore.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
    assert(routePaths.includes('/reset-password'), 'Missing /reset-password route');
  });

  it('registers PUT /password', () => {
    const routePaths = authCore.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
    assert(routePaths.includes('/password'), 'Missing /password route');
  });

  it('registers DELETE /account', () => {
    const routePaths = authCore.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
    assert(routePaths.includes('/account'), 'Missing /account route');
  });
});

describe('backend userRepository helper behavior', () => {
  it('updateUserPassword sends correct update payload', async () => {
    let called = false;
    const client = {
      user: {
        update(args) {
          called = true;
          assert.deepStrictEqual(args, { where: { id: 'user-id' }, data: { passwordHash: 'hash123' } });
          return { id: 'user-id' };
        },
      },
    };

    const result = await repo.updateUserPassword('user-id', 'hash123', client);
    assert(called, 'Expected updateUserPassword to call prisma user.update');
    assert.strictEqual(result.id, 'user-id');
  });

  it('softDeleteUser increments tokenVersion and clears refreshTokenHash', async () => {
    let called = false;
    const client = {
      user: {
        update(args) {
          called = true;
          assert.strictEqual(args.where.id, 'user-id');
          assert.strictEqual(args.data.email, 'deleted-user@example.com');
          assert.strictEqual(args.data.username, 'DeletedUser123456');
          assert.strictEqual(args.data.passwordHash, 'hashedpass');
          assert.strictEqual(args.data.refreshTokenHash, null);
          assert(args.data.deletedAt instanceof Date, 'deletedAt should be a Date');
          assert.deepStrictEqual(args.data.tokenVersion, { increment: 1 });
          return { id: 'user-id' };
        },
      },
    };

    const result = await repo.softDeleteUser('user-id', {
      email: 'deleted-user@example.com',
      username: 'DeletedUser123456',
      passwordHash: 'hashedpass',
      deletedAt: new Date(),
      refreshTokenHash: null,
    }, client);
    assert(called, 'Expected softDeleteUser to call prisma user.update');
    assert.strictEqual(result.id, 'user-id');
  });

  it('clearPasswordResetToken resets token fields', async () => {
    let called = false;
    const client = {
      user: {
        update(args) {
          called = true;
          assert.deepStrictEqual(args, { where: { id: 'user-id' }, data: { passwordResetTokenHash: null, passwordResetExpires: null } });
          return { id: 'user-id' };
        },
      },
    };

    const result = await repo.clearPasswordResetToken('user-id', client);
    assert(called, 'Expected clearPasswordResetToken to call prisma user.update');
    assert.strictEqual(result.id, 'user-id');
  });
});
