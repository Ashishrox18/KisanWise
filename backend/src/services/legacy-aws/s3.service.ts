import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const client = new S3Client({ region: process.env.AWS_REGION });

export class S3Service {
  async uploadImage(file: Buffer, contentType: string): Promise<string> {
    const key = `images/${uuidv4()}.${contentType.split('/')[1]}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_IMAGES_BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await client.send(command);
    return key;
  }

  async uploadDocument(file: Buffer, fileName: string, contentType: string): Promise<string> {
    const key = `documents/${uuidv4()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_DOCUMENTS_BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await client.send(command);
    return key;
  }

  async getSignedUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await getSignedUrl(client, command, { expiresIn });
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
  }
}

export const s3Service = new S3Service();
