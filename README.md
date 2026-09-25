# Monday.com to Notion Comments Migration Tool

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Notion SDK](https://img.shields.io/badge/Notion_SDK-5.26.0-orange.svg)](https://www.npmjs.com/package/@notionhq/client)

A comprehensive TypeScript tool for migrating comments from Monday.com to Notion with full API integration and a rich command-line interface.

## 🚀 Features

- ✅ **Latest Notion SDK**: Using `@notionhq/client@5.26.0` with API version `2022-06-28`
- ✅ **Advanced HTML Conversion**: Comprehensive Monday.com HTML → Notion rich text with full formatting preservation
- ✅ **Single Item Migration**: Migrate comments from specific Monday items to Notion pages
- ✅ **Board Migration**: Migrate entire boards from Monday.com to Notion databases  
- ✅ **Thread Preservation**: Convert Monday reply threads to Notion discussion groups
- ✅ **User Mapping**: Automatic user matching between platforms via email
- ✅ **Dry Run Mode**: Test migrations safely without making changes
- ✅ **Progress Tracking**: Comprehensive error handling and migration reports
- ✅ **Rich CLI**: Full-featured command interface with yargs

### 🎨 **Formatting Support**
Preserves **ALL** Monday.com formatting when migrating to Notion:
- **Bold**, *Italic*, <u>Underline</u>, ~~Strikethrough~~
- `Code blocks` and snippets
- [Clickable links](https://example.com) with URLs
- **@User mentions** (highlighted)
- • Bulleted and numbered lists
- Line breaks and paragraphs
- HTML entities (properly decoded)

## 📋 Prerequisites

### 1. Monday.com API Token
- Go to your Monday.com account settings
- Navigate to API section  
- Generate a new API token with read permissions

### 2. Notion Integration Token
- Create a new integration at [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
- Copy the integration token
- Share the target pages/databases with your integration

## 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/huffduff/monday-to-notion-comments.git
cd monday-to-notion-comments

# Install dependencies
npm install

# Build the project
npm run build
```

## ⚙️ Environment Setup

Create a `.env` file or set these environment variables:

```bash
MONDAY_API_TOKEN=your_monday_api_token_here
NOTION_API_TOKEN=secret_your_notion_token_here
MONDAY_BOARD_ID=123456789  # Optional: default board ID
NOTION_DATABASE_ID=abc-123-def-456  # Optional: default database ID
```

## 🎯 Usage

### Test API Connections

```bash
npm start test
# or
node dist/index.js test
```

### Migrate Single Item

```bash
# Dry run first (recommended)
npm start migrate --monday-item-id 123456 --notion-page-id abc-def-123 --dry-run

# Actual migration
npm start migrate --monday-item-id 123456 --notion-page-id abc-def-123
```

### Migrate Entire Board

```bash
# Preview migration
npm start migrate --monday-board-id 987654 --notion-database-id xyz-789-abc --dry-run

# Full migration with thread preservation
npm start migrate --monday-board-id 987654 --notion-database-id xyz-789-abc --preserve-threading
```

## 📖 CLI Reference

### Commands

- `test` - Test connections to both APIs
- `migrate` - Migrate comments between platforms

### Migration Options

| Option | Description | Type |
|--------|-------------|------|
| `--monday-item-id` | Single Monday item to migrate from | string |
| `--notion-page-id` | Single Notion page to migrate to | string |
| `--monday-board-id` | Monday board to migrate all items from | string |
| `--notion-database-id` | Notion database to migrate all pages to | string |
| `--dry-run` | Preview migration without making changes | boolean |
| `--preserve-threading` | Keep reply threads grouped (default: true) | boolean |

## 🏗️ Architecture

### Project Structure

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

### Data Flow

1. **Authentication**: Validates API tokens for both platforms
2. **User Mapping**: Matches Monday users to Notion users by email
3. **Content Translation**: Converts Monday HTML/text to Notion rich text
4. **Thread Handling**: Flattens Monday reply threads into Notion discussion groups
5. **Batch Processing**: Migrates comments with rate limiting and error handling

## 🔄 API Integration Details

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

## 🛡️ Error Handling

- **Connection Issues**: Validates API tokens before migration
- **Rate Limiting**: Built-in delays between requests
- **Partial Failures**: Continues migration on individual comment errors
- **Mapping Persistence**: Saves user/comment mappings for recovery
- **Detailed Logging**: Progress tracking and comprehensive error reporting

## 📝 Development

```bash
# Development mode with auto-reload (if ts-node works)
npm run watch

# Build for production
npm run build

# Run built version
npm start -- <commands>
```

## ⚠️ Current Limitations

- User mapping requires matching emails between platforms
- Board-to-database migration uses positional matching
- No support for comment attachments or file uploads
- @mentions converted to highlighted text (not interactive Notion mentions)

## 🔮 Future Enhancements  

- Advanced HTML to rich text conversion
- Smart content matching between Monday items and Notion pages
- Support for comment attachments and media
- Bidirectional sync capabilities
- Custom field mapping

## 📊 API Rate Limits

- **Monday.com**: ~100 requests per minute per token
- **Notion**: ~3 requests per second per integration

The tool includes built-in delays to respect these limits.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable  
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Made with ❤️ for seamless platform migration**