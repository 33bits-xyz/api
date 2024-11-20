import { url, cleanEnv, num, port, str } from "envalid";

export const ValidateEnv = () => {
	cleanEnv(process.env, {
		NODE_ENV: str(),
		PORT: port(),

		RPC: url(),

		FARCASTER_KEY_REGISTRY_ADDRESS: str(),
		FARCASTER_MNEMONIC: str(),
		FARCASTER_FID: num(),
		FARCASTER_WHITELISTED_FIDS: str({ default: "[]" }),

		NEYNAR_TOKEN: str(),
		NEYNAR_SIGNER_UUID: str(),

		ANONCAST_API_URL: url(),
	});
};
