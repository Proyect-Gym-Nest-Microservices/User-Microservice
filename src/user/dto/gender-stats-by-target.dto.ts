import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { TargetType } from '../../common/enums/target-type.enum';

export class GenderStatsByTargetDto {
    
  @IsEnum(TargetType, { message: 'targetType must be a valid enum value' })
  targetType: TargetType;

  @IsInt({ message: 'targetId must be an integer' })
  @IsPositive({ message: 'targetId must be a positive number' })
  targetId: number;
}
