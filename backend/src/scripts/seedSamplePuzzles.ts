// @ts-nocheck
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import Puzzle from "../models/Puzzle";
import samplePuzzles from "../data/sample-puzzles.json";
import { connectDatabase, normalizePuzzleRecord } from "./puzzleUtils";

async function main() {
  await connectDatabase();
  const operations = samplePuzzles.map((record) => {
    const puzzle = normalizePuzzleRecord(record);
    return {
      updateOne: {
        filter: { puzzleId: puzzle.puzzleId },
        update: { $set: puzzle },
        upsert: true,
      },
    };
  });

  const result = operations.length ? await Puzzle.bulkWrite(operations, { ordered: false }) : {};
  console.log(`Seeded ${operations.length} sample puzzles from ${path.join("data", "sample-puzzles.json")}.`);
  console.log(`Upserted ${result.upsertedCount || 0}, modified ${result.modifiedCount || 0}.`);
  }

main().catch(async (error) => {
  console.error(error.message);
    process.exit(1);
});
