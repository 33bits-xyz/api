import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === "true";
export const { NODE_ENV, PORT, LOG_FORMAT, LOG_DIR, ORIGIN } = process.env;
export const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE } =
	process.env;

export const { RPC } = process.env;
export const { NEYNAR_TOKEN, NEYNAR_SIGNER_UUID } = process.env;
export const {
	FARCASTER_FID,
	FARCASTER_MNEMONIC,
	FARCASTER_KEY_REGISTRY_ADDRESS,
	FARCASTER_WHITELISTED_FIDS,
} = process.env;

export const { ANONCAST_API_URL } = process.env;
