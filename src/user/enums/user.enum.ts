export enum Role {
    USER_ROLE = 'USER_ROLE',
    ADMIN_ROLE = 'ADMIN_ROLE'
}

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER'
}

export enum FitnessLevel {
    BEGINNER = 'BEGINNER',
    INTERMEDIATE = 'INTERMEDIATE',
    ADVANCED = 'ADVANCED'
}

export enum Goal {
    LOSE_WEIGHT = 'LOSE_WEIGHT',
    GAIN_MUSCLE = 'GAIN_MUSCLE',
    IMPROVE_ENDURANCE = 'IMPROVE_ENDURANCE',
    MAINTAIN = 'MAINTAIN'
}

export enum UserType {
    STUDENT = 'STUDENT',
    PROFESSOR = 'PROFESSOR',
    ADMINISTRATION = 'ADMINISTRATION'
}


export const RoleList: Role[] = [Role.USER_ROLE, Role.ADMIN_ROLE];

export const GenderList: Gender[] = [Gender.MALE, Gender.FEMALE, Gender.OTHER];

export const FitnessLevelList: FitnessLevel[] = [FitnessLevel.BEGINNER, FitnessLevel.INTERMEDIATE, FitnessLevel.ADVANCED];

export const GoalList: Goal[] = [Goal.LOSE_WEIGHT, Goal.GAIN_MUSCLE, Goal.IMPROVE_ENDURANCE, Goal.MAINTAIN];

export const UserTypeList: UserType[] = [UserType.STUDENT, UserType.PROFESSOR, UserType.ADMINISTRATION];
