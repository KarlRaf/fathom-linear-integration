import crypto from 'crypto';
import { logger } from '../../utils/logger';

export function verifyWebhookSignature(
  secret: string,
  signature: string,
  rawBody: string
): boolean {
  try {
    const [version, signatureBlock] = signature.split(',');
    
    if (version !== 'v1') {
      logger.warn('Invalid webhook signature version:', version);
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    const signatures = signatureBlock.split(' ').map(s => s.trim());
    const isValid = signatures.includes(expected);
    
    if (!isValid) {
      logger.warn('Webhook signature verification failed');
    }
    
    return isValid;
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

