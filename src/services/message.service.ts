import {
	FARCASTER_FID,
	FARCASTER_MNEMONIC,
	NEYNAR_SIGNER_UUID,
	NEYNAR_TOKEN,
} from "@/config";
import type { CreateMessageDto } from "@/dtos/messages.dto";
import { HttpException } from "@/exceptions/HttpException";
import type { Message } from "@/interfaces/messages.interface";
import { MessageModel } from "@/models/messages.model";
import { MESSAGE_VERSION } from "@/utils/constants";
import { type MessageInputs, extractInputs } from "@/utils/noir";
import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import { Service } from "typedi";
import { v4 as uuidv4 } from "uuid";

import circuit from "@/circuit/main.json";
import type { Tree } from "@/interfaces/tree.interface";
import {
	ANON_ADDRESS,
	generateProofForCreate,
	getSignature,
	submitProof,
} from "@/utils/anoncast";
import { logger } from "@/utils/logger";
import axios from "axios";
import moment from "moment";
import { type HDAccount, hashMessage } from "viem";
import { mnemonicToAccount } from "viem/accounts";

interface Cast {
	hash: string;
	author: {
		fid: number;
	};
}

@Service()
export class MessageService {
	private account: HDAccount;

	constructor() {
		this.account = mnemonicToAccount(FARCASTER_MNEMONIC);
	}
	private async cast(text: string, replyTo: string, channel?: string) {
		const params = {
			text,
			signer_uuid: NEYNAR_SIGNER_UUID,
			...(!replyTo ? {} : { parent: replyTo }),
			...(!channel ? {} : { channel_id: channel }),
		};

		const { data } = await axios.post(
			"https://api.neynar.com/v2/farcaster/cast",
			params,
			{
				headers: {
					api_key: NEYNAR_TOKEN,
				},
			},
		);

		return data.cast.hash;
	}

	public async getCast(
		type: "url" | "hash",
		identifier: string,
	): Promise<Cast> {
		const {
			data: { cast },
		} = await axios.get("https://api.neynar.com/v2/farcaster/cast", {
			params: {
				type,
				identifier,
			},
			headers: {
				api_key: NEYNAR_TOKEN,
			},
		});

		return cast;
	}

	public async verifyMessage(
		messageData: CreateMessageDto,
		state: Tree,
	): Promise<any> {
		const inputs = extractInputs(messageData.publicInputs);

		logger.info(`New cast: ${JSON.stringify(inputs)}`);

		// Check reply cast is part of the feed (cant reply to external accounts)
		if (inputs.replyTo !== null) {
			const cast = await this.getCast("hash", inputs.replyTo);
		}

		// Validate root
		if (!state.legacy_roots.includes(inputs.root)) {
			throw new HttpException(409, `Root is not valid`);
		}

		// Validate timestamp is not older than 10 minutes
		if (inputs.timestamp + 10 * 60 < Math.floor(Date.now() / 1000)) {
			throw new HttpException(409, `Proof is too old`);
		}

		// Check message does not exists yet
		const findMessage: Message = await MessageModel.query()
			.select()
			.from("messages")
			.where("text", "=", inputs.text)
			.first();

		if (findMessage)
			throw new HttpException(409, `This message already exists`);

		// Verify proof
		// @ts-ignore
		const backend = new BarretenbergBackend(circuit);
		// @ts-ignore
		const noir = new Noir(circuit, backend);

		await backend.instantiate();
		await backend["api"].acirInitProvingKey(
			backend["acirComposer"],
			backend["acirUncompressedBytecode"],
		);

		// @ts-ignore
		const verification = await noir.verifyFinalProof({
			// @ts-ignore
			publicInputs: messageData.publicInputs,
			// @ts-ignore
			proof: messageData.proof,
		});

		if (!verification) throw new HttpException(409, `Proof is not valid`);

		return inputs;
	}

	public async createMessage(
		inputs: MessageInputs,
		messageData: CreateMessageDto,
	): Promise<Message> {
		console.log("casting message");
		// Cast message
		const farcaster_hash = await this.cast(
			inputs.text,
			inputs.replyTo,
			messageData.channel,
		);

		const createMessageData: Message = await MessageModel.query()
			.insert({
				id: uuidv4(),
				timestamp: new Date(inputs.timestamp * 1000).toISOString(),
				text: inputs.text,
				version: MESSAGE_VERSION,
				proof: {
					proof: messageData.proof,
					publicInputs: messageData.publicInputs,
				},
				reply_to: inputs.replyTo,
				farcaster_hash,
			})
			.into("messages");

		return createMessageData;
	}

	public async createAnoncastMessage(
		inputs: MessageInputs,
		messageData: CreateMessageDto,
	): Promise<Message> {
		// https://github.com/Slokh/anoncast/blob/main/apps/next/components/create-post/context.tsx#L76
		const timestamp = Math.floor(Date.now() / 1000);

		// Sign message with 33bits key
		const { signature, message } = await getSignature({
			account: this.account,
			timestamp,
		});

		// Generate a proof with the signed message
		const proof = await generateProofForCreate({
			address: this.account.address,
			text: inputs.text,
			embeds: [],
			quote: null,
			channel: null,
			parent: null,
			tokenAddress: ANON_ADDRESS,
			signature,
			messageHash: hashMessage(message),
			timestamp,
		});

		const response = await submitProof({
			proof: Array.from(proof.proof),
			publicInputs: proof.publicInputs.map((p) => Array.from(p)),
		});

		const createMessageData: Message = await MessageModel.query()
			.insert({
				id: uuidv4(),
				timestamp: new Date(inputs.timestamp * 1000).toISOString(),
				text: inputs.text,
				version: MESSAGE_VERSION,
				proof: {
					proof: messageData.proof,
					publicInputs: messageData.publicInputs,
				},
				reply_to: inputs.replyTo,
				farcaster_hash: response.cast.hash,
			})
			.into("messages");

		return createMessageData;
	}

	public async findMessageById(messageId: string): Promise<Message> {
		const findMessage: Message = await MessageModel.query().findById(messageId);

		if (!findMessage) throw new HttpException(409, "Message doesn't exist");

		return findMessage;
	}

	public async findMessageByFarcasterHash(
		farcaster_hash: string,
	): Promise<Message> {
		const findMessage = await MessageModel.query()
			.select()
			.from("messages")
			.where("farcaster_hash", "like", `${farcaster_hash}%`)
			.first();

		if (!findMessage) throw new HttpException(409, "Message doesn't exist");

		return findMessage;
	}
}
