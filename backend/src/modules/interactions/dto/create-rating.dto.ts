import { IsUUID, IsString, IsNotEmpty, IsIn, IsInt, Min, Max, IsBoolean, IsOptional } from 'class-validator';

export class CreateRatingDto {
  @IsUUID()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['media', 'job', 'service', 'restaurant', 'event'])
  entityType: string;

  @IsString()
  @IsOptional()
  voterId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  stars?: number;

  @IsBoolean()
  @IsOptional()
  isLike?: boolean;

  @IsBoolean()
  @IsOptional()
  isDislike?: boolean;
}
