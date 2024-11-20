import type { Message, MessageProof } from "@interfaces/messages.interface";
import { Model, type ModelObject } from "objection";

export class MessageModel extends Model implements Message {
	id: string;
	timestamp: string;
	text: string;
	version: number;

	proof: MessageProof;

	farcaster_hash: string | null;
	reply_to: string | null;

	static tableName = "messages"; // database table name
	static idColumn = "id"; // id column name
}

export type MessageShape = ModelObject<MessageModel>;
