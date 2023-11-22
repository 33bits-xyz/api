import { FarcasterController } from "@/controllers/farcaster.controller";
import { Routes } from "@/interfaces/routes.interface";
import { Router } from "express";

export class FarcasterRoute implements Routes {
  public path = '/farcaster';
  public router = Router();

  public farcaster = new FarcasterController();

  constructor() {
    this.farcaster.initialize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/tree`, this.farcaster.getTree);
    this.router.post(`${this.path}/sign_public_key`, this.farcaster.signPublicKey);
    this.router.get(`${this.path}/id/:id`, this.farcaster.getMessageById);
    this.router.get(`${this.path}/farcaster_hash/:farcaster_hash`, this.farcaster.getMessageByFarcasterHash);
    this.router.post(`${this.path}/cast`, this.farcaster.createMessage);
    this.router.get(`${this.path}/whitelist`, this.farcaster.getWhitelist);
  }
}