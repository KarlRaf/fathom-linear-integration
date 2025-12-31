import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  fathom: {
    webhookSecret: process.env.FATHOM_WEBHOOK_SECRET || '',
  },
  
  github: {
    token: process.env.GITHUB_TOKEN || '',
    repoOwner: process.env.GITHUB_REPO_OWNER || '',
    repoName: process.env.GITHUB_REPO_NAME || '',
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  
  linear: {
    apiKey: process.env.LINEAR_API_KEY || '',
    teamId: process.env.LINEAR_TEAM_ID || '',
    projectId: process.env.LINEAR_PROJECT_ID,
  },
  
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    channelId: process.env.SLACK_CHANNEL_ID || '',
  },
};

// Validate required environment variables
const requiredVars = [
  { key: 'FATHOM_WEBHOOK_SECRET', value: config.fathom.webhookSecret },
  { key: 'GITHUB_TOKEN', value: config.github.token },
  { key: 'GITHUB_REPO_OWNER', value: config.github.repoOwner },
  { key: 'GITHUB_REPO_NAME', value: config.github.repoName },
  { key: 'OPENAI_API_KEY', value: config.openai.apiKey },
  { key: 'LINEAR_API_KEY', value: config.linear.apiKey },
  { key: 'LINEAR_TEAM_ID', value: config.linear.teamId },
  { key: 'SLACK_BOT_TOKEN', value: config.slack.botToken },
  { key: 'SLACK_SIGNING_SECRET', value: config.slack.signingSecret },
  { key: 'SLACK_CHANNEL_ID', value: config.slack.channelId },
];

const missingVars = requiredVars.filter(v => !v.value);

if (missingVars.length > 0 && config.nodeEnv === 'production') {
  console.error('Missing required environment variables:', missingVars.map(v => v.key).join(', '));
  process.exit(1);
}

