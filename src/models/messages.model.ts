import { Model, ModelObject } from 'objection';
import { Message, MessageProof } from '@interfaces/messages.interface';


export class MessageModel extends Model implements Message {
  id: string;
  timestamp: string;
  text: string;
  version: number;

  proof: MessageProof;

  farcaster_hash: string | null;

  static tableName = 'messages'; // database table name
  static idColumn = 'id'; // id column name
}

export type MessageShape = ModelObject<MessageModel>;
