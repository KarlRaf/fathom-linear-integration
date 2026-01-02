/**
 * Script to list Linear teams and get their IDs
 * Run with: node scripts/list-linear-teams.js
 */

require('dotenv').config();
const { LinearClient } = require('@linear/sdk');

async function listTeams() {
  const apiKey = process.env.LINEAR_API_KEY;
  
  if (!apiKey) {
    console.error('❌ LINEAR_API_KEY not found in .env file');
    process.exit(1);
  }

  const client = new LinearClient({ apiKey });

  try {
    console.log('📋 Fetching Linear teams...\n');
    
    const teams = await client.teams();
    
    if (!teams.nodes || teams.nodes.length === 0) {
      console.log('❌ No teams found');
      return;
    }

    console.log(`✅ Found ${teams.nodes.length} team(s):\n`);
    
    teams.nodes.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}`);
      console.log(`   ID: ${team.id}`);
      console.log(`   Key: ${team.key}`);
      console.log('');
    });

    console.log('\n📝 Copy the ID of the team you want to use and set it as LINEAR_TEAM_ID in Vercel');
    
  } catch (error) {
    console.error('❌ Error fetching teams:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

listTeams();

