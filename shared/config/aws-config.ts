import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost as _createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV_VARS } from './envVars';

const s3Client = new S3Client({
  region: ENV_VARS.AWS_S3_REGION,
  credentials: {
    accessKeyId: ENV_VARS.AWS_ACCESS_KEY_ID,
    secretAccessKey: ENV_VARS.AWS_SECRET_ACCESS_KEY,
  },
});

export { s3Client };

/**
 * Generate a presigned URL for getObject or putObject operations.
 */
export const getPresignedUrl = async (
  operation: 'getObject' | 'putObject',
  params: any,
  expiresIn: number = 3600,
): Promise<string> => {
  let command;
  if (operation === 'putObject') {
    command = new PutObjectCommand(params);
  } else {
    command = new GetObjectCommand(params);
  }
  return await getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Generate presigned POST data for file uploads.
 */
export const getPresignedPost = async (params: any): Promise<any> => {
  return await _createPresignedPost(s3Client, params);
};

/**
 * Delete an object from S3.
 */
export const deleteS3Object = async (params: any): Promise<any> => {
  const command = new DeleteObjectCommand(params);
  return await s3Client.send(command);
}; 