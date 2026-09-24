# Comments Migration Tool

A TypeScript tool for migrating comments from Monday.com to Notion using their respective APIs.

## Features

- ✅ Migrate comments from Monday.com items to Notion pages
- ✅ Migrate entire boards from Monday.com to Notion databases  
- ✅ Preserve comment threading (replies become grouped discussions)
- ✅ User mapping between platforms (by email matching)
- ✅ Dry run mode for testing migrations
- ✅ Progress tracking and error handling
- ✅ Rich CLI interface with yargs

## Prerequisites

1. **Monday.com API Token**
   - Go to your Monday.com account settings
   - Navigate to API section
   - Generate a new API token with read permissions

2. **Notion Integration Token**
   - Create a new integration at https://www.notion.so/my-integrations
   - Copy the integration token
   - Share the target pages/databases with your integration

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Environment Setup

Create a `.env` file or set these environment variables:

```bash
MONDAY_API_TOKEN=your_monday_api_token_here
NOTION_API_TOKEN=secret_your_notion_token_here
MONDAY_BOARD_ID=123456789  # Optional: default board ID
NOTION_DATABASE_ID=abc-123-def-456  # Optional: default database ID
```

## Usage

### Test API Connections

```bash
npm run dev test
# or
node dist/index.js test
```

### Migrate Single Item

```bash
npm run dev migrate --monday-item-id 123456 --notion-page-id abc-def-123
```

### Migrate Entire Board (Preview)

```bash
npm run dev migrate --monday-board-id 987654 --notion-database-id xyz-789-abc --dry-run
```

### Full Board Migration

```bash
npm run dev migrate --monday-board-id 987654 --notion-database-id xyz-789-abc --preserve-threading
```

## CLI Options

### Commands

- `test` - Test connections to both APIs
- `migrate` - Migrate comments between platforms

### Migration Options

- `--monday-item-id` - Single Monday item to migrate from
- `--notion-page-id` - Single Notion page to migrate to  
- `--monday-board-id` - Monday board to migrate all items from
- `--notion-database-id` - Notion database to migrate all pages to
- `--dry-run` - Preview migration without making changes
- `--preserve-threading` - Keep reply threads grouped (default: true)

## How It Works

### Data Flow

1. **Authentication**: Validates API tokens for both platforms
2. **User Mapping**: Matches Monday users to Notion users by email
3. **Content Translation**: Converts Monday HTML/text to Notion rich text
4. **Thread Handling**: Flattens Monday reply threads into Notion discussion groups
5. **Batch Processing**: Migrates comments with rate limiting and error handling

### Monday.com Comments Structure

```graphql
items {
  updates {
    id, body, created_at
    creator { id, name, email }
    replies {
      id, body, created_at
      creator { id, name, email }
    }
  }
}
```

### Notion Comments Structure

```json
{
  "id": "comment-uuid",
  "parent": { "page_id": "page-uuid" },
  "discussion_id": "discussion-uuid", 
  "created_time": "2023-01-01T00:00:00.000Z",
  "rich_text": [{ "type": "text", "text": { "content": "..." } }]
}
```

## Project Structure

```
src/
├── types/           # TypeScript type definitions
├── services/        # API service classes
│   ├── monday.service.ts      # Monday.com GraphQL API
│   ├── notion.service.ts      # Notion REST API  
│   └── translator.service.ts  # Translation layer
├── utils/           # Utility functions
└── index.ts         # CLI application entry point
```

## Development

```bash
# Development mode with auto-reload
npm run watch

# Build for production
npm run build

# Run built version
npm start -- <commands>
```

## Error Handling

- **Connection Issues**: Validates API tokens before migration
- **Rate Limiting**: Built-in delays between requests
- **Partial Failures**: Continues migration on individual comment errors
- **Mapping Persistence**: Saves user/comment mappings for recovery
- **Detailed Logging**: Progress tracking and error reporting

## Limitations

### Current Limitations
- HTML formatting in Monday comments is converted to plain text
- User mapping requires matching emails between platforms
- Board-to-database migration uses positional matching (item[0] → page[0])
- No support for comment attachments or mentions

### Future Enhancements  
- Advanced HTML to rich text conversion
- Smart content matching between Monday items and Notion pages
- Support for comment attachments and media
- Bidirectional sync capabilities
- Custom field mapping

## API Rate Limits

- **Monday.com**: ~100 requests per minute per token
- **Notion**: ~3 requests per second per integration

The tool includes built-in delays to respect these limits.

## Troubleshooting

### Common Issues

1. **"API connection failed"**
   - Verify your API tokens are correct
   - Check that tokens have required permissions

2. **"No Notion user found for Monday user"**  
   - Ensure users exist in both platforms with matching emails
   - Check integration has access to workspace users

3. **"Failed to create comment"**
   - Verify integration has write access to target pages
   - Check that page/database IDs are correct

### Debug Mode

Set `DEBUG=1` environment variable for detailed logging:

```bash
DEBUG=1 npm run dev migrate --dry-run --monday-item-id 123 --notion-page-id abc
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable  
5. Submit a pull request

## License

MIT License - see LICENSE file for details