import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { MongoIdDto } from './dto/mongo-id.dto';
import { GenderStatsByTargetDto } from './dto/gender-stats-by-target.dto';
import { TargetType } from '../common/enums/target-type.enum';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  // Mock del UserService
  const mockUserService = {
    createUser: jest.fn(),
    findAllUser: jest.fn(),
    findUserById: jest.fn(),
    findByEmail: jest.fn(),
    updateUser: jest.fn(),
    removeUser: jest.fn(),
    getUserWorkouts: jest.fn(),
    getUserTrainingPlans: jest.fn(),
    getUserNutritions: jest.fn(),
    calculateGenderStatsByTarget: jest.fn(),
    calculateUserStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@test.com',
        password: 'StrongPass123!',
      };
      const expectedResult = { id: '1', ...createUserDto };

      mockUserService.createUser.mockResolvedValue(expectedResult);

      const result = await controller.createUser(createUserDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.createUser).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAllUser', () => {
    it('should return paginated users', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const expectedResult = {
        data: [{ id: '1', name: 'Test User' }],
        meta: { totalUsers: 1, page: 1, lastPage: 1 },
      };

      mockUserService.findAllUser.mockResolvedValue(expectedResult);

      const result = await controller.findAllUser(paginationDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.findAllUser).toHaveBeenCalledWith(paginationDto);
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      const mongoIdDto: MongoIdDto = { id: '1' };
      const expectedResult = { id: '1', name: 'Test User' };

      mockUserService.findUserById.mockResolvedValue(expectedResult);

      const result = await controller.findById(mongoIdDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.findUserById).toHaveBeenCalledWith(mongoIdDto.id);
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const email = 'test@test.com';
      const expectedResult = { id: '1', email, name: 'Test User' };

      mockUserService.findByEmail.mockResolvedValue(expectedResult);

      const result = await controller.findByEmail(email);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('updateUser', () => {
    it('should update a user', async () => {
      const payload = {
        id: '1',
        updateUserDto: {
          name: 'Updated Name',
          age: 30,
        } as UpdateUserDto,
      };
      const expectedResult = {
        success: true,
        user: { id: '1', ...payload.updateUserDto },
      };

      mockUserService.updateUser.mockResolvedValue(expectedResult);

      const result = await controller.updateUser(payload);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        payload.id,
        payload.updateUserDto,
      );
    });
  });
 
  describe('removeUser', () => {
    it('should remove a user', async () => {
      const mongoIdDto: MongoIdDto = { id: '1' };
      const expectedResult = {
        success: true,
        message: 'User removed successfully',
      };

      mockUserService.removeUser.mockResolvedValue(expectedResult);

      const result = await controller.removeUser(mongoIdDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.removeUser).toHaveBeenCalledWith(mongoIdDto.id);
    });
  });

  describe('getUserWorkouts', () => {
    it('should get user workouts', async () => {
      const mongoIdDto: MongoIdDto = { id: '1' };
      const expectedResult = [
        { id: 1, name: 'Workout 1' },
        { id: 2, name: 'Workout 2' },
      ];

      mockUserService.getUserWorkouts.mockResolvedValue(expectedResult);

      const result = await controller.getUserWorkouts(mongoIdDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.getUserWorkouts).toHaveBeenCalledWith(mongoIdDto.id);
    });
  });

  describe('getUserTrainingPlans', () => {
    it('should get user training plans', async () => {
      const mongoIdDto: MongoIdDto = { id: '1' };
      const expectedResult = [
        { id: 1, name: 'Training Plan 1' },
        { id: 2, name: 'Training Plan 2' },
      ];

      mockUserService.getUserTrainingPlans.mockResolvedValue(expectedResult);

      const result = await controller.getUserTrainingPlans(mongoIdDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.getUserTrainingPlans).toHaveBeenCalledWith(mongoIdDto.id);
    });
  });

  describe('getUserNutritions', () => {
    it('should get user nutrition plans', async () => {
      const mongoIdDto: MongoIdDto = { id: '1' };
      const expectedResult = [
        { id: 1, name: 'Nutrition Plan 1' },
        { id: 2, name: 'Nutrition Plan 2' },
      ];

      mockUserService.getUserNutritions.mockResolvedValue(expectedResult);

      const result = await controller.getUserNutritions(mongoIdDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.getUserNutritions).toHaveBeenCalledWith(mongoIdDto.id);
    });
  });

  describe('calculateGenderStatsByTarget', () => {
    it('should calculate gender stats by target', async () => {
      const genderStatsByTargetDto: GenderStatsByTargetDto = {
        targetType: TargetType.WORKOUT,
        targetId: 1,
      };
      const expectedResult = [
        {
          gender: 'MALE',
          count: 10,
          targetType: TargetType.WORKOUT,
          targetId: 1,
        },
      ];

      mockUserService.calculateGenderStatsByTarget.mockResolvedValue(expectedResult);

      const result = await controller.calculateGenderStatsByTarget(genderStatsByTargetDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.calculateGenderStatsByTarget).toHaveBeenCalledWith(
        genderStatsByTargetDto.targetType,
        genderStatsByTargetDto.targetId,
      );
    });
  });

  describe('calculateUserStatistics', () => {
    it('should calculate user statistics', async () => {
      const payload = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };
      const expectedResult = {
        totalUsers: 100,
        newUsers: 10,
        userActivity: {
          activeUsers: 50,
          inactiveUsers: 50,
        },
        ageRange: [{ age: 25 }, { age: 30 }],
        goalStats: [{ goal: 'WEIGHT_LOSS', count: 5 }],
        genderStats: [{ gender: 'MALE', count: 60 }],
      };

      mockUserService.calculateUserStatistics.mockResolvedValue(expectedResult);

      const result = await controller.calculateUserStatistics(payload);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.calculateUserStatistics).toHaveBeenCalledWith(
        payload.startDate,
        payload.endDate,
      );
    });
  });

  // Pruebas de integración para flujos completos
  describe('Integration Tests', () => {
    it('should handle complete user workflow', async () => {
      // 1. Crear usuario
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@test.com',
        password: 'StrongPass123!',
      };
      const createdUser = { id: '1', ...createUserDto };
      mockUserService.createUser.mockResolvedValue(createdUser);

      // 2. Encontrar usuario por ID
      mockUserService.findUserById.mockResolvedValue(createdUser);

      // 3. Actualizar usuario
      const updatePayload = {
        id: '1',
        updateUserDto: {
          name: 'Updated Name',
        } as UpdateUserDto,
      };
      const updatedUser = {
        success: true,
        user: { ...createdUser, ...updatePayload.updateUserDto },
      };
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      // 4. Obtener entrenamientos del usuario
      const userWorkouts = [{ id: 1, name: 'Workout 1' }];
      mockUserService.getUserWorkouts.mockResolvedValue(userWorkouts);

      // Ejecutar el flujo completo
      const user = await controller.createUser(createUserDto);
      expect(user).toEqual(createdUser);

      const foundUser = await controller.findById({ id: user.id });
      expect(foundUser).toEqual(createdUser);

      const updated = await controller.updateUser(updatePayload);
      expect(updated).toEqual(updatedUser);

      const workouts = await controller.getUserWorkouts({ id: user.id });
      expect(workouts).toEqual(userWorkouts);
    });
  });
});