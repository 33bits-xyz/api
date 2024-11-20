import {
	FARCASTER_FID,
	FARCASTER_KEY_REGISTRY_ADDRESS,
	FARCASTER_MNEMONIC,
	FARCASTER_WHITELISTED_FIDS,
	RPC,
} from "@/config";
import type { CreateMessageDto } from "@/dtos/messages.dto";
import type { Message } from "@/interfaces/messages.interface";
import { MessageService } from "@/services/message.service";
import { generate_signature } from "@/utils/farcaster";
import { MerkleTreeWorker } from "@/workers/tree.worker";
import type { NextFunction, Request, Response } from "express";
import { Container } from "typedi";

const fid = Number.parseInt(FARCASTER_FID);

const whitelist = JSON.parse(FARCASTER_WHITELISTED_FIDS);

export class FarcasterController {
	public message = Container.get(MessageService);
	public tree = new MerkleTreeWorker(
		RPC,
		FARCASTER_KEY_REGISTRY_ADDRESS as `0x${string}`,
		[
			...new Set([
				...Array(20_000).keys(),
				// ...Array(100).keys(),
				...whitelist,
			]),
		].map((e) => BigInt(e)),
	);

	public initialize() {
		this.tree.initialize();
	}

	public getWhitelist = (req: Request, res: Response, next: NextFunction) => {
		res.json({
			whitelist,
		});
	};

	public getTree = (req: Request, res: Response, next: NextFunction) => {
		res.json({
			...this.tree.getState(),
		});
	};

	public signPublicKey = async (
		req: Request,
		res: Response,
		next: NextFunction,
	) => {
		const { deadline, signature } = await generate_signature(
			req.body.public_key,
			FARCASTER_MNEMONIC,
			fid,
		);

		res.status(200).json({
			deadline,
			signature,
			fid,
		});
	};

	public getCastByWarpcastLink = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const cast_link = Buffer.from(req.params.id, "base64").toString();

			const cast = await this.message.getCast("url", cast_link);

			res.status(200).json({
				cast_id: cast.hash,
			});
		} catch (error) {
			next(error);
		}
	};

	public createMessage = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const messageData: CreateMessageDto = req.body;
			const inputs = await this.message.verifyMessage(
				messageData,
				this.tree.getState(),
			);

			if (messageData.anoncast) {
				let createMessageData: Message;
				for (let i = 0; i < 5; i++) {
					try {
						createMessageData = await this.message.createAnoncastMessage(
							inputs,
							messageData,
						);
						break;
					} catch (error) {
						console.error(error);

						if (i === 2) {
							throw error;
						}
					}
				}

				res.status(201).json({ ...createMessageData });
			} else {
				const createMessageData: Message = await this.message.createMessage(
					inputs,
					messageData,
				);

				res.status(201).json({ ...createMessageData });
			}
		} catch (error) {
			next(error);
		}
	};

	public getMessageById = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const messageId = req.params.id;

			const findOneMessageData: Message =
				await this.message.findMessageById(messageId);

			res.status(200).json({ ...findOneMessageData });
		} catch (error) {
			next(error);
		}
	};

	public getMessageByFarcasterHash = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const farcaster_hash = req.params.farcaster_hash;

			const findOneMessageData: Message =
				await this.message.findMessageByFarcasterHash(farcaster_hash);

			res.status(200).json({ ...findOneMessageData });
		} catch (error) {
			next(error);
		}
	};
}
