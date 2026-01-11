import { CalendarInvitee } from '../types/fathom';

/**
 * Extract the primary domain from calendar_invitees, excluding gmail.com
 * Returns the most common domain, or null if no valid domains found
 * This is the same logic used in GitHubLogger for consistency
 */
export function extractPrimaryDomain(calendarInvitees?: Array<CalendarInvitee>): string | null {
  if (!calendarInvitees || calendarInvitees.length === 0) {
    return null;
  }

  // Extract domains, excluding gmail.com
  const domains = calendarInvitees
    .map(invitee => {
      // Prefer email_domain field, fallback to extracting from email
      let domain = invitee.email_domain;
      if (!domain && invitee.email) {
        const emailParts = invitee.email.split('@');
        if (emailParts.length === 2) {
          domain = emailParts[1].toLowerCase().trim();
        }
      }
      return domain ? domain.toLowerCase().trim() : null;
    })
    .filter((domain): domain is string => {
      // Filter out null, undefined, empty strings, and gmail.com
      return !!domain && domain !== 'gmail.com';
    });

  if (domains.length === 0) {
    return null;
  }

  // Count domain occurrences
  const domainCounts = new Map<string, number>();
  domains.forEach(domain => {
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
  });

  // Find the most common domain
  let maxCount = 0;
  let primaryDomain: string | null = null;
  domainCounts.forEach((count, domain) => {
    if (count > maxCount) {
      maxCount = count;
      primaryDomain = domain;
    }
  });

  return primaryDomain;
}
