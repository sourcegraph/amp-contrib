#!/usr/bin/env node

// Toolbox Template - Node.js with external service integration via built-in fetch

const action = process.env.TOOLBOX_ACTION || '';

switch (action) {
  case 'describe':
    console.log(`name: my_example_tool
description: A sample tool that sends text to httpbin and returns response
text: string Text to send to the service`);
    break;

  case 'execute':
    let input = '';
    
    // Read from stdin
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    
    process.stdin.on('end', async () => {
      try {
        // Extract text parameter
        const textMatch = input.match(/^text:\s*(.*)$/m);
        const text = textMatch ? textMatch[1] : '';
        
        if (!text) {
          console.error('Error: text parameter required');
          process.exit(1);
        }
        
        // Make HTTP request using built-in fetch (Node.js 18+)
        const response = await fetch('https://httpbin.org/post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Amp-Toolbox-Node/1.0'
          },
          body: JSON.stringify({
            message: text,
            timestamp: new Date().toISOString()
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`Service processed: ${result.json.message}`);
        console.log(`Echo from: ${result.origin}`);
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
