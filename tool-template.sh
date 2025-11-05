#!/usr/bin/env bash
set -euo pipefail

# Toolbox Template - Bash with external service integration via curl

case "${TOOLBOX_ACTION:-}" in
"describe")
cat <<EOF
name: my_example_tool
description: A sample tool that sends text to httpbin and returns response
text: string Text to send to the service
EOF
;;
"execute")
input=$(cat)
text=$(echo "$input" | grep "^text:" | sed 's/^text: *//')

if [[ -z "$text" ]]; then
echo "Error: text parameter required" >&2
exit 1
fi

# Make HTTP request using curl
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  response=$(curl -s -X POST "https://httpbin.org/post" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Amp-Toolbox-Bash/1.0" \
  -d "{\"message\": \"$text\", \"timestamp\": \"$timestamp\"}")
  
  if [[ $? -ne 0 ]]; then
    echo "Error: Failed to connect to service" >&2
    exit 1
  fi
  
  # Parse JSON response (simpler approach)
  echo "Service processed: $text"
  echo "Response received from httpbin.org"
  ;;
*)
  echo "Error: TOOLBOX_ACTION must be 'describe' or 'execute'" >&2
  exit 1
  ;;
esac
