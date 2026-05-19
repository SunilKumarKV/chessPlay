require("dotenv").config();

const Puzzle = require("../models/Puzzle");
const { connectDatabase } = require("./puzzleUtils");

async function main() {
  await connectDatabase();
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
  }

main().catch(async (error) => {
  console.error(error.message);
    process.exit(1);
});
