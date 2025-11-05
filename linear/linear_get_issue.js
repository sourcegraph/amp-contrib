#!/usr/bin/env bun

// Linear Issue Retrieval Tool - Fetch issue details using Linear SDK

import { LinearClient } from '@linear/sdk';

const action = process.env.TOOLBOX_ACTION || '';

// Function to parse key-value parameters from input
function parseParams(input) {
  const params = {};
  const lines = input.split('\n');
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      params[match[1].trim()] = match[2].trim();
    }
  }
  return params;
}

switch (action) {
  case 'describe':
    console.log(`name: linear_get_issue
description: Retrieve issue details from Linear using issue ID
issue_id: string The Linear issue ID to retrieve`);
    break;

  case 'execute':
    let input = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });

    process.stdin.on('end', async () => {
      try {
        const params = parseParams(input.trim());
        const issueId = params.issue_id;
        
        if (!issueId) {
          console.error('Error: issue_id parameter required');
          process.exit(1);
        }

        // Check for Linear API key
        const apiKey = process.env.LINEAR_API_KEY;
        if (!apiKey) {
          console.error('Error: LINEAR_API_KEY environment variable required');
          process.exit(1);
        }

        // Initialize Linear client
        const linear = new LinearClient({
          apiKey: apiKey
        });

        // Fetch issue details
        const issue = await linear.issue(issueId);

        if (!issue) {
          console.error(`Error: Issue ${issueId} not found`);
          process.exit(1);
        }

        // Output issue details
        const issueData = {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          state: issue.state?.name || 'Unknown',
          priority: issue.priority || 'None',
          assignee: issue.assignee?.name || 'Unassigned',
          team: issue.team?.name || 'Unknown',
          url: issue.url,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt
        };

        console.log(JSON.stringify(issueData, null, 2));
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });
    break;

  default:
    console.error("Error: TOOLBOX_ACTION must be 'describe' or 'execute'");
    process.exit(1);
}
