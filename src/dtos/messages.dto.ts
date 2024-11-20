import { IsNotEmpty } from "class-validator";

export class CreateMessageDto {
  @IsNotEmpty()
  public proof: number[];

  @IsNotEmpty()
  public publicInputs: number[][];

  public channel: string;
}