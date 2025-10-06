#!/usr/bin/env node

const fs = require('fs');

const action = process.env.TOOLBOX_ACTION || '';

if (action === 'describe') {
  console.log(JSON.stringify({
    name: 'format_file_tree',
    description: 'Takes a JSON object representing a folder and file tree structure and outputs it as a formatted text tree visualization.',
    args: {
      tree: ['object', 'JSON object representing the file/folder structure. Use nested objects for directories and null/string values for files.']
    }
  }));
} else if (action === 'execute') {
  try {
    const args = JSON.parse(fs.readFileSync(0, 'utf-8'));
    
    if (!args.tree || typeof args.tree !== 'object') {
      throw new Error('Missing required argument: tree (must be an object)');
    }

    function formatTree(obj, prefix = '', isLast = true) {
      let output = '';
      const entries = Object.entries(obj);
      
      entries.forEach(([key, value], index) => {
        const isLastEntry = index === entries.length - 1;
        const connector = isLastEntry ? '└' : '├';
        const extension = isLastEntry ? ' ' : '│';
        
        if (value && typeof value === 'object') {
          output += `${prefix}${connector} ${key}/\n`;
          output += formatTree(value, `${prefix}${extension} `, isLastEntry);
        } else {
          output += `${prefix}${connector} ${key}\n`;
        }
      });
      
      return output;
    }

    const result = formatTree(args.tree);
    console.log(result);
    console.log(JSON.stringify({ success: true, tree: result }));
  } catch (error) {
    console.error('Failed to format file tree:', error.message);
    console.log(JSON.stringify({ success: false, error: error.message }));
  }
} else {
  console.error("Error: TOOLBOX_ACTION must be 'describe' or 'execute'");
  process.exit(1);
}
