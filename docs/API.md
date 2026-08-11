# API documentation

This document describes the HTTP API endpoints for creating, retrieving, and
burning encrypted pastes.

## Encryption

The server stores and returns ciphertext for pastes without receiving the
decryption key or password. Content is encrypted on the client before being
sent to the server.

## POST `/api/paste`

Creates a new encrypted paste.

### Request body

```json
{
  "content": "string",
  "expiry": "1h | 24h | 7d",
  "salt": "string (optional)",
  "burnAfterRead": "boolean (optional)",
  "language": "string (optional)"
}
```

### Response body

**201 Created**

```json
{
  "id": "string"
}
```

### Error codes

| Code | Error message |
| ---- | ---------------------------------------------------------- |
| 400  | `Invalid JSON in request body` |
| 400  | `Content must be a string` |
| 400  | `Content cannot be empty` |
| 400  | `Expiry must be one of: "1h", "24h", "7d"` |
| 413  | `Content exceeds maximum size of <max bytes> bytes` |
| 429  | `Too many requests` |
| 500  | `<error message from result.error>` |
| 500  | `Internal server error` |

### Rate limits

- 10 requests per minute.

### curl example

```bash
curl -X POST https://oss.cloakbin.com/api/paste \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<pre-encrypted-ciphertext>",
    "expiry": "24h"
  }'
```

In this example, `content` is a placeholder. The server accepts any non-empty
string and does not check the ciphertext format.

## GET `/api/paste/[id]`

Retrieves an encrypted paste by ID.

### Request body

There is no request body.

### Response body

**200 OK**

```json
{
  "content": "string",
  "createdAt": "string",
  "expiresAt": "string",
  "hasPassword": "boolean",
  "salt": "string",
  "burnAfterRead": "boolean",
  "language": "string"
}
```

### Error codes

| Code | Error message |
| ---- | ---------------------------------------------------------- |
| 400  | `Invalid paste ID` |
| 404  | `Paste not found` |
| 404  | `Paste has expired` |
| 429  | `Too many requests` |
| 500  | `<error message from result.error>` |
| 500  | `Internal server error` |

### Rate limits

- 60 requests per minute.

### curl example

```bash
curl https://oss.cloakbin.com/api/paste/<id>
```

## POST `/api/paste/[id]/burn`

Ensures burn-after-read pastes can only be viewed once. The paste is deleted
from the database in the same operation that returns its content, preventing
multiple views.

### Request body

There is no request body.

### Response body

**200 OK**

```json
{
  "content": "string",
  "createdAt": "string",
  "expiresAt": "string",
  "hasPassword": "boolean",
  "salt": "string",
  "burnAfterRead": "boolean",
  "language": "string"
}
```

### Error codes

| Code | Error message |
| ---- | ---------------------------------------------------------- |
| 400  | `Invalid paste ID` |
| 404  | `Paste not found` |
| 429  | `Too many requests` |
| 500  | `<error message from result.error>` |
| 500  | `Internal server error` |

### Rate limits

- 100 requests per minute (default rate limit).

### curl example

```bash
curl -X POST https://oss.cloakbin.com/api/paste/<id>/burn
```