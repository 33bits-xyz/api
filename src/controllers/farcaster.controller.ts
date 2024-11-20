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
import { v4 as uuidv4 } from 'uuid';

const fid = Number.parseInt(FARCASTER_FID);

const whitelist = JSON.parse(FARCASTER_WHITELISTED_FIDS);

export class FarcasterController {
  private messageCreationTasks: Record<string, {
    timestamp: number;
    id: string;
    message: Message | null;
    status: "pending" | "success" | "error";
  }> = {};

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

    // Remove the tasks older than 3 hours
    // Run every 10 minutes
    setInterval(() => {
      this.messageCreationTasks = Object.fromEntries(
        Object.entries(this.messageCreationTasks).filter(([_, task]) => task.timestamp + 3 * 60 * 60 * 1000 > Date.now()),
      );
    }, 10 * 60 * 1000);
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

      // Start the task bellow in the background
      // Assign random id to the task
      // Return the id to the user
      const taskId = uuidv4();

      this.messageCreationTasks[taskId] = {
        timestamp: Date.now(),
        id: taskId,
        message: null,
        status: "pending",
      };

      res.status(200).json({ taskId });

      const executeTask = async () => {
        if (messageData.anoncast) {
          for (let i = 0; i < 5; i++) {
            try {
              const createMessageData = await this.message.createAnoncastMessage(
                inputs,
                messageData,
              );
              
              return createMessageData;
            } catch (error) {
              console.error(error);

              if (i === 2) {
                throw error;
              }
            }
          }
        } else {
          return this.message.createMessage(
            inputs,
            messageData,
          );
        }
      }

      executeTask()
        .then((message: Message) => {
          this.messageCreationTasks[taskId].status = "success";
          this.messageCreationTasks[taskId].message = message;
        })
        .catch((error) => {
          this.messageCreationTasks[taskId].status = "error";

          console.log(taskId);
          console.error(error);
        });
		} catch (error) {
			next(error);
		}
	};

  public getMessageCreationTask = (
		req: Request,
		res: Response,
		next: NextFunction,
  ) => {
    const taskId = req.params.id;

    const task = this.messageCreationTasks[taskId];

    res.status(200).json(task || null);
  }

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
