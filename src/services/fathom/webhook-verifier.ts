import crypto from 'crypto';
import { logger } from '../../utils/logger';

export function verifyWebhookSignature(
  secret: string,
  signature: string,
  rawBody: string
): boolean {
  try {
    logger.debug('Verifying webhook signature', {
      signatureLength: signature?.length || 0,
      rawBodyLength: rawBody?.length || 0,
      signaturePrefix: signature?.substring(0, 20) || 'missing',
    });

    if (!signature) {
      logger.warn('Missing signature');
      return false;
    }

    const [version, signatureBlock] = signature.split(',');
    
    if (version !== 'v1') {
      logger.warn('Invalid webhook signature version:', version);
      return false;
    }

    if (!signatureBlock) {
      logger.warn('Missing signature block after version');
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    // Fathom may send signature as single value or space-separated
    const signatures = signatureBlock.split(' ').map(s => s.trim()).filter(s => s.length > 0);
    const isValid = signatures.includes(expected);
    
    if (!isValid) {
      logger.warn('Webhook signature verification failed', {
        expected: expected.substring(0, 20) + '...',
        received: signatures.map(s => s.substring(0, 20) + '...'),
        rawBodyPreview: rawBody.substring(0, 100),
      });
    } else {
      logger.debug('Webhook signature verified successfully');
    }
    
    return isValid;
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

