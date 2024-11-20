export interface MessageProof {
	proof: number[];
	publicInputs: number[][];
}

export interface Message {
	id: string;
	timestamp: string;
	text: string;
	version: number;

	proof: MessageProof;

	farcaster_hash: string | null;
}
