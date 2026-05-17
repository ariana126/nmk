import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@framework/infrastructure';
import { IdentityModule } from '@identity/infrastructure/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IdentityModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
