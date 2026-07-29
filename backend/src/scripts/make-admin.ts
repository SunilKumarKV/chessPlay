// @ts-nocheck
import dotenv from "dotenv";
dotenv.config();
import User from "../models/User";
import { checkDatabase } from "../lib/prisma";

async function main() {
  const email = String(process.argv[2] || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (!email) {
    console.error('Usage: pnpm --filter backend make-admin -- yourmail@gmail.com');
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
