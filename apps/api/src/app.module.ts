import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CreditsModule } from './credits/credits.module';
import { GenerationsModule } from './generations/generations.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { RendersModule } from './renders/renders.module';
import { ScenesModule } from './scenes/scenes.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CreditsModule,
    ProjectsModule,
    ScenesModule,
    StorageModule,
    GenerationsModule,
    RendersModule,
  ],
})
export class AppModule {}
