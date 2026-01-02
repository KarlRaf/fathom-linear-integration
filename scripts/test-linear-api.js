/**
 * Script to test Linear API connection
 * Run with: node scripts/test-linear-api.js
 */

require('dotenv').config();
const { LinearClient } = require('@linear/sdk');

async function testLinearAPI() {
  const apiKey = process.env.LINEAR_API_KEY;
  const teamId = process.env.LINEAR_TEAM_ID;
  
  if (!apiKey) {
    console.error('❌ LINEAR_API_KEY not found in .env file');
    process.exit(1);
  }

  if (!teamId) {
    console.error('❌ LINEAR_TEAM_ID not found in .env file');
    process.exit(1);
  }

  console.log('🔑 Testing Linear API connection...\n');
  console.log(`Team ID: ${teamId}\n`);

  const client = new LinearClient({ apiKey });

  try {
    // Test 1: Try to fetch teams
    console.log('📋 Test 1: Fetching teams...');
    const teams = await client.teams();
    console.log(`✅ Success! Found ${teams.nodes.length} team(s)\n`);
    
    // Test 2: Try to create a test issue
    console.log('📝 Test 2: Creating a test issue...');
    const testIssueInput = {
      teamId: teamId,
      title: 'Test Issue from Script',
      description: 'This is a test issue to verify API connectivity',
    };
    
    console.log('Calling client.createIssue...');
    const startTime = Date.now();
    
    const issuePayload = await Promise.race([
      client.createIssue(testIssueInput),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000)
      )
    ]);
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ createIssue returned after ${elapsed}ms`);
    console.log('Issue payload:', issuePayload);
    
    console.log('Waiting for issue.payload.issue...');
    const issue = await issuePayload.issue;
    console.log(`✅ Issue created successfully!`);
    console.log(`Issue ID: ${issue.id}`);
    console.log(`Issue Title: ${issue.title}`);
    console.log(`Issue URL: ${issue.url}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    if (error.errors) {
      console.error('Errors:', error.errors);
    }
    console.error('Full error:', error);
    process.exit(1);
  }
}

testLinearAPI();

