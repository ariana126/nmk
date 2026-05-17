import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserByIdQuery } from '@identity/application/queries/get-user-by-id/get-user-by-id.query';
import { UserRepository } from '@identity/domain/service/user.repository';
import { UserReadModel } from '@identity/application/queries/get-user-by-id/user.read-model';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<
  GetUserByIdQuery,
  UserReadModel
> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: GetUserByIdQuery): Promise<UserReadModel> {
    // TODO: Introduce an interface for fetching read model, and don't use domain model and toPrimitives method.
    const user = await this.userRepository.get(query.userId);
    const { id, email, firstName, lastName } =
      user.toPrimitives() as UserReadModel;
    return new UserReadModel(id, email, firstName, lastName);
  }
}
