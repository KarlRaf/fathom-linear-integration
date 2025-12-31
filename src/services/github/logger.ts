import { Octokit } from '@octokit/rest';
import { logger } from '../../utils/logger';
import { FathomWebhookPayload } from '../../types/fathom';

export class GitHubLogger {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async logTranscript(transcript: FathomWebhookPayload): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `call_transcript/${date}/${transcript.recording.id}.json`;
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

      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filename,
        message: `Add transcript: ${transcript.recording.title}`,
        content: contentBase64,
        sha,
      });

      logger.info(`Transcript logged to GitHub: ${filename}`);
    } catch (error) {
      // Log error but don't throw - GitHub logging is non-critical
      logger.error('Failed to log transcript to GitHub:', error);
    }
  }
}

