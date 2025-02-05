import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { UserModule } from '../src/user/user.module';
import { CreateUserDto } from '../src/user/dto/create-user.dto';
import { UpdateUserDto } from '../src/user/dto/update-user.dto';
import { PrismaClient } from '@prisma/client';
import { firstValueFrom, of } from 'rxjs';
import { PaginationDto } from '../src/common/dto/pagination.dto';
import { NATS_SERVICE } from '../src/config/services.config';
import { envs } from '../src/config/envs.config';


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

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let mockClientProxy: MockClientProxy;
  let prisma: PrismaClient;

  beforeAll(async () => {
    mockClientProxy = new MockClientProxy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UserModule],
    })
      .overrideProvider(NATS_SERVICE)
      .useValue(mockClientProxy)
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: envs.DATABASE_URL_TEST
        }
      }
    });

    await app.init();
  });

  beforeEach(async () => {
    try {
      await prisma.rating.deleteMany();
      
      // Add a small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await prisma.user.deleteMany();
      jest.clearAllMocks();
    } catch (error) {
      console.error('Database cleanup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('User CRUD Operations', () => {
    it('should create, read, update and delete a user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'E2E Test User',
        email: 'e2e@test.com',
        password: 'StrongPass123!',
      };

      // Configurar el comportamiento del mock para create.user
      mockClientProxy.setHandler('create.user', async (data) => {
        const user = await prisma.user.create({
          data: {
            ...data,
            isActive: true
          }
        });
        return user;
      });

      const createdUser = await firstValueFrom(
        mockClientProxy.send('create.user', createUserDto)
      );

      expect(createdUser).toHaveProperty('id');
      expect(createdUser.email).toBe(createUserDto.email);

      // Configurar mock para find.user.by.id
      mockClientProxy.setHandler('find.user.by.id', async (data) => {
        return await prisma.user.findUnique({
          where: { id: data.id }
        });
      });

      const foundUser = await firstValueFrom(
        mockClientProxy.send('find.user.by.id', { id: createdUser.id })
      );

      expect(foundUser).toMatchObject({
        name: createUserDto.name,
        email: createUserDto.email
      });

      // Configurar mock para update.user
      const updateUserDto: UpdateUserDto = {
        name: 'Updated E2E Test User',
        age: 30,
      };

      mockClientProxy.setHandler('update.user', async (data) => {
        const updated = await prisma.user.update({
          where: { id: data.id },
          data: {
            ...data.updateUserDto,
            updatedAt: new Date()
          }
        });
        return { success: true, user: updated };
      });

      const updateResult = await firstValueFrom(
        mockClientProxy.send('update.user', {
          id: createdUser.id,
          updateUserDto
        })
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.user.name).toBe(updateUserDto.name);

      // Configurar mock para remove.user
      mockClientProxy.setHandler('remove.user', async (data) => {
        await prisma.user.update({
          where: { id: data.id },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        });
        return { success: true };
      });

      const removeResult = await firstValueFrom(
        mockClientProxy.send('remove.user', { id: createdUser.id })
      );

      expect(removeResult.success).toBe(true);

      const deletedUser = await prisma.user.findUnique({
        where: { id: createdUser.id }
      });
      expect(deletedUser.isActive).toBe(false);
    });
  });

  describe('User Listing and Pagination', () => {
    it('should list users with pagination', async () => {
      // Crear usuarios de prueba
      const usersToCreate = Array.from({ length: 5 }, (_, i) => ({
        name: `Test User ${i}`,
        email: `test${i}@test.com`,
        password: 'StrongPass123!',
        isActive: true
      }));

      usersToCreate.map(console.log)

    

      await prisma.user.createMany({
        data: usersToCreate
      });

      // Configurar mock para find.all.users
      mockClientProxy.setHandler('find.all.users', async (data: PaginationDto) => {
        const { page, limit } = data;
        const totalUsers = await prisma.user.count({ where: { isActive: true } });
        const lastPage = Math.ceil(totalUsers / limit)

        return {
          data: await prisma.user.findMany({
            where: { isActive: true },
            skip: (page - 1) * limit,
            take: limit
          }),
          meta: {
            totalUsers,
            page,
            lastPage
          }
        };
      });

      const result = await firstValueFrom(
        mockClientProxy.send('find.all.users', { page: 1, limit: 3 })
      );
      console.log(result)

      expect(result.data).toHaveLength(3);
      expect(result.meta.totalUsers).toBe(6);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate email creation', async () => {
      // Crear usuario inicial
      await prisma.user.create({
        data: {
          name: 'Original User',
          email: 'duplicate@test.com',
          password: 'StrongPass123!',
          isActive: true
        }
      });

      mockClientProxy.setHandler('create.user', async (data) => {
        const existing = await prisma.user.findUnique({
          where: {
            email: data.email,
            isActive: true
          }
        });
        if (existing) {
          throw new Error('User already exists');
        }
        return prisma.user.create({ data });
      });

      const duplicateUserDto: CreateUserDto = {
        name: 'Duplicate User',
        email: 'duplicate@test.com',
        password: 'StrongPass123!',
      };

      try {
        await firstValueFrom(mockClientProxy.send('create.user', duplicateUserDto));
        fail('Should throw duplicate email error');
      } catch (error) {
        expect(error.message).toContain('User already exists');
      }
    });

    it('should handle non-existent user', async () => {
      mockClientProxy.setHandler('find.user.by.id', async (data) => {
        const user = await prisma.user.findUnique({
          where: {
            id: data.id,
            isActive: true
          }
        });
        if (!user) {
          const error: any = new Error('User not found');
          error.status = 404;
          throw error;
        }
        return user;
      });

      try {
        await firstValueFrom(
          mockClientProxy.send('find.user.by.id', {
            id: '507f1f77bcf86cd799439011'
          })
        );
        fail('Should throw not found error');
      } catch (error) {
        expect(error.status).toBe(404);
      }
    });
  });
});