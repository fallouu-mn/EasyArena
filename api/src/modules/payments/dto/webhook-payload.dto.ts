import { Allow, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WebhookPayloadDto {
  // SamirPay peut envoyer l'une ou l'autre des deux conventions.
  // Au moins l'une des deux doit être présente (vérifié dans le service).
  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsOptional()
  amount?: number | string;

  @IsOptional()
  @IsString()
  currency?: string;

  @Allow()
  data?: unknown;

  @Allow()
  json?: unknown;
}
