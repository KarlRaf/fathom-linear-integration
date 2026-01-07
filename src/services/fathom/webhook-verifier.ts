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

    // Fathom may send signature as single value or space-separated
    const signatures = signatureBlock.split(' ').map(s => s.trim()).filter(s => s.length > 0);
    const receivedSet = new Set(signatures);

    // Fathom secret is sometimes formatted as "<keyId>.<signingSecret>".
    // Different docs/tools in the wild may refer to either the full string or the signingSecret part.
    // To be robust, try all plausible key variants.
    const secretStr = String(secret || '');
    const dotParts = secretStr.includes('.') ? secretStr.split('.') : null;
    const keyCandidates = Array.from(
      new Set(
        [
          secretStr,
          dotParts?.[0],
          dotParts?.[1],
        ].filter((v): v is string => typeof v === 'string' && v.length > 0)
      )
    );

    const expectedByKey = keyCandidates.map((key) => {
      const expected = crypto
        .createHmac('sha256', key)
        .update(rawBody, 'utf8')
        .digest('base64');
      return { key, expected };
    });

    const matched = expectedByKey.find(({ expected }) => receivedSet.has(expected));
    const isValid = !!matched;
    
    if (!isValid) {
      logger.warn('Webhook signature verification failed', {
        expectedCandidates: expectedByKey.map(({ key, expected }) => ({
          keyType: key === secretStr ? 'full' : (dotParts?.[0] === key ? 'beforeDot' : (dotParts?.[1] === key ? 'afterDot' : 'other')),
          keyLength: key.length,
          expected: expected.substring(0, 20) + '...',
        })),
        received: signatures.map(s => s.substring(0, 20) + '...'),
        rawBodyPreview: rawBody.substring(0, 100),
      });
    } else {
      logger.debug('Webhook signature verified successfully', {
        matchedKeyType: matched!.key === secretStr ? 'full' : (dotParts?.[0] === matched!.key ? 'beforeDot' : (dotParts?.[1] === matched!.key ? 'afterDot' : 'other')),
      });
    }
    
    return isValid;
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

