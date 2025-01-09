import { Test, TestingModule } from '@nestjs/testing';
import { RatingService } from './rating.service';
import { ClientProxy } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';
import { CreateRatingDto } from './dto/create-rating.dto';
import { PrismaClient } from '@prisma/client';
import { NATS_SERVICE } from '../config/services.config';
import { of, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { TargetType } from '../common/enums/target-type.enum';

const prismaServiceMock = {
    rating: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
    },
    $connect: jest.fn(),
    $transaction: jest.fn(),
};

const clientProxyMock = {
    send: jest.fn(),
};

describe('RatingService', () => {
    let service: RatingService;
    let clientProxy: ClientProxy;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RatingService,
                {
                    provide: NATS_SERVICE,
                    useValue: clientProxyMock,
                },
            ],
        }).compile();

        service = module.get<RatingService>(RatingService);
        clientProxy = module.get<ClientProxy>(NATS_SERVICE);

        Object.assign(service, prismaServiceMock);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createRating', () => {
        const createRatingDto: CreateRatingDto = {
            score: 5,
            userId: '507f1f77bcf86cd799439011',
            targetId: 1,
            targetType: TargetType.EXERCISE,
        };

        it('should create a new rating successfully', async () => {
            const createdRating = { ...createRatingDto, id: '1' };

            // Configuración mejorada del mock de transacción
            prismaServiceMock.$transaction.mockImplementation(async (callback) => {
                // Primero configuramos los mocks necesarios
                prismaServiceMock.rating.findUnique.mockResolvedValue(null);
                prismaServiceMock.rating.create.mockResolvedValue(createdRating);
                prismaServiceMock.rating.findMany.mockResolvedValue([{ score: 5 }]);

                // Ejecutamos el callback y retornamos su resultado
                return await callback(prismaServiceMock);
            });

            // Mock del clientProxy
            clientProxyMock.send.mockReturnValue(of({ success: true }));

            // Ejecutamos y guardamos el resultado
            const result = await service.createRating(createRatingDto);

            // Verificaciones
            expect(result).toBeDefined();
            expect(result).toEqual(createdRating);
            expect(prismaServiceMock.rating.create).toHaveBeenCalledWith({
                data: createRatingDto
            });
        });

        it('should update existing rating', async () => {
            const existingRating = { id: '1', ...createRatingDto };
            const mockTransaction = jest.fn().mockImplementation(callback => callback(prismaServiceMock));
            prismaServiceMock.$transaction = mockTransaction;
            prismaServiceMock.rating.findUnique.mockResolvedValue(existingRating);
            prismaServiceMock.rating.update.mockResolvedValue({ ...existingRating, score: 5 });
            prismaServiceMock.rating.findMany.mockResolvedValue([{ score: 5 }]);
            clientProxyMock.send.mockReturnValue(of({ success: true }));

            const result = await service.createRating({ ...createRatingDto, score: 5 });

            expect(result.id).toBe(existingRating.id);
            expect(result.score).toBe(5);
        });

        it('should throw error for invalid score', async () => {
            const invalidDto = { ...createRatingDto, score: 6 };

            await expect(service.createRating(invalidDto)).rejects.toThrow(RpcException);
        });


    });

    describe('calculateAverageScore', () => {
        it('should calculate average score correctly', async () => {
            const ratings = [{ score: 4 }, { score: 5 }, { score: 3 }];
            const targetId = 1;

            const mockTransaction = jest.fn().mockImplementation(callback => callback(prismaServiceMock));
            prismaServiceMock.$transaction = mockTransaction;
            prismaServiceMock.rating.findMany.mockResolvedValue(ratings);

            const result = await service['calculateAverageScore'](ratings, targetId);

            expect(result.score).toBe(4);
            expect(result.totalRatings).toBe(3);
            expect(result.targetId).toBe(targetId);
        });

        it('should handle empty ratings', async () => {
            const targetId = 1;

            const result = await service['calculateAverageScore']([], targetId);

            expect(result.score).toBe(0);
            expect(result.totalRatings).toBe(0);
        });
    });

    describe('updateTargetScore', () => {
        const targetId = 1;
        const targetType = TargetType.EXERCISE;

        it('should update target score successfully', async () => {
            prismaServiceMock.rating.findMany.mockResolvedValue([{ score: 4 }, { score: 5 }]);
            clientProxyMock.send.mockReturnValue(of({ success: true }));

            await service['updateTargetScore'](prismaServiceMock, targetType, targetId);

            expect(clientProxyMock.send).toHaveBeenCalledWith('rate.exercise', {
                targetId,
                score: 4.5,
                totalRatings: 2
            });
        });

        it('should handle errors in target score update', async () => {
            prismaServiceMock.rating.findMany.mockResolvedValue([{ score: 4 }]);
            clientProxyMock.send.mockReturnValue(throwError(() => new Error('Update failed')));

            await expect(
                service['updateTargetScore'](prismaServiceMock, targetType, targetId)
            ).rejects.toThrow(RpcException);
        });

        it('should throw error for unsupported target type', async () => {
            await expect(
                service['updateTargetScore'](prismaServiceMock, 'INVALID' as TargetType, targetId)
            ).rejects.toThrow(RpcException);
        });
    });
});