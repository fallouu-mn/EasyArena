import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WebhookPayloadDto {
  @IsString() @IsNotEmpty() order_id: string;
  @IsString() @IsNotEmpty() transaction_id: string;
  @IsString() @IsNotEmpty() status: string;

  @IsOptional()
  amount?: number | string;

  @IsOptional()
  @IsString()
  currency?: string;
}
