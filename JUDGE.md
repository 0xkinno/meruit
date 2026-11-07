# JUDGE.md

Live spending is capped at $0.25 per job and $1 per wallet per day. Status of what exists today is in PROGRESS.md.

## 60 seconds
1. Open `/judge`. The recorded run plays there once a real job has been recorded (none yet).
2. Open `/proof` for the failure table and the counterfactual computed from the meter code.
3. Open `/rescue` and connect a wallet: it reads the network directly, not Meruit's servers.

## 3 minutes
Open `/studio`, connect Phantom, pick the 12 minute sample. The approval dialog shows the exact ceiling the wallet will sign ($0.12). Needs the live flag on and Groq and Blob configured.

## 10 minutes
Run `npm run probe`, `npm test`, and `npx tsx scripts/run-job.ts --clip hero --dry` to see the real 402 challenge. Read SDK_SURFACE.md for what is code-only and what has run.
