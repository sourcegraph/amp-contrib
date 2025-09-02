#!/usr/bin/env bun

// Linear Bugfix Comment Tool - Add bugfix comments to Linear issues

import { LinearClient } from '@linear/sdk';

const action = process.env.TOOLBOX_ACTION || '';

// Function to parse key-value parameters from input
function parseParams(input) {
  const params = {};
  const lines = input.split('\n');
  let currentKey = null;
  let currentValue = '';
  
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      // Save previous key-value pair
      if (currentKey) {
        params[currentKey] = currentValue.trim();
      }
      // Start new key-value pair
      currentKey = match[1].trim();
      currentValue = match[2];
    } else if (currentKey && line.trim()) {
      // Continue multi-line value
      currentValue += '\n' + line;
    }
  }
  
  // Save the last key-value pair
  if (currentKey) {
    params[currentKey] = currentValue.trim();
  }
  
  return params;
}

switch (action) {
  case 'describe':
    console.log(`name: linear_add_bugfix_comment
description: Add a bugfix comment to a Linear issue with commit and branch details linked to GitHub
issue_id: string The Linear issue ID to comment on
commit_id: string The commit ID of the bugfix
branch_name: string The branch name where the fix was applied
github_repo: string The GitHub repository in format 'owner/repo' (e.g., 'microsoft/vscode')
pr_number: string Optional pull request number to link to the PR
comment: string Optional additional comment details`);
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
        const commitId = params.commit_id;
        const branchName = params.branch_name;
        const githubRepo = params.github_repo;
        const prNumber = params.pr_number || '';
        const comment = params.comment || '';

        if (!issueId || !commitId || !branchName || !githubRepo) {
          console.error('Error: issue_id, commit_id, branch_name, and github_repo parameters required');
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

        // Build comment body with GitHub links
        const commitUrl = `https://github.com/${githubRepo}/commit/${commitId}`;
        const branchUrl = `https://github.com/${githubRepo}/tree/${branchName}`;
        const prUrl = prNumber ? `https://github.com/${githubRepo}/pull/${prNumber}` : '';
        
        const commentBody = `🐛 **Bugfix Applied**

**Commit:** [\`${commitId}\`](${commitUrl})
**Branch:** [\`${branchName}\`](${branchUrl})${prNumber ? `\n**Pull Request:** [#${prNumber}](${prUrl})` : ''}

${comment ? `**Details:** ${comment}` : ''}`;

        // Add comment to issue
        const result = await linear.createComment({
          issueId: issueId,
          body: commentBody
        });

        console.log(JSON.stringify({
          success: true,
          commentId: result.comment?.id,
          message: 'Bugfix comment added successfully'
        }, null, 2));

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
