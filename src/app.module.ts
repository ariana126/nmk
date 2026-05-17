import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule, PrismaModule } from '@framework/infrastructure';
import { IdentityModule } from '@identity/infrastructure/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL') ?? (config.get('NODE_ENV') === 'production' ? 'info' : 'debug'),
          transport:
            config.get('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              'req.body.password',
              'req.body.confirmPassword',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),
    AuthModule,
    PrismaModule,
    IdentityModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
