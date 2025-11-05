# Deep Search API Usage

The Deep Search API allows you to create AI-powered conversations that can search and analyze your codebase. This API is available at version 6.7+ and provides endpoints for managing conversations and questions.

## Authentication

All API requests require authentication using a Sourcegraph access token:

```bash
# Set your access token
export SRC_ACCESS_TOKEN="your-token-here"

```

## Base URL

All endpoints are prefixed with `/.api/deepsearch/v1`

## Endpoints Overview

### Conversations

- `POST /.api/deepsearch/v1` - Create a new conversation
- `GET /.api/deepsearch/v1` - List conversations
- `GET /.api/deepsearch/v1/{id}` - Get a specific conversation
- `DELETE /.api/deepsearch/v1/{id}` - Delete a conversation
- `DELETE /.api/deepsearch/v1` - Delete all conversations for the user
- `POST /.api/deepsearch/v1/{id}/rotate-read-token` - Rotate read token

### Questions

- `POST /.api/deepsearch/v1/{id}/questions` - Add a question to a conversation
- `POST /.api/deepsearch/v1/{id}/questions/{question_id}/cancel` - Cancel a question

## Creating a Conversation

Create a new deepsearch conversation by asking a question.

**Note:** This synchronous example may timeout for complex queries. See the warning below and use async mode for production use.

```bash
curl '<https://sourcegraph.test:3443/.api/deepsearch/v1>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "Authorization: token $SRC_ACCESS_TOKEN" \
  -H 'X-Requested-With: integratr 0.0.1' \
  -d '{"question":"Does github.com/sourcegraph/sourcegraph have a README?"}'

```

***N.B**. The `X-Requested-With` header is required to identify the client making the request and can be any string followed by any semver number.*

> **⚠️ Important: Timeout Behavior**
>
> Deep Search queries typically take 1+ minutes to process and may timeout when using synchronous requests due to Cloudflare's 60-second timeout limit. **It is strongly recommended to use asynchronous processing with the `Prefer: respond-async` header** (see [Async Processing](#async-processing) section below) for all Deep Search requests to avoid timeouts.

### Request Body

```json
{
  "question": "Your question here"
}

```

### Response

The API returns a complete conversation object including the generated question and answer:

```json
{
  "id": 332,
  "questions": [
    {
      "id": 4978,
      "conversation_id": 332,
      "question": "Does github.com/sourcegraph/sourcegraph have a README?",
      "created_at": "2025-08-18T21:16:49Z",
      "updated_at": "2025-08-18T21:16:57Z",
      "status": "completed",
      "title": "Check for README in sourcegraph/sourcegraph",
      "answer": "Yes, [github.com/sourcegraph/sourcegraph](/github.com/sourcegraph/sourcegraph/) has a [README.md](/github.com/sourcegraph/sourcegraph/-/blob/README.md) file in the root directory.",
      "sources": [
        {
          "type": "Repository",
          "link": "/github.com/sourcegraph/sourcegraph",
          "label": "github.com/sourcegraph/sourcegraph",
          "metadata": {
            "abbreviatedRevision": "affb534",
            "basePath": "",
            "repoName": "github.com/sourcegraph/sourcegraph",
            "revision": "affb5349bedef24188a7e992f9581ee76fbe151d"
          }
        }
      ],
      "turns": [...],
      "stats": {...},
      "suggested_followups": [
        "What is the purpose of the README.md file in the sourcegraph repository?",
        "What kind of information is typically included in the README.md file of a large project like sourcegraph?"
      ]
    }
  ],
  "created_at": "2025-08-18T21:16:49Z",
  "updated_at": "2025-08-18T21:16:49Z",
  "user_id": 1,
  "read_token": "fb1f21bb-07e5-48ff-a4cf-77bd2502c8a8",
  "share_url": "<https://sourcegraph-test:3443>/deepsearch/fb1f21bb-07e5-48ff-a4cf-77bd2502c8a8",
  "viewer": { "is_owner": true },
  "quota_usage": { "total_quota": 0, "quota_limit": -1, "reset_time": "2025-09-01T00:00:00Z" }
}

```

## Async Processing (Recommended)

**This is the recommended approach for all Deep Search requests** due to typical processing times of 1+ minutes and Cloudflare's 60-second timeout limit on synchronous requests.

### Why Use Async Mode?

Deep Search queries perform complex codebase analysis that typically takes 1-2 minutes or longer. Synchronous requests will timeout after 60 seconds due to Cloudflare proxy limits. Async mode allows you to:
- Avoid timeout errors
- Poll for results at your own pace
- Handle long-running queries gracefully

### Creating an Async Conversation

Request asynchronous processing by adding the `Prefer: respond-async` header:

```bash
curl '<https://sourcegraph.test:3443/.api/deepsearch/v1>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "Authorization: token $SRC_ACCESS_TOKEN" \
  -H 'X-Requested-With: integratr 0.0.1' \
  -H 'Prefer: respond-async' \
  -d '{"question":"Complex question that might take time"}'

```

This returns a `202 Accepted` status and a result like the following:

```json
{
  "id": 333,
  "questions": [
    {
      "id": 4979,
      "conversation_id": 333,
      "question": "Does github.com/sourcegraph/sourcegraph have a README?",
      "created_at": "2025-08-18T21:31:31Z",
      "updated_at": "2025-08-18T21:31:31Z",
      "status": "processing",
      "turns": [
        {
          "reasoning": "Does github.com/sourcegraph/sourcegraph have a README?",
          "timestamp": 1755552691,
          "role": "user"
        }
      ],
      "stats": {...}
      "suggested_followups": null
    }
  ],
  "created_at": "2025-08-18T21:31:31Z",
  "updated_at": "2025-08-18T21:31:31Z",
  "user_id": 1,
  "read_token": "fe485460-cde6-41e6-b757-662d8c1c1162",
  "viewer": { "is_owner": true }
}

```

Note the `"status": "processing"` field. This indicates the request is being processed in the background.

### Polling for Results

After receiving the initial `202` response, you should poll for results periodically. **Recommended polling strategy:**
- **Polling interval:** Every 10 seconds
- **Maximum wait time:** Up to 300 seconds (5 minutes)
- **Status values:** `processing`, `completed`, `failed`

You can poll using either:
- The full conversation: `GET /.api/deepsearch/v1/{conversation_id}`
- Individual question: `GET /.api/deepsearch/v1/{conversation_id}/questions/{question_id}`

### Polling Example

Here's a complete example showing the async workflow with polling:

```bash
#!/bin/bash

# Step 1: Create async conversation
RESPONSE=$(curl -s '<https://sourcegraph.test:3443/.api/deepsearch/v1>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "Authorization: token $SRC_ACCESS_TOKEN" \
  -H 'X-Requested-With: integratr 0.0.1' \
  -H 'Prefer: respond-async' \
  -d '{"question":"Your question here"}')

CONV_ID=$(echo $RESPONSE | jq -r '.id')
QUESTION_ID=$(echo $RESPONSE | jq -r '.questions[0].id')

echo "Created conversation $CONV_ID with question $QUESTION_ID"

# Step 2: Poll for results (max 300 seconds = 30 attempts * 10 seconds)
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  echo "Polling attempt $((ATTEMPT + 1))/$MAX_ATTEMPTS..."
  
  STATUS_RESPONSE=$(curl -s "<https://sourcegraph.test:3443/.api/deepsearch/v1/$CONV_ID/questions/$QUESTION_ID>" \
    -H 'Accept: application/json' \
    -H 'X-Requested-With: integratr 0.0.1' \
    -H "Authorization: token $SRC_ACCESS_TOKEN")
  
  STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
  
  if [ "$STATUS" = "completed" ]; then
    echo "Question completed!"
    echo $STATUS_RESPONSE | jq '.'
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo "Question failed!"
    echo $STATUS_RESPONSE | jq '.'
    exit 1
  fi
  
  # Still processing, wait 10 seconds
  sleep 10
  ATTEMPT=$((ATTEMPT + 1))
done

echo "Timeout: Question did not complete within 300 seconds"
exit 1

```

## Listing Conversations

Get all your conversations with optional filtering:

```bash
# List all conversations
curl '<https://sourcegraph.test:3443/.api/deepsearch/v1>' \
  -H 'Accept: application/json' \
  -H 'X-Requested-With: integratr 0.0.1' \
  -H "Authorization: token $SRC_ACCESS_TOKEN"

# List conversations with filters
curl '<https://sourcegraph.test:3443/.api/deepsearch/v1?filter_user_id=1&page_first=10&sort=created_at>' \
  -H 'Accept: application/json' \
  -H 'X-Requested-With: integratr 0.0.1' \
  -H "Authorization: token $SRC_ACCESS_TOKEN"

```

### Query Parameters

- `filter_id` - Filter by conversation ID
- `filter_user_id` - Filter by user ID
- `filter_read_token` - Filter by read token
- `page_first` - Number of results per page
- `page_after` - Pagination cursor
- `sort` - Sort order: `created_at`, `created_at`, `id`, `id`, `updated_at`, `updated_at` (where a  prefix indicates descending order)

## Getting a Specific Conversation

Retrieve a conversation by ID:

```bash
curl '<https://sourcegraph.test:3443/.api/deepsearch/v1/332>' \
  -H 'Accept: application/json' \
  -H 'X-Requested-With: integratr 0.0.1' \
  -H "Authorization: token $SRC_ACCESS_TOKEN"

```

## Adding Questions to Existing Conversations

Add a follow-up question to an existing conversation:

```bash
curl '<https://sourcegraph.test:3443/.api/deepsearch/v1/332/questions>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'X-Requested-With: integratr 0.0.1' \
  -H "Authorization: token $SRC_ACCESS_TOKEN" \
  -d '{"conversation_id":332,"question":"What does the README file contain?"}'

```

### Response

Contrasted with `POST /.api/deepsearch/v1`, this endpoint returns only the nested question model, e.g.:

```json
{
  "id": 4981,
  "conversation_id": 332,
  "question": "What does the README file contain?",
  "created_at": "2025-08-18T21:39:31Z",
  "updated_at": "2025-08-18T21:39:36Z",
  "status": "completed",
  "title": "README content",
  "answer": "The [README.md](/github.com/sourcegraph/sourcegraph/-/blob/README.md) file contains:\n\n- **Logo and branding**: Sourcegraph logo with light/dark mode variants\n- **Build status badge**: Shows the current build status from Buildkite\n- **Welcome message**: \"Welcome to Sourcegraph! This is where the world-leading AI Agents are born.\"\n- **Development section**: Points to the [Developing Sourcegraph guide](/github.com/sourcegraph/sourcegraph/-/blob/doc/dev) for getting started\n- **License information**: Notes that the repository contains primarily non-OSS-licensed files and references the [LICENSE](/github.com/sourcegraph/sourcegraph/-/blob/LICENSE) file\n- **Copyright notice**: Copyright (c) 2018-present Sourcegraph Inc.\n\nThe README is quite minimal and focuses on directing developers to the comprehensive development documentation rather than providing detailed setup instructions directly in the README.",
  "turns": [...],
  "stats": {
    "time_millis": 15548,
    "tool_calls": 2,
    "total_input_tokens": 14441,
    "cached_tokens": 0,
    "cache_creation_input_tokens": 68319,
    "prompt_tokens": 25,
    "completion_tokens": 688,
    "total_tokens": 14666,
    "credits": 5
  },
  "suggested_followups": [
    "What are the key components of the Developing Sourcegraph guide?",
    "What is the license used for Sourcegraph, and what are its main terms?"
  ]
}

```

## Cancelling Questions

Cancel a question that's currently being processed (using the conversation and question IDs returned from a previous question creation) :

```bash
curl '<https://sourcegraph.test:3443/.api/deepsearch/v1/332/questions/4978/cancel>' \
  -X POST \
  -H 'Accept: application/json' \
  -H 'X-Requested-With: integratr 0.0.1' \
  -H "Authorization: token $SRC_ACCESS_TOKEN"

```

*N.B. This only makes sense for async questions.*

## Managing Read Tokens

Rotate the read token for a conversation (useful for security):

```bash
curl '<https://sourcegraph.test:3443/.api/deepsearch/v1/332/rotate-read-token>' \
  -X POST \
  -H 'Accept: application/json' \
  -H 'X-Requested-With: integratr 0.0.1' \
  -H "Authorization: token $SRC_ACCESS_TOKEN"

```

Returns:

```json
{
  "read_token": "new-token-here"
}

```

## Deleting Conversations

Delete a specific conversation:

```bash
curl '<https://sourcegraph.test:3443/.api/deepsearch/v1/332>' \
  -X DELETE \
  -H 'X-Requested-With: integratr 0.0.1' \
  -H "Authorization: token $SRC_ACCESS_TOKEN"

```

Delete all conversations (use with caution):

```bash
curl '<https://sourcegraph.test:3443/.api/deepsearch/v1>' \
  -X DELETE \
  -H 'X-Requested-With: integratr 0.0.1' \
  -H "Authorization: token $SRC_ACCESS_TOKEN"

```

## Response Structure

### Conversation Object

- `id` - Unique conversation identifier
- `questions` - Array of questions and answers
- `created_at` / `updated_at` - Timestamps
- `user_id` - Owner user ID
- `read_token` - Token for read access
- `viewer` - Permissions info
- `quota_usage` - Usage statistics

### Question Object

- `id` - Unique question identifier
- `conversation_id` - Parent conversation ID
- `question` - The original question text
- `status` - Processing status: `pending`, `processing`, `completed`, `failed`
- `title` - Generated title for the question
- `answer` - The AI-generated answer (when completed)
- `sources` - Array of sources used to generate the answer
- `turns` - Detailed reasoning turns and tool calls
- `stats` - Token usage and timing statistics
- `suggested_followups` - Suggested follow-up questions

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `202` - Accepted (for async requests)
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a message describing the issue.