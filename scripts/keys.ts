/**
 * Generates the wallets Meruit needs. Secrets go to .secrets/ and .env.local (both gitignored).
 * Prints public keys only. Safe to re-run: existing keys are never overwritten.
 */
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { base58 } from "@scure/base";

type Role = { env: string; file: string; label: string; needs: string };

const ROLES: Role[] = [
  { env: "MERUIT_FEE_PAYER_KEY", file: "fee-payer", label: "Fee payer (hot, mainnet + devnet)", needs: "0.05 SOL on mainnet, 1 SOL on devnet" },
  { env: "MERUIT_RECEIVER_AUTHORIZER_KEY", file: "receiver-authorizer", label: "Receiver authorizer (signs vouchers)", needs: "nothing" },
  { env: "MERUIT_DEVNET_SPONSOR_KEY", file: "devnet-sponsor", label: "Devnet sponsor (judge pocket)", needs: "devnet SOL + 5 devnet USDC" },
  { env: "MERUIT_BUYER_TEST_KEY", file: "buyer-test", label: "Buyer test wallet (live jobs, scripts)", needs: "5 USDC + 0.01 SOL mainnet; same key on devnet" },
  { env: "MERUIT_SELLER_TEST_KEY", file: "seller-test", label: "Seller payout placeholder (replace MERUIT_PAY_TO with your Phantom)", needs: "nothing" },
];

function newKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const d = Buffer.from(privateKey.export({ format: "jwk" }).d as string, "base64url");
  const x = Buffer.from(publicKey.export({ format: "jwk" }).x as string, "base64url");
  return { secret: base58.encode(Buffer.concat([d, x])), address: base58.encode(x) };
}

function addressOf(secretB58: string) {
  return base58.encode(Buffer.from(base58.decode(secretB58)).subarray(32));
}

function readEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/\s+#.*$/, "");
  }
  return out;
}

mkdirSync(".secrets", { recursive: true });
const env = readEnv(".env.local");
const created: string[] = [];
const rows: { label: string; address: string; needs: string; env: string }[] = [];

for (const role of ROLES) {
  let secret = env[role.env];
  if (!secret) {
    const kp = newKeypair();
    secret = kp.secret;
    env[role.env] = secret;
    writeFileSync(`.secrets/${role.file}.json`, JSON.stringify({ address: kp.address, secret: kp.secret }) + "\n");
    chmodSync(`.secrets/${role.file}.json`, 0o600);
    created.push(role.env);
  }
  rows.push({ label: role.label, address: addressOf(secret), needs: role.needs, env: role.env });
}

if (!env.CRON_SECRET) { env.CRON_SECRET = randomBytes(32).toString("hex"); created.push("CRON_SECRET"); }
if (!env.MERUIT_SIGNING_SECRET) { env.MERUIT_SIGNING_SECRET = randomBytes(32).toString("hex"); created.push("MERUIT_SIGNING_SECRET"); }
if (!env.MERUIT_PAY_TO) env.MERUIT_PAY_TO = addressOf(env.MERUIT_SELLER_TEST_KEY);

// Re-write .env.local from the template so every variable is present and documented.
const template = readFileSync(".env.example", "utf8");
const lines = template.split("\n").map((line) => {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) return line;
  const key = m[1];
  const comment = (m[2].match(/\s+#.*$/) ?? [""])[0];
  const value = env[key] ?? m[2].replace(/\s+#.*$/, "");
  return `${key}=${value}${comment}`;
});
writeFileSync(".env.local", lines.join("\n"));
chmodSync(".env.local", 0o600);

console.log(created.length ? `Created: ${created.join(", ")}` : "No new keys created (all present).");
console.log("\nPublic keys (safe to share):\n");
for (const r of rows) console.log(`${r.address}  ${r.label}\n    env ${r.env}\n    fund: ${r.needs}\n`);
console.log("Secrets are in .env.local and .secrets/ only. Neither is committed.");
