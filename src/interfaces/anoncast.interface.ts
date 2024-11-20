export interface AnonCastTreeElement {
	address: string;
	balance: string;
	path: string[];
}

export interface AnonCastTree {
	elements: AnonCastTreeElement[];
	root: string;
}

export type AnonCastCreatePostProofInput = {
	address: string;
	balance: string;
	note_root: string;
	index: number;
	note_hash_path: string[];
	timestamp: number;
	text: string[];
	embed_1: string[];
	embed_2: string[];
	quote: string;
	channel: string;
	parent: string;
	token_address: string;
	signature: string[];
	message_hash: string[];
	pub_key_x: string[];
	pub_key_y: string[];
};

export interface AnonCastCreatePostInput {
	timestamp: number;
	text: string | null;
	embeds: string[];
	quote: string | null;
	channel: string | null;
	parent: string | null;
	address: string;
	tokenAddress: string;
	signature: string;
	messageHash: string;
}
