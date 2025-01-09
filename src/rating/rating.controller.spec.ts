import { Test, TestingModule } from '@nestjs/testing';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { TargetType } from '../common/enums/target-type.enum';

describe('RatingController', () => {
  let controller: RatingController;
  let service: RatingService;

  const mockRatingService = {
    createRating: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatingController],
      providers: [
        {
          provide: RatingService,
          useValue: mockRatingService,
        },
      ],
    }).compile();

    controller = module.get<RatingController>(RatingController);
    service = module.get<RatingService>(RatingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRating', () => {
    it('should create a rating successfully', async () => {
      const createRatingDto: CreateRatingDto = {
        userId: '123',
        targetId: 456,
        targetType: TargetType.EQUIPMENT,
        score: 5,
      };
      
      const expectedResult = {
        id: '789',
        ...createRatingDto,
        createdAt: new Date(),
      };

      mockRatingService.createRating.mockResolvedValue(expectedResult);

      const result = await controller.createRating(createRatingDto);

      expect(result).toEqual(expectedResult);
      expect(mockRatingService.createRating).toHaveBeenCalledWith(createRatingDto);
      expect(mockRatingService.createRating).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid rating data', async () => {
      const invalidRatingDto: CreateRatingDto = {
        userId: '123',
        targetId: 456,
        targetType: TargetType.EQUIPMENT,
        score: 6, // Invalid score > 5
      };

      mockRatingService.createRating.mockRejectedValue(new Error('Invalid rating score'));

      await expect(controller.createRating(invalidRatingDto)).rejects.toThrow('Invalid rating score');
      expect(mockRatingService.createRating).toHaveBeenCalledWith(invalidRatingDto);
    });

    it('should handle service errors', async () => {
      const createRatingDto: CreateRatingDto = {
        userId: '123',
        targetId: 456,
        targetType: TargetType.EQUIPMENT,
        score: 4,
      };

      mockRatingService.createRating.mockRejectedValue(new Error('Database error'));

      await expect(controller.createRating(createRatingDto)).rejects.toThrow('Database error');
      expect(mockRatingService.createRating).toHaveBeenCalledWith(createRatingDto);
    });
  });

  // Integration test
  describe('Rating Creation Flow', () => {
    it('should handle complete rating creation process', async () => {
      const createRatingDto: CreateRatingDto = {
        userId: '123',
        targetId: 456,
        targetType: TargetType.EQUIPMENT,
        score: 5,
      };

      const expectedRating = {
        id: '789',
        ...createRatingDto,
        createdAt: new Date(),
      };

      mockRatingService.createRating.mockResolvedValue(expectedRating);

      const createdRating = await controller.createRating(createRatingDto);

      expect(createdRating).toBeDefined();
      expect(createdRating.id).toBeDefined();
      expect(createdRating.userId).toBe(createRatingDto.userId);
      expect(createdRating.targetId).toBe(createRatingDto.targetId);
      expect(createdRating.score).toBe(createRatingDto.score);
      expect(createdRating.createdAt).toBeInstanceOf(Date);
    });
  });
});