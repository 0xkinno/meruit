// Meruit self-facilitates x402 v2 `upto` on Solana payment-channels.
// Imports verified against @x402/* 2.30.0 type definitions (see SDK_SURFACE.md).
import { base58 } from "@scure/base";
import { createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/kit";
import { x402Facilitator } from "@x402/core/facilitator";
import { x402ResourceServer } from "@x402/core/server";
import type { FacilitatorClient } from "@x402/core/server";
import { toFacilitatorSvmSigner } from "@x402/svm";
import { UptoSvmScheme as UptoFacilitator, type UptoSvmRentCleanupManager } from "@x402/svm/upto/facilitator";
import { UptoSvmScheme as UptoServer } from "@x402/svm/upto/server";
import { RedisPaymentChannelStorage } from "./redisChannelStorage";
import { caip2, networkName, usdcMint } from "../channels/constants";

export const NETWORK = () => caip2() as `${string}:${string}`;

export function rpcUrl(): string {
  const url = networkName() === "devnet" ? process.env.SOLANA_RPC_DEVNET : process.env.SOLANA_RPC_MAINNET;
  return url || (networkName() === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
}

export const withdrawDelaySecs = () => parseInt(process.env.MERUIT_WITHDRAW_DELAY_SECS || "900", 10);

export type X402Runtime = {
  server: x402ResourceServer;
  facilitator: x402Facilitator;
  feePayer: KeyPairSigner;
  receiverAuthorizer: KeyPairSigner;
  cleanup: UptoSvmRentCleanupManager;
  storage: RedisPaymentChannelStorage;
};

let cached: Promise<X402Runtime> | null = null;

export function getX402(): Promise<X402Runtime> {
  cached ??= (async () => {
    const feeKey = process.env.MERUIT_FEE_PAYER_KEY;
    const authKey = process.env.MERUIT_RECEIVER_AUTHORIZER_KEY;
    if (!feeKey || !authKey) throw new Error("keys_unconfigured");
    const feePayer = await createKeyPairSignerFromBytes(base58.decode(feeKey));
    const receiverAuthorizer = await createKeyPairSignerFromBytes(base58.decode(authKey));
    const storage = new RedisPaymentChannelStorage(); // durable: serverless instances do not share memory
    const network = NETWORK();

    const scheme = new UptoFacilitator(toFacilitatorSvmSigner(feePayer, { defaultRpcUrl: rpcUrl() }), {
      channelStorage: storage,
      maxChannelLifetimeSecs: Math.max(3600, withdrawDelaySecs() * 2),
    });
    const facilitator = new x402Facilitator();
    facilitator.register(network, scheme);

    const client: FacilitatorClient = {
      verify: (p, r) => facilitator.verify(p, r),
      settle: (p, r) => facilitator.settle(p, r),
      getSupported: async () => facilitator.getSupported() as never,
    };
    const server = new x402ResourceServer(client).register(
      network,
      new UptoServer({ receiverAuthorizerSigner: receiverAuthorizer, rpcUrl: rpcUrl(), withdrawDelay: withdrawDelaySecs() }),
    );
    await server.initialize();
    return { server, facilitator, feePayer, receiverAuthorizer, cleanup: scheme.createRentCleanupManager(network), storage };
  })().catch((e) => { cached = null; throw e; });
  return cached;
}

export const asset = () => usdcMint();
