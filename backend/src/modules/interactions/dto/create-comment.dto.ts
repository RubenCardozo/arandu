import { IsUUID, IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['media', 'job', 'service', 'restaurant', 'event'])
  entityType: string;

  @IsString()
  @IsNotEmpty()
  authorName: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
