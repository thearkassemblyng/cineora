import { randomUUID } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignUploadRequest } from '@cineora/contracts';

@Injectable()
export class StorageService {
  private createClient(): { client: S3Client; bucket: string } {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException(
        'S3/MinIO object storage credentials are not configured on this server',
      );
    }

    const client = new S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: { accessKeyId, secretAccessKey },
    });

    return { client, bucket };
  }

  async createPresignedUpload(userId: string, input: PresignUploadRequest) {
    const { client, bucket } = this.createClient();
    const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${input.folder}/${userId}/${randomUUID()}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: input.contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    return {
      objectKey,
      uploadUrl,
      expiresInSeconds: 900,
    };
  }

  async createPresignedDownload(objectKey: string) {
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN?.trim();
    if (cloudFrontDomain) {
      return {
        objectKey,
        url: `https://${cloudFrontDomain.replace(/^https?:\/\//, '')}/${objectKey}`,
        delivery: 'cloudfront' as const,
      };
    }

    const { client, bucket } = this.createClient();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    return {
      objectKey,
      url,
      delivery: 's3-presigned' as const,
      expiresInSeconds: 3600,
    };
  }
}
