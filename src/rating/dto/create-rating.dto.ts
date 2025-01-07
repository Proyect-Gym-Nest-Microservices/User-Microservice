import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";
import { TargetType } from "../../common/enums/target-type.enum";

export class CreateRatingDto {

    @IsNumber()
    @Min(0, { message: 'Score must be at least 0' })
    @Max(5, { message: 'Score cannot be greater than 5' })
    score: number;

    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    userId: string;

    @IsNotEmpty()
    @IsNumber()
    targetId: number;

    @IsEnum(TargetType)
    targetType: TargetType;

    

}
