require("dotenv").config();

const fs = require("fs");
const readline = require("readline");
const Puzzle = require("../models/Puzzle");
const { connectDatabase, normalizePuzzleRecord } = require("./puzzleUtils");

const CSV_HEADERS = [
  "PuzzleId",
  "FEN",
  "Moves",
  "Rating",
  "RatingDeviation",
  "Popularity",
  "NbPlays",
  "Themes",
  "GameUrl",
  "OpeningTags",
];

function option(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

async function flush(batch) {
  if (!batch.length) return { upserted: 0, modified: 0 };
  const result = await Puzzle.bulkWrite(batch, { ordered: false });
  batch.length = 0;
  return {
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
  };
}

async function main() {
  const file = option("file");
  const limit = Number.parseInt(option("limit", "0"), 10) || 0;
  const batchSize = Number.parseInt(option("batchSize", "1000"), 10) || 1000;
  if (!file) {
    throw new Error("Usage: pnpm import:puzzles -- --file ./data/lichess_db_puzzle.csv --limit 5000");
  }
  if (!fs.existsSync(file)) throw new Error(`CSV file not found: ${file}`);

  await connectDatabase();

  const input = fs.createReadStream(file);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  const batch = [];
  let headers = null;
  let imported = 0;
  let upserted = 0;
  let modified = 0;

  for await (const line of lines) {
    if (!line.trim()) continue;
    if (!headers) {
      const parsed = parseCsvLine(line);
      headers = parsed.includes("PuzzleId") ? parsed : CSV_HEADERS;
      if (parsed.includes("PuzzleId")) continue;
    }

    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    const puzzle = normalizePuzzleRecord(record);
    if (!puzzle.puzzleId || !puzzle.fen || puzzle.moves.length < 2) continue;

    batch.push({
      updateOne: {
        filter: { puzzleId: puzzle.puzzleId },
        update: { $set: puzzle },
        upsert: true,
      },
    });
    imported += 1;

    if (batch.length >= batchSize) {
      const result = await flush(batch);
      upserted += result.upserted;
      modified += result.modified;
      console.log(`Imported ${imported} puzzles...`);
    }
    if (limit && imported >= limit) break;
  }

  const result = await flush(batch);
  upserted += result.upserted;
  modified += result.modified;
  console.log(`Done. Processed ${imported} puzzles. Upserted ${upserted}, modified ${modified}.`);
  }

main().catch(async (error) => {
  console.error(error.message);
    process.exit(1);
});
