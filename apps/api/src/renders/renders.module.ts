import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { RendersController } from './renders.controller';
import { RendersService } from './renders.service';

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [RendersController],
  providers: [RendersService],
  exports: [RendersService],
})
export class RendersModule {}
