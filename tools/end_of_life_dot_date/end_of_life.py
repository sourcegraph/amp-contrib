#!/usr/bin/env python3

import sys
import os
import re
import json
import urllib.request
import urllib.parse
from datetime import datetime

action = os.environ.get('TOOLBOX_ACTION', '')

if action == 'describe':
    schema = {
        "name": "end_of_life",
        "description": "A tool that uses the endoflife.date API to check product End-of-life (EOL) and support information",
        "inputSchema": {
            "type": "object",
            "properties": {
                "product": {
                    "type": "string",
                    "description": "Product name to check for end-of-life information"
                }
            },
            "required": ["product"]
        }
    }
    print(json.dumps(schema))

elif action == 'execute':
    try:
        input_data = sys.stdin.read()
        params = json.loads(input_data)

        product = params.get('product', '')

        if not product:
            print("Error: product parameter required", file=sys.stderr)
            sys.exit(1)

        # URL encode the product parameter
        encoded_product = urllib.parse.quote(product)
        url = f'https://endoflife.date/api/{encoded_product}.json'

        # Make HTTP request to endoflife.date API
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Amp-Toolbox-Python/1.0',
                'Accept': 'application/json'
            },
            method='GET'
        )

        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                raise Exception(f"HTTP {response.status}: {response.reason}")

            result = json.loads(response.read().decode('utf-8'))
            print(json.dumps(result, indent=2))

    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)

else:
    print("Error: TOOLBOX_ACTION must be 'describe' or 'execute'", file=sys.stderr)
    sys.exit(1)
