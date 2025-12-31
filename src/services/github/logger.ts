import { Octokit } from '@octokit/rest';
import { logger } from '../../utils/logger';
import { FathomWebhookPayload, CalendarInvitee } from '../../types/fathom';

export class GitHubLogger {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    // Validate token is not empty or placeholder
    if (!token || token.includes('your_personal_access_token') || token === 'ghp_your_personal_access_token') {
      const error = new Error('GitHub token is not configured. Please set GITHUB_TOKEN in your .env file with a valid GitHub Personal Access Token (classic or fine-grained).');
      logger.error(error.message);
      throw error;
    }
    
    // Validate token format (should start with ghp_ for classic or github_pat_ for fine-grained)
    const isValidFormat = token.startsWith('ghp_') || token.startsWith('github_pat_');
    if (!isValidFormat) {
      logger.warn(`GitHub token format appears invalid. Expected to start with 'ghp_' (classic) or 'github_pat_' (fine-grained).`);
    }
    
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Extract the primary domain from calendar_invitees, excluding gmail.com
   * Returns the most common domain, or null if no valid domains found
   */
  private extractPrimaryDomain(calendarInvitees?: Array<CalendarInvitee>): string | null {
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

  async logTranscript(transcript: FathomWebhookPayload): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];
      
      // Extract primary domain (excluding gmail.com)
      const domain = this.extractPrimaryDomain(transcript.calendar_invitees);
      
      // Build file path: use domain folder if available, otherwise fallback to current structure
      const filename = domain
        ? `call_transcript/${domain}/${date}/${transcript.recording.id}.json`
        : `call_transcript/${date}/${transcript.recording.id}.json`;
      
      const content = JSON.stringify(transcript, null, 2);
      const contentBase64 = Buffer.from(content).toString('base64');

      // Try to get the file first to check if it exists
      let sha: string | undefined;
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: filename,
        });
        if (Array.isArray(data)) {
          throw new Error('Path is a directory');
        }
        sha = data.sha;
      } catch (error: any) {
        // File doesn't exist yet, that's fine
        if (error.status !== 404) {
          throw error;
        }
      }

      const result = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filename,
        message: `Add transcript: ${transcript.recording.title}`,
        content: contentBase64,
        sha,
      });

      logger.info(`Transcript logged to GitHub: ${filename}`, { commitSha: result.data.commit.sha });
    } catch (error: any) {
      // Log detailed error information
      const errorDetails = {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        response: error?.response?.data,
      };
      logger.error('Failed to log transcript to GitHub:', errorDetails);
      // Don't throw - GitHub logging is non-critical for the main flow
    }
  }
}

