import { NextFunction, Request, Response } from "express";
import { Container } from 'typedi';
import { MessageService } from "@/services/message.service";
import { CreateMessageDto } from "@/dtos/messages.dto";
import { Message } from "@/interfaces/messages.interface";
import { generate_signature } from "@/utils/farcaster";
import { FARCASTER_FID, FARCASTER_KEY_REGISTRY_ADDRESS, FARCASTER_MNEMONIC, RPC } from "@/config";
import { MerkleTreeWorker } from "@/workers/tree.worker";

const fid = parseInt(FARCASTER_FID);

export class FarcasterController {
  public message = Container.get(MessageService);
  public tree = new MerkleTreeWorker(
    RPC,
    FARCASTER_KEY_REGISTRY_ADDRESS as `0x${string}`,
    [...Array(10_000).keys()].map(e => BigInt(e)),
  );

  public initialize() {
    this.tree.initialize();
  }

  public getTree = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    res.json({
      ...this.tree.getState()
    });
  }

  public signPublicKey = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { deadline, signature } = await generate_signature(
      req.body.public_key,
      FARCASTER_MNEMONIC,
      fid
    );
  
    res.status(200).json({
      deadline,
      signature,
      fid,
    });
  }

  public createMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const messageData: CreateMessageDto = req.body;
      const createMessageData: Message = await this.message.createMessage(messageData);

      res.status(201).json({ ...createMessageData });
    } catch (error) {
      next(error);
    }
  }

  public getMessageById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const messageId = req.params.id;

      const findOneMessageData: Message = await this.message.findMessageById(messageId);

      res.status(200).json({ ...findOneMessageData });
    } catch (error) {
      next(error);
    }
  }

  public getMessageByFarcasterHash = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const farcaster_hash = req.params.farcaster_hash;

      const findOneMessageData: Message = await this.message.findMessageByFarcasterHash(farcaster_hash);

      res.status(200).json({ ...findOneMessageData });
    } catch (error) {
      next(error);
    }
  }
}