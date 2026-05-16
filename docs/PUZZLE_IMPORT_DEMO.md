# ChessPlay Puzzle Import Demo

ChessPlay can run with the committed sample puzzles, so this import is optional. Use it when you want thousands of real puzzles from the Lichess open puzzle database.

Puzzle data source: Lichess open database (CC0)  
Download page: https://database.lichess.org/#puzzles

## 1. Seed Sample Puzzles

Use this for local development if you do not want the large CSV yet:

```bash
pnpm --filter backend seed:puzzles:sample
pnpm --filter backend puzzles:stats
```

## 2. Download The Lichess CSV

From the project root:

```bash
mkdir -p backend/data
curl -L https://database.lichess.org/lichess_db_puzzle.csv.zst -o backend/data/lichess_db_puzzle.csv.zst
```

Install `zstd` if needed:

```bash
brew install zstd
```

Decompress:

```bash
zstd -d backend/data/lichess_db_puzzle.csv.zst -o backend/data/lichess_db_puzzle.csv
```

Do not commit these downloaded files:

```text
backend/data/lichess_db_puzzle.csv.zst
backend/data/lichess_db_puzzle.csv
```

They are intentionally ignored by git.

## 3. Import A Safe First Batch

Start with 5,000 puzzles:

```bash
pnpm --filter backend import:puzzles -- --file ./data/lichess_db_puzzle.csv --limit 5000
```

Check the result:

```bash
pnpm --filter backend puzzles:stats
```

## 4. Import More Puzzles

Import 50,000:

```bash
pnpm --filter backend import:puzzles -- --file ./data/lichess_db_puzzle.csv --limit 50000
```

Import 100,000:

```bash
pnpm --filter backend import:puzzles -- --file ./data/lichess_db_puzzle.csv --limit 100000
```

Import the full CSV:

```bash
pnpm --filter backend import:puzzles -- --file ./data/lichess_db_puzzle.csv
```

The full import can take a while and will make local MongoDB much larger.

## 5. Run Locally

Backend:

```bash
JWT_ACCESS_SECRET=12345678901234567890123456789012 \
JWT_REFRESH_SECRET=abcdefghijklmnopqrstuvwxyz123456 \
PORT=3001 \
pnpm --filter backend start
```

Frontend:

```bash
pnpm --filter frontend dev --host 0.0.0.0
```

Open:

```text
http://localhost:5173/puzzles
```

## Troubleshooting

If you see:

```text
CSV file not found: ./data/lichess_db_puzzle.csv
```

It means the CSV has not been downloaded and decompressed into `backend/data` yet. Either run the download steps above or use:

```bash
pnpm --filter backend seed:puzzles:sample
```
