require('dotenv').config();
const User = require('../models/User');
const { checkDatabase } = require('../lib/prisma');

async function main() {
  const email = String(process.argv[2] || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (!email) {
    console.error('Usage: node backend/scripts/make-admin.js yourmail@gmail.com');
    process.exit(1);
  }
  const database = await checkDatabase();
  if (!database.ok) {
    console.error(`DATABASE_URL unavailable: ${database.message}`);
    process.exit(1);
  }
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { isAdmin: true } },
    { new: true },
  ).select('email username isAdmin');
  if (!user) {
    console.error(`No user found for ${email}. Register/login first, then run again.`);
    process.exitCode = 1;
  } else {
    console.log(`Admin enabled for ${user.email} (${user.username}).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
