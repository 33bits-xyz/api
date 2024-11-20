import { TextDecoder } from "util";

export type MessageInputs = {
	timestamp: number;
	root: `0x${string}`;
	text: string;
	replyTo: string | null;
};

export function extractInputs(data: number[][]): MessageInputs {
	const timestampBuffer = Buffer.from(data[0]);
	let timestamp = 0;
	for (let i = 0; i < timestampBuffer.length; i++) {
		timestamp = timestamp * 256 + timestampBuffer[i];
	}

	// Extract Merkle tree root
	const root = "0x" + Buffer.from(data[1]).toString("hex");

	// Extract message
	const messageArrays = data.slice(2, 2 + 16); // Extract the next 16 elements as text
	// @ts-ignore
	const messageBytes = [].concat(...messageArrays);
	const decoder = new TextDecoder("utf-8");
	const message = decoder
		.decode(Uint8Array.from(messageBytes))
		.replace(/\0/g, "");

	// Extract reply link
	const replyLinkArrays = data.slice(2 + 16, 2 + 16 + 4); // Extract the next 4 elements as reply link
	// @ts-ignore
	const replyLinkBytes = [].concat(...replyLinkArrays);
	const replyTo = decoder
		.decode(Uint8Array.from(replyLinkBytes))
		.replace(/\0/g, "");

	return {
		timestamp,
		root: root as `0x${string}`,
		text: message,
		replyTo: replyTo === "" ? null : replyTo,
	};
}
