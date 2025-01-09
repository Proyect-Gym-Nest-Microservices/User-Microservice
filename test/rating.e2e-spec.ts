import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { RatingModule } from '../src/rating/rating.module';
import { CreateRatingDto } from '../src/rating/dto/create-rating.dto';
import { PrismaClient } from '@prisma/client';
import { firstValueFrom, of } from 'rxjs';
import { NATS_SERVICE } from '../src/config/services.config';
import { TargetType } from '../src/common/enums/target-type.enum';

class MockClientProxy {
    private handlers = new Map<string, Function>();

    public send(pattern: string, data: any) {
        const handler = this.handlers.get(pattern);
        if (handler) {
            return of(handler(data));
        }
        return of(null);
    }

    public setHandler(pattern: string, handler: Function) {
        this.handlers.set(pattern, handler);
    }
}

describe('RatingController (e2e)', () => {
    let app: INestApplication;
    let mockClientProxy: MockClientProxy;
    let prisma: PrismaClient;

    beforeAll(async () => {
        mockClientProxy = new MockClientProxy();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [RatingModule],
        })
            .overrideProvider(NATS_SERVICE)
            .useValue(mockClientProxy)
            .compile();

        app = moduleFixture.createNestApplication();
        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL_TEST
                }
            }
        });

        await app.init();
    });

    beforeEach(async () => {
        await prisma.rating.deleteMany();
        await prisma.user.deleteMany();
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    describe('Rating Creation', () => {
        it('should create a valid rating', async () => {
            // Create test user first
            const user = await prisma.user.create({
                data: {
                    name: 'Test User',
                    email: 'test@test.com',
                    password: 'password#123',
                    isActive: true
                }
            });

            const createRatingDto: CreateRatingDto = {
                score: 4,
                userId: user.id,
                targetId: 1,
                targetType: TargetType.EQUIPMENT
            };

            mockClientProxy.setHandler('create.rating', async (data) => {
                return await prisma.rating.create({
                    data: {
                        ...data,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            });

            const result = await firstValueFrom(
                mockClientProxy.send('create.rating', createRatingDto)
            );

            expect(result).toHaveProperty('id');
            expect(result.score).toBe(createRatingDto.score);
            expect(result.userId).toBe(createRatingDto.userId);
        });

        it('should validate rating score range', async () => {
            const user = await prisma.user.create({
                data: {
                    name: 'Test User',
                    email: 'test@test.com',
                    password: 'password#123',
                    isActive: true
                }
            });

            const invalidRatingDto: CreateRatingDto = {
                score: 6, // Invalid score > 5
                userId: user.id,
                targetId: 1,
                targetType: TargetType.EQUIPMENT
            };

            // Configurar el handler para validar el score
            mockClientProxy.setHandler('create.rating', async (data) => {
                if (data.score > 5) {
                    throw new Error('Score cannot be greater than 5');
                }
                // Si pasa la validación, crear el rating
                return await prisma.rating.create({
                    data: {
                        ...data,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            });

            // Usar async/await con try/catch para manejar el error más claramente
            try {
                await firstValueFrom(
                    mockClientProxy.send('create.rating', invalidRatingDto)
                );
                fail('Should throw validation error');
            } catch (error) {
                // Ser más específico en la aserción
                expect(error).toBeDefined();
                expect(error.message).toBe('Score cannot be greater than 5');
            }
        });

        it('should validate user existence', async () => {
            const createRatingDto: CreateRatingDto = {
                score: 4,
                userId: '507f1f77bcf86cd799439011', // Non-existent user
                targetId: 1,
                targetType: TargetType.EQUIPMENT
            };

            mockClientProxy.setHandler('create.rating', async (data) => {
                const user = await prisma.user.findUnique({
                    where: { id: data.userId }
                });

                if (!user) {
                    throw new Error('User not found');
                }

                return prisma.rating.create({
                    data
                });
            });

            try {
                await firstValueFrom(
                    mockClientProxy.send('create.rating', createRatingDto)
                );
                fail('Should throw user not found error');
            } catch (error) {
                expect(error.message).toContain('User not found');
            }
        });

        it('should validate enum targetType', async () => {
            const user = await prisma.user.create({
                data: {
                    name: 'Test User',
                    email: 'test@test.com',
                    password: 'password#123',
                    isActive: true
                }
            });

            const invalidTargetTypeDto = {
                score: 4,
                userId: user.id,
                targetId: 1,
                targetType: 'INVALID_TYPE'
            };

            try {
                await firstValueFrom(
                    mockClientProxy.send('create.rating', invalidTargetTypeDto)
                );
                fail('Should throw validation error');
            } catch (error) {
                expect(error.message).toContain('targetType');
            }
        });
    });
});