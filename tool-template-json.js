#!/usr/bin/env node

// Toolbox Template with JSON Schema - External service integration with complex parameters

const action = process.env.TOOLBOX_ACTION || '';

switch (action) {
  case 'describe':
    // For complex parameters, output the tool schema as JSON
    const schema = {
      "name": "my_complex_tool",
      "description": "A tool that sends complex data to httpbin service for processing",
      "inputSchema": {
        "type": "object",
        "properties": {
          "files": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of files to process"
          },
          "options": {
            "type": "object",
            "properties": {
              "verbose": {"type": "boolean"},
              "format": {"type": "string", "enum": ["json", "yaml", "xml"]},
              "priority": {"type": "number", "minimum": 1, "maximum": 10}
            }
          }
        },
        "required": ["files"]
      }
    };
    console.log(JSON.stringify(schema));
    break;

  case 'execute':
    let input = '';
    
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    
    process.stdin.on('end', async () => {
      try {
        const params = JSON.parse(input);
        
        if (!params.files || params.files.length === 0) {
          console.error('Error: files parameter required');
          process.exit(1);
        }
        
        // Send complex data to httpbin service
        const requestData = {
          task: "file_processing",
          files: params.files,
          options: params.options || {},
          timestamp: new Date().toISOString(),
          client: "Amp-Toolbox-JSON/1.0"
        };
        
        const response = await fetch('https://httpbin.org/post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Amp-Toolbox-JSON/1.0'
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const receivedData = result.json;
        
        console.log(`Service processed ${receivedData.files.length} files:`);
        receivedData.files.forEach(file => console.log(`  - ${file}`));
        
        if (receivedData.options.verbose) {
          console.log(`Format: ${receivedData.options.format || 'default'}`);
          console.log(`Priority: ${receivedData.options.priority || 'normal'}`);
        }
        
        console.log(`Request processed by: ${result.origin}`);
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error('Error: Invalid JSON input');
        } else {
          console.error(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
    break;

  default:
    console.error("Error: TOOLBOX_ACTION must be 'describe' or 'execute'");
    process.exit(1);
}
