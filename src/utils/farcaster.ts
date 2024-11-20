import { mnemonicToAccount } from "viem/accounts";

export const generate_signature = async (
	public_key: string,
	mnemonic: string,
	fid: number,
) => {
	// DO NOT CHANGE ANY VALUES IN THIS CONSTANT
	const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
		name: "Farcaster SignedKeyRequestValidator",
		version: "1",
		chainId: 10,
		verifyingContract:
			"0x00000000fc700472606ed4fa22623acf62c60553" as `0x${string}`,
	};

	// DO NOT CHANGE ANY VALUES IN THIS CONSTANT
	const SIGNED_KEY_REQUEST_TYPE = [
		{ name: "requestFid", type: "uint256" },
		{ name: "key", type: "bytes" },
		{ name: "deadline", type: "uint256" },
	];

	const account = mnemonicToAccount(mnemonic);

	// Generates an expiration date for the signature
	// e.g. 1693927665
	const deadline = Math.floor(Date.now() / 1000) + 86400; // signature is valid for 1 day from now
	// You should pass the same value generated here into the POST /signer/signed-key Neynar API

	// Generates the signature
	const signature = await account.signTypedData({
		domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
		types: {
			SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE,
		},
		primaryType: "SignedKeyRequest",
		message: {
			requestFid: BigInt(fid),
			key: public_key,
			deadline: BigInt(deadline),
		},
	});

	// Logging the deadline and signature to be used in the POST /signer/signed-key Neynar API
	return { deadline, signature };
};
