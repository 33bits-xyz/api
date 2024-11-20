import createCircuit from "@/circuit/anoncast/main.json";
import { ANONCAST_API_URL } from "@/config";
import type {
	AnonCastCreatePostInput,
	AnonCastCreatePostProofInput,
	AnonCastTree,
} from "@/interfaces/anoncast.interface";
import type { MessageProof } from "@/interfaces/messages.interface";
import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import axios from "axios";
import { type HDAccount, recoverPublicKey } from "viem";
import { stringToHexArray } from "./string";

export const ANON_ADDRESS = "0x0db510e79909666d6dec7f5e49370838c16d950f";

export async function fetchCreateTree(
	tokenAddress: string,
): Promise<AnonCastTree> {
	const response = await axios.get(
		`${ANONCAST_API_URL}/merkle-tree/${tokenAddress.toLowerCase()}`,
	);

	return response.data;
}

export async function submitProof(proof: MessageProof) {
	const response = await axios.post(`${ANONCAST_API_URL}/post`, {
		proof: proof.proof,
		publicInputs: proof.publicInputs,
	});

	return response.data;
}

export const getSignature = async ({
	account,
	timestamp,
}: { account: HDAccount; timestamp: number }) => {
	try {
		const message = `${account.address}:${timestamp}`;
		const signature = await account.signMessage({
			message,
		});
		return { signature, message };
	} catch {
		return;
	}
};

export async function generateProofForCreate(post: AnonCastCreatePostInput) {
	// @ts-ignore
	const backend = new BarretenbergBackend(createCircuit);
	// @ts-ignore
	const noir = new Noir(createCircuit, backend);

	const tree = await fetchCreateTree(post.tokenAddress);

	const nodeIndex = tree.elements.findIndex(
		(i) => i.address === post.address.toLowerCase(),
	);
	if (nodeIndex === -1) {
		return null;
	}

	const node = tree.elements[nodeIndex];

	const pubKey = await recoverPublicKey({
		signature: post.signature as `0x${string}`,
		hash: post.messageHash as `0x${string}`,
	});

	const pubKeyX = pubKey.slice(4, 68);
	const pubKeyY = pubKey.slice(68);

	const input: AnonCastCreatePostProofInput = {
		address: post.address.toLowerCase() as string,
		balance: `0x${BigInt(node.balance).toString(16)}`,
		note_root: tree.root,
		index: nodeIndex,
		note_hash_path: node.path,
		timestamp: post.timestamp,
		text: stringToHexArray(post.text ?? "", 16),
		embed_1: stringToHexArray(post.embeds.length > 0 ? post.embeds[0] : "", 16),
		embed_2: stringToHexArray(post.embeds.length > 1 ? post.embeds[1] : "", 16),
		quote: post.quote ?? `0x${BigInt(0).toString(16)}`,
		channel: stringToHexArray(post.channel ?? "", 1)[0],
		parent: post.parent ?? `0x${BigInt(0).toString(16)}`,
		token_address: post.tokenAddress.toLowerCase(),
		signature: chunkHexString(post.signature.replace("0x", ""), 2).slice(0, 64),
		message_hash: chunkHexString(post.messageHash.replace("0x", ""), 2).slice(
			0,
			32,
		),
		pub_key_x: chunkHexString(pubKeyX.replace("0x", ""), 2).slice(0, 32),
		pub_key_y: chunkHexString(pubKeyY.replace("0x", ""), 2).slice(0, 32),
	};

	return noir.generateFinalProof(input);
}

function chunkHexString(hexString: string, chunkSize: number): string[] {
	const chunks: string[] = [];
	for (let i = 0; i < hexString.length; i += chunkSize) {
		chunks.push(`0x${hexString.slice(i, i + chunkSize)}`);
	}
	return chunks;
}
