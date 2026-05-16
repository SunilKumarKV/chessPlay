require("dotenv").config();

const mongoose = require("mongoose");
const Puzzle = require("../models/Puzzle");
const { connectMongo } = require("./puzzleUtils");

async function main() {
  await connectMongo();
  const [total, byDifficulty, premium, active] = await Promise.all([
    Puzzle.countDocuments(),
    Puzzle.aggregate([{ $group: { _id: "$difficulty", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Puzzle.countDocuments({ isPremium: true }),
    Puzzle.countDocuments({ isActive: true }),
  ]);

  console.log(JSON.stringify({
    total,
    active,
    premium,
    byDifficulty: Object.fromEntries(byDifficulty.map((row) => [row._id, row.count])),
  }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
