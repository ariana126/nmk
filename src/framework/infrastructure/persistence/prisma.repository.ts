import {
  AggregateRoot,
  EntityNotFound,
  EntityRepository,
  Identity,
} from '@framework/domain';
import { EventBus, IEvent } from '@nestjs/cqrs';

export interface ModelDelegate<PModel> {
  findUnique(args: { where: { id: string } }): Promise<PModel | null>;
  upsert(args: {
    where: { id: string };
    create: PModel;
    update: Omit<PModel, 'id'>;
  }): Promise<PModel>;
}

export abstract class PrismaEntityRepository<
  T extends AggregateRoot,
  PModel extends { id: string },
> extends EntityRepository<T> {
  constructor(
    protected readonly delegate: ModelDelegate<PModel>,
    private readonly eventBus: EventBus,
  ) {
    super();
  }

  protected abstract toDomain(record: PModel): T;
  protected abstract toPersistence(entity: T): PModel;

  async find(id: Identity): Promise<T | null> {
    const record = await this.delegate.findUnique({
      where: { id: id.asString() },
    });
    return record ? this.toDomain(record) : null;
  }

  async get(id: Identity): Promise<T> {
    const entity = await this.find(id);
    if (!entity) throw EntityNotFound.withId(id);
    return entity;
  }

  async save(entity: T): Promise<void> {
    const data = this.toPersistence(entity);
    const { id, ...updateData } = data;
    await this.delegate.upsert({
      where: { id },
      create: data,
      update: updateData,
    });
    this.eventBus.publishAll(entity.releaseEvents() as IEvent[]);
  }
}
