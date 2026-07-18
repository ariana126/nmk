import { Email, Identity } from '@framework/domain';
import { User } from '@identity/domain/user.aggregate';
import { User as PrismaUser } from '@prisma/client';

export class UserMapper {
  public static toDomain(prismaUser: PrismaUser): User {
    return new User(
      Identity.fromString(prismaUser.id),
      Email.fromString(prismaUser.email),
      prismaUser.password,
      prismaUser.firstName,
      prismaUser.lastName,
    );
  }

  public static toPersistence(user: User): PrismaUser {
    return user.toPrimitives() as PrismaUser;
  }
}
