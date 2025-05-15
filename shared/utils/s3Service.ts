import { Readable } from 'stream';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  s3Client,
  getPresignedUrl as getS3PresignedUrl,
  getPresignedPost,
  deleteS3Object as s3DeleteObject,
} from '../config/aws-config';
import { ENV_VARS } from '../config/envVars';

import logger from './logger';

const BUCKET_NAME = ENV_VARS.AWS_S3_BUCKET_NAME;

/**
 * Gets a readable stream for an S3 object.
 * @param key - The key of the S3 object.
 * @returns A readable stream of the object body.
 */
export const getFileStream = async (key: string): Promise<Readable> => {
  if (!BUCKET_NAME) {
    logger.error(
      'S3 Bucket Name (AWS_S3_BUCKET_NAME) is not configured in environment variables.',
    );
    throw new Error('S3 bucket name not configured.');
  }

  const params = { Bucket: BUCKET_NAME, Key: key };

  try {
    logger.info(`Attempting to get S3 stream for key: ${key} in bucket: ${BUCKET_NAME}`);
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    const stream = response.Body;

    if (stream instanceof Readable) {
      stream.on('error', (err) => {
        logger.error(`S3 stream error for key ${key}:`, err);
      });
      return stream;
    }

    throw new Error('Response body is not a readable stream');
  } catch (error: any) {
    logger.error(`Failed to get S3 object stream for key ${key}:`, error);
    throw new Error(`Failed to retrieve file from S3: ${error.message}`);
  }
};

/**
 * Creates a presigned POST URL for uploading to S3.
 * @param key - The key to use for the uploaded file.
 * @param options - Additional options for presigned post.
 * @returns Presigned POST data including URL and fields.
 */
export const createPresignedPost = async (
  key: string,
  options: { expires?: number; conditions?: any[]; contentType?: string } = {},
): Promise<any> => {
  if (!BUCKET_NAME) {
    logger.error('S3 Bucket Name is not configured.');
    throw new Error('S3 bucket name not configured.');
  }

  const params: any = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: options.expires || 3600,
    Conditions: options.conditions || [],
  };

  if (options.contentType) params.ContentType = options.contentType;

  try {
    logger.info(`Creating presigned POST for key: ${key}`);
    return await getPresignedPost(params);
  } catch (error: any) {
    logger.error(`Failed to create presigned POST for key ${key}:`, error);
    throw new Error(`Failed to create presigned POST: ${error.message}`);
  }
};

/**
 * Gets a presigned URL for an S3 object.
 * @param key - The key of the S3 object.
 * @param operation - The S3 operation ('getObject', 'putObject', etc.).
 * @param expiresIn - Expiration time in seconds.
 * @returns Presigned URL.
 */
export const getPresignedUrl = async (
  key: string,
  operation: 'getObject' | 'putObject' = 'getObject',
  expiresIn: number = 3600,
): Promise<string> => {
  if (!BUCKET_NAME) {
    logger.error('S3 Bucket Name is not configured.');
    throw new Error('S3 bucket name not configured.');
  }

  const params = { Bucket: BUCKET_NAME, Key: key };

  try {
    logger.info(`Getting presigned URL for operation ${operation} on key: ${key}`);
    return await getS3PresignedUrl(operation, params, expiresIn);
  } catch (error: any) {
    logger.error(`Failed to get presigned URL for key ${key}:`, error);
    throw new Error(`Failed to get presigned URL: ${error.message}`);
  }
};

/**
 * Deletes an object from S3.
 * @param key - The key of the S3 object to delete.
 * @returns S3 delete result.
 */
export const deleteS3Object = async (key: string): Promise<any> => {
  if (!BUCKET_NAME) {
    logger.error('S3 Bucket Name is not configured.');
    throw new Error('S3 bucket name not configured.');
  }

  const params = { Bucket: BUCKET_NAME, Key: key };

  try {
    logger.info(`Deleting S3 object with key: ${key}`);
    return await s3DeleteObject(params);
  } catch (error: any) {
    logger.error(`Failed to delete S3 object with key ${key}:`, error);
    throw new Error(`Failed to delete S3 object: ${error.message}`);
  }
}; 