import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PresignUploadRequest, PresignUploadRequestSchema } from '@cineora/contracts';
import { JwtUserPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StorageService } from './storage.service';

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presign-upload')
  presignUpload(
    @CurrentUser() user: JwtUserPayload,
    @Body(new ZodValidationPipe(PresignUploadRequestSchema)) body: PresignUploadRequest,
  ) {
    return this.storageService.createPresignedUpload(user.sub, body);
  }

  @Get('presign-download')
  presignDownload(@Query('objectKey') objectKey: string) {
    return this.storageService.createPresignedDownload(objectKey);
  }
}
