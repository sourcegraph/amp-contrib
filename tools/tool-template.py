#!/usr/bin/env python3

import sys
import os
import re
import json
import urllib.request
import urllib.parse
from datetime import datetime

# Toolbox Template - Python with external service integration via built-in urllib

action = os.environ.get('TOOLBOX_ACTION', '')

if action == 'describe':
    print("""name: my_example_tool
description: A sample tool that sends text to httpbin and returns response
text: string Text to send to the service""")

elif action == 'execute':
    try:
        input_data = sys.stdin.read()
        
        # Extract text parameter
        text_match = re.search(r'^text:\s*(.*)$', input_data, re.MULTILINE)
        text = text_match.group(1) if text_match else ''
        
        if not text:
            print("Error: text parameter required", file=sys.stderr)
            sys.exit(1)
        
        # Prepare request data
        post_data = {
            'message': text,
            'timestamp': datetime.now().isoformat()
        }
        
        # Make HTTP request using built-in urllib
        data = json.dumps(post_data).encode('utf-8')
        req = urllib.request.Request(
            'https://httpbin.org/post',
            data=data,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Amp-Toolbox-Python/1.0'
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                raise Exception(f"HTTP {response.status}: {response.reason}")
            
            result = json.loads(response.read().decode('utf-8'))
            print(f"Service processed: {result['json']['message']}")
            print(f"Echo from: {result['origin']}")
            
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)

else:
    print("Error: TOOLBOX_ACTION must be 'describe' or 'execute'", file=sys.stderr)
    sys.exit(1)
