import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ArrayUnique, IsArray, IsDate, IsEnum, IsMongoId, isMongoId, IsNumber, IsOptional, IsString, Matches } from 'class-validator';
import { FitnessLevel, Gender, Goal, UserType } from "../enums/user.enum"
import { Type } from "class-transformer";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  
    @IsOptional()
    @IsDate()
    lastLogin?: Date;

    @IsEnum(UserType)
    userType?: UserType;

    @IsNumber()
    @IsOptional()
    age?: number;

    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @IsNumber()
    @IsOptional()
    weight?: number; // Peso del usuario

    @IsNumber()
    @IsOptional()
    height?: number; // Altura del usuario

    @IsEnum(FitnessLevel)
    @IsOptional()
    fitnessLevel?: FitnessLevel; // Nivel de estado físico

    @IsEnum(Goal)
    @IsOptional()
    goal?: Goal; // Objetivo del usuario (e.g. perder peso, ganar músculo)

    @IsString()
    @IsOptional()
    injury?: string; // Lesión del usuario (si tiene)

    // Referencias a otros microservicios (IDs utilizados para realizar peticiones a los microservicios de Workout, Nutrition y Training Plan)
    @IsArray()
    @IsOptional()
    @ArrayUnique()
    @IsMongoId({each:true,message: 'Invalid MongoDB ID format'})
    //@Matches(/^[0-9a-fA-F]{24}$/, { each: true, message: 'Invalid MongoDB ID format' })
    nutritionIds?: string[];

    @IsArray()
    @IsOptional()
    @ArrayUnique()
    @IsNumber({}, { each: true, message: 'Each workoutId must be a number (PostgreSQL ID)' })
    @Type(() => Number)
    workoutIds?: number[];

    @IsArray()
    @IsOptional()
    @ArrayUnique()
    @IsNumber({}, { each: true, message: 'Each trainingPlanId must be a number (PostgreSQL ID)' })
    @Type(() => Number)
    trainingPlanIds?: number[];
}
