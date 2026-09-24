# Comments Migration Research

## Monday.com Comments Structure

### API Endpoint
- Comments are part of the Monday.com GraphQL API
- Base URL: `https://api.monday.com/v2`
- Authentication: API token via `Authorization: Bearer <token>` header

### Comment Data Structure
Based on Monday.com API documentation:

```graphql
query {
  items(ids: [item_id]) {
    updates {
      id
      body
      created_at
      creator {
        id
        name
        email
      }
      replies {
        id
        body
        created_at
        creator {
          id
          name
          email
        }
      }
    }
  }
}
```

### Key Properties
- `id`: Unique identifier for the update/comment
- `body`: Comment text content (can include HTML/markdown)
- `created_at`: ISO timestamp of creation
- `creator`: User object with id, name, email
- `replies`: Array of reply objects with same structure
- Comments are called "updates" in Monday.com terminology
- Updates can have replies (nested comments)

### Access Pattern
- Comments are attached to items (tasks/rows)
- Retrieved via items query with updates field
- Supports pagination with `limit` and `page` parameters

---

## Notion Comments Structure

### API Endpoint
- Comments are part of the Notion REST API v1
- Base URL: `https://api.notion.com/v1`
- Authentication: `Authorization: Bearer <token>` header
- Version header: `Notion-Version: 2022-06-28`

### Comment Data Structure
Based on Notion API documentation:

```json
{
  "object": "comment",
  "id": "comment-uuid",
  "parent": {
    "type": "page_id",
    "page_id": "page-uuid"
  },
  "discussion_id": "discussion-uuid",
  "created_time": "2023-01-01T00:00:00.000Z",
  "last_edited_time": "2023-01-01T00:00:00.000Z",
  "created_by": {
    "object": "user",
    "id": "user-uuid"
  },
  "last_edited_by": {
    "object": "user",
    "id": "user-uuid"
  },
  "rich_text": [
    {
      "type": "text",
      "text": {
        "content": "Comment content here"
      }
    }
  ]
}
```

### Key Properties
- `id`: UUID for the comment
- `parent`: Object reference (page_id, block_id, etc.)
- `discussion_id`: Groups related comments together
- `created_time`: ISO timestamp
- `created_by`: User object reference
- `rich_text`: Array of rich text objects (supports formatting)
- Comments are flat - no native reply nesting

### Access Pattern
- Comments retrieved via `/v1/comments` endpoint
- Filtered by `block_id` or `page_id` parameter
- Supports pagination with `start_cursor` and `page_size`
- Creating comments requires `POST /v1/comments`

---

## Translation Challenges

### Key Differences
1. **Nesting**: Monday has reply threads, Notion has flat comments with discussion_id grouping
2. **Content Format**: Monday uses HTML/text, Notion uses rich_text arrays
3. **User References**: Different ID systems and user object structures
4. **Timestamps**: Both use ISO format but different field names
5. **Parent Association**: Monday comments attach to items, Notion to pages/blocks

### Translation Strategy
1. **User Mapping**: Create user ID mapping table Monday → Notion
2. **Content Conversion**: HTML/text → rich_text format
3. **Thread Flattening**: Convert Monday reply threads to flat Notion comments
4. **Parent Mapping**: Map Monday items to Notion pages/databases
5. **Discussion Grouping**: Use discussion_id to maintain comment relationships

### Required Environment Variables
- `MONDAY_API_TOKEN`: Monday.com API access token
- `NOTION_API_TOKEN`: Notion integration token
- `MONDAY_BOARD_ID`: Source board ID (optional, for filtering)
- `NOTION_DATABASE_ID`: Target database ID (optional)