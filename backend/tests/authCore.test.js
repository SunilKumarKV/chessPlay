const assert = require('node:assert');
const { describe, it } = require('node:test');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/chessplay_test?schema=public';

const authCore = require('../routes/authCore');
const repo = require('../src/repositories/userRepository');

function withTemporaryEnv(nextEnv, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(nextEnv)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of Object.keys(nextEnv)) {
        if (previous[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previous[key];
        }
      }
    });
}

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

describe('backend production request boundary', () => {
  it('rejects cookie-backed API requests without an Origin header in production', async () => {
    await withTemporaryEnv({
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/chessplay_test?schema=public',
      JWT_ACCESS_SECRET: 'test-access-secret-with-enough-length-12345',
      JWT_REFRESH_SECRET: 'test-refresh-secret-with-enough-length-123',
    }, async () => {
      const envPath = require.resolve('../src/config/env.ts');
      const appPath = require.resolve('../src/app.ts');
      delete require.cache[envPath];
      delete require.cache[appPath];
      const { createApp } = require('../src/app');
      const app = createApp();
      const server = app.listen(0);

      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
          method: 'POST',
          headers: { cookie: 'accessToken=present' },
        });

        assert.strictEqual(response.status, 403);
        assert.deepStrictEqual(await response.json(), { message: 'Origin is required' });
      } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        delete require.cache[appPath];
        delete require.cache[envPath];
      }
    });
  });

  it('allows trusted production origins through the boundary', async () => {
    await withTemporaryEnv({
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/chessplay_test?schema=public',
      JWT_ACCESS_SECRET: 'test-access-secret-with-enough-length-12345',
      JWT_REFRESH_SECRET: 'test-refresh-secret-with-enough-length-123',
    }, async () => {
      const envPath = require.resolve('../src/config/env.ts');
      const appPath = require.resolve('../src/app.ts');
      delete require.cache[envPath];
      delete require.cache[appPath];
      const { createApp } = require('../src/app');
      const app = createApp();
      const server = app.listen(0);

      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
          method: 'POST',
          headers: { origin: 'https://getchessplay.vercel.app' },
        });

        assert.notStrictEqual(response.status, 403);
      } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        delete require.cache[appPath];
        delete require.cache[envPath];
      }
    });
  });
});
