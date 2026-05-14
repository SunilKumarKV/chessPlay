require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const email = String(process.argv[2] || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (!email) {
    console.error('Usage: node backend/scripts/make-admin.js yourmail@gmail.com');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOneAndUpdate(
    { email },
    { isAdmin: true },
    { new: true },
  ).select('email username isAdmin');
  if (!user) {
    console.error(`No user found for ${email}. Register/login first, then run again.`);
    process.exitCode = 1;
  } else {
    console.log(`Admin enabled for ${user.email} (${user.username}).`);
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
