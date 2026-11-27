import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreditsModule } from '../credits/credits.module';
import { ProjectsModule } from '../projects/projects.module';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';
import { OrchestratorClient } from './orchestrator.client';

@Module({
  imports: [AuthModule, ProjectsModule, CreditsModule],
  controllers: [GenerationsController],
  providers: [GenerationsService, OrchestratorClient],
  exports: [GenerationsService, OrchestratorClient],
})
export class GenerationsModule {}
