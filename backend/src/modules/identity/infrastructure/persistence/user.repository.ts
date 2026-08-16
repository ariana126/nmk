import { Email } from '@framework/domain';
import { PrismaEntityRepository } from '@framework/infrastructure';
import { PrismaService } from '@framework/infrastructure';
import { UserRepository } from '@identity/domain/service/user.repository';
import { User } from '@identity/domain/user.aggregate';
import { PasswordResetToken } from '@identity/domain/value/password-reset-token.vo';
import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { User as PrismaUser } from '@prisma/client';

import { UserMapper } from './user.mapper';

@Injectable()
export class PrismaUserRepository
  extends PrismaEntityRepository<User, PrismaUser>
  implements UserRepository
{
  constructor(
    private readonly prisma: PrismaService,
    eventBus: EventBus,
  ) {
    super(prisma.user, eventBus);
  }

  protected toDomain(record: PrismaUser): User {
    return UserMapper.toDomain(record);
  }

  protected toPersistence(entity: User): PrismaUser {
    return UserMapper.toPersistence(entity);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.asString() },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByPasswordResetToken(
    token: PasswordResetToken,
  ): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { passwordResetToken: token.asString() },
    });
    return record ? this.toDomain(record) : null;
  }
}
