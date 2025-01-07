
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { ClientProxy } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaClient } from '@prisma/client';
import { NATS_SERVICE } from '../config/services.config';
import { of, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

// Mock de Prisma
const prismaServiceMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
  $connect: jest.fn(),
};

// Mock del Cliente NATS
const clientProxyMock = {
  send: jest.fn(),
};

describe('UserService', () => {
  let service: UserService;
  let clientProxy: ClientProxy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: NATS_SERVICE,
          useValue: clientProxyMock,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    clientProxy = module.get<ClientProxy>(NATS_SERVICE);

    // Reemplazar las instancias de Prisma con nuestro mock
    Object.assign(service, prismaServiceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@test.com',
      password: 'StrongPass123!',
    };

    it('should create a new user successfully', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);
      prismaServiceMock.user.create.mockResolvedValue({ ...createUserDto, id: '1' });

      const result = await service.createUser(createUserDto);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(createUserDto.email);
      expect(prismaServiceMock.user.create).toHaveBeenCalledWith({
        data: createUserDto,
      });
    });

    it('should throw an error if user already exists', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({ id: '1', ...createUserDto });

      await expect(service.createUser(createUserDto)).rejects.toThrow(RpcException);
    });
  });

  describe('findAllUser', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated users', async () => {
      const users = [{ id: '1', name: 'Test User' }];
      const totalUsers = 1;

      prismaServiceMock.user.findMany.mockResolvedValue(users);
      prismaServiceMock.user.count.mockResolvedValue(totalUsers);

      const result = await service.findAllUser(paginationDto);

      expect(result.data).toEqual(users);
      expect(result.meta.totalUsers).toBe(totalUsers);
      expect(result.meta.page).toBe(paginationDto.page);
    });
  });

  describe('findUserById', () => {
    const userId = '1';

    it('should return a user if found', async () => {
      const user = { id: userId, name: 'Test User' };
      prismaServiceMock.user.findUnique.mockResolvedValue(user);

      const result = await service.findUserById(userId);

      expect(result).toEqual(user);
    });

    it('should throw an error if user not found', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findUserById(userId)).rejects.toThrow(RpcException);
    });
  });

  describe('updateUser', () => {
    const userId = '1';
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
      age: 25,
    };

    it('should update user successfully', async () => {
      const updatedUser = { id: userId, ...updateUserDto };
      prismaServiceMock.user.findUnique.mockResolvedValue({ id: userId });
      prismaServiceMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(userId, updateUserDto);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(updatedUser);
    });

    it('should validate training plan IDs if provided', async () => {
      const dtoWithPlans = { ...updateUserDto, trainingPlanIds: [1, 2] };
      prismaServiceMock.user.findUnique.mockResolvedValue({ id: userId });
      prismaServiceMock.user.update.mockResolvedValue({ id: userId, ...dtoWithPlans });
      clientProxyMock.send.mockReturnValue(of([{ id: 1 }, { id: 2 }]));

      const result = await service.updateUser(userId, dtoWithPlans);

      expect(result.success).toBe(true);
      expect(clientProxyMock.send).toHaveBeenCalledWith('find.training.plan.by.ids', { ids: [1, 2] });
    });
  });

  describe('removeUser', () => {
    const userId = '1';

    it('should deactivate user successfully', async () => {
      prismaServiceMock.user.update.mockResolvedValue({ id: userId, isActive: false });

      const result = await service.removeUser(userId);

      expect(result.success).toBe(true);
      expect(result.message).toContain(userId);
    });

    it('should throw an error if user not found', async () => {
      prismaServiceMock.user.update.mockResolvedValue(null);

      await expect(service.removeUser(userId)).rejects.toThrow(RpcException);
    });
  });

  describe('getUserWorkouts', () => {
    const userId = '1';
    const workoutIds = [1, 2];

    it('should return user workouts', async () => {
      const workouts = [{ id: 1 }, { id: 2 }];
      prismaServiceMock.user.findUnique.mockResolvedValue({ workoutIds });
      clientProxyMock.send.mockReturnValue(of(workouts));

      const result = await service.getUserWorkouts(userId);

      expect(result).toEqual(workouts);
      expect(clientProxyMock.send).toHaveBeenCalledWith('find.workout.by.ids', { ids: workoutIds });
    });
  });

  describe('calculateUserStatistics', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    it('should return user statistics', async () => {
      prismaServiceMock.user.count.mockResolvedValueOnce(100); // totalUsers
      prismaServiceMock.user.count.mockResolvedValueOnce(10);  // newUsers
      prismaServiceMock.user.count.mockResolvedValueOnce(50);  // activeUsers
      prismaServiceMock.user.findMany.mockResolvedValue([{ age: 25 }, { age: 30 }]);
      prismaServiceMock.user.groupBy.mockResolvedValueOnce([
        { goal: 'WEIGHT_LOSS', _count: { goal: 5 } }
      ]);
      prismaServiceMock.user.groupBy.mockResolvedValueOnce([
        { gender: 'MALE', _count: { gender: 60 } }
      ]);

      const result = await service.calculateUserStatistics(startDate, endDate);

      expect(result).toHaveProperty('totalUsers', 100);
      expect(result).toHaveProperty('newUsers', 10);
      expect(result.userActivity).toHaveProperty('activeUsers', 50);
      expect(result.goalStats).toHaveLength(1);
      expect(result.genderStats).toHaveLength(1);
    });
  });

  // Tests de integración
  describe('Integration Tests', () => {
    describe('User Workflow', () => {
      it('should handle complete user lifecycle', async () => {
        // 1. Crear usuario
        const createUserDto: CreateUserDto = {
          name: 'Integration Test User',
          email: 'integration@test.com',
          password: 'StrongPass123!',
        };

        prismaServiceMock.user.findUnique.mockResolvedValue(null);
        prismaServiceMock.user.create.mockResolvedValue({ ...createUserDto, id: '1' });

        const createdUser = await service.createUser(createUserDto);
        expect(createdUser).toHaveProperty('id');

        // 2. Actualizar usuario
        const updateUserDto: UpdateUserDto = {
          name: 'Updated Integration User',
          age: 30,
          trainingPlanIds: [1],
        };

        prismaServiceMock.user.findUnique.mockResolvedValue({ id: '1' });
        clientProxyMock.send.mockReturnValue(of([{ id: 1 }]));
        prismaServiceMock.user.update.mockResolvedValue({ ...createdUser, ...updateUserDto });

        const updatedUser = await service.updateUser(createdUser.id, updateUserDto);
        expect(updatedUser.success).toBe(true);
        expect(updatedUser.user.name).toBe(updateUserDto.name);

        // 3. Obtener planes de entrenamiento
        const trainingPlans = [{ id: 1, name: 'Test Plan' }];
        prismaServiceMock.user.findUnique.mockResolvedValue({ trainingPlanIds: [1] });
        clientProxyMock.send.mockReturnValue(of(trainingPlans));

        const userTrainingPlans = await service.getUserTrainingPlans(createdUser.id);
        expect(userTrainingPlans).toEqual(trainingPlans);

        // 4. Desactivar usuario
        prismaServiceMock.user.update.mockResolvedValue({ ...updatedUser.user, isActive: false });
        
        const removedUser = await service.removeUser(createdUser.id);
        expect(removedUser.success).toBe(true);
      });

      it('should handle error scenarios in workflow', async () => {
        // Test de error en creación de usuario duplicado
        const duplicateUserDto: CreateUserDto = {
          name: 'Duplicate User',
          email: 'duplicate@test.com',
          password: 'StrongPass123!',
        };

        prismaServiceMock.user.findUnique.mockResolvedValue({ id: '2', ...duplicateUserDto });
        
        await expect(service.createUser(duplicateUserDto)).rejects.toThrow(RpcException);

        // Test de error en actualización con plan de entrenamiento inválido
        const invalidUpdateDto: UpdateUserDto = {
          trainingPlanIds: [999], // ID inválido
        };

        prismaServiceMock.user.findUnique.mockResolvedValue({ id: '2' });
        clientProxyMock.send.mockReturnValue(throwError(() => new Error('Training plan not found')));

        await expect(service.updateUser('2', invalidUpdateDto)).rejects.toThrow(RpcException);
      });
    });
  });
});