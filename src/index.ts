#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { MondayService } from './services/monday.service';
import { NotionService } from './services/notion.service';
import { CommentTranslator } from './services/translator.service';
import { MigrationConfig, MigrationResult } from './types';

// Environment variables with defaults
const config = {
  monday: {
    apiToken: process.env.MONDAY_API_TOKEN || '',
    boardId: process.env.MONDAY_BOARD_ID,
  },
  notion: {
    apiToken: process.env.NOTION_API_TOKEN || '',
    databaseId: process.env.NOTION_DATABASE_ID,
  },
};

async function testConnections(): Promise<void> {
  console.log('Testing API connections...\n');

  if (!config.monday.apiToken) {
    console.error('❌ MONDAY_API_TOKEN environment variable is required');
    process.exit(1);
  }

  if (!config.notion.apiToken) {
    console.error('❌ NOTION_API_TOKEN environment variable is required');
    process.exit(1);
  }

  const mondayService = new MondayService(config.monday.apiToken);
  const notionService = new NotionService(config.notion.apiToken);

  // Test Monday connection
  console.log('Testing Monday.com connection...');
  const mondayConnected = await mondayService.testConnection();
  console.log(mondayConnected ? '✅ Monday.com connected successfully' : '❌ Monday.com connection failed');

  // Test Notion connection
  console.log('Testing Notion connection...');
  const notionConnected = await notionService.testConnection();
  console.log(notionConnected ? '✅ Notion connected successfully' : '❌ Notion connection failed');

  if (!mondayConnected || !notionConnected) {
    console.error('\n❌ One or more API connections failed. Please check your tokens.');
    process.exit(1);
  }

  console.log('\n✅ All connections successful!');
}

async function migrateComments(options: {
  mondayItemId?: string;
  mondayBoardId?: string;
  notionPageId?: string;
  notionDatabaseId?: string;
  dryRun?: boolean;
  preserveThreading?: boolean;
}): Promise<void> {
  if (!config.monday.apiToken || !config.notion.apiToken) {
    console.error('❌ Both MONDAY_API_TOKEN and NOTION_API_TOKEN environment variables are required');
    process.exit(1);
  }

  const mondayService = new MondayService(config.monday.apiToken);
  const notionService = new NotionService(config.notion.apiToken);
  const translator = new CommentTranslator(mondayService, notionService);

  try {
    // Build user mappings first
    console.log('🔄 Building user mappings...');
    await translator.buildUserMappings();

    // Load existing mappings if available
    await translator.loadMappings('./migration-mappings.json');

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No actual changes will be made\n');
    }

    let totalResult: MigrationResult = {
      success: true,
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [],
    };

    // Handle single item migration
    if (options.mondayItemId && options.notionPageId) {
      console.log(`📝 Migrating comments from Monday item ${options.mondayItemId} to Notion page ${options.notionPageId}`);
      
      const result = await translator.migrateItemComments(
        options.mondayItemId,
        options.notionPageId,
        {
          dryRun: options.dryRun,
          preserveThreading: options.preserveThreading,
        }
      );

      totalResult = result;
    }
    // Handle board-to-database migration
    else if (options.mondayBoardId && options.notionDatabaseId) {
      console.log(`📋 Migrating comments from Monday board ${options.mondayBoardId} to Notion database ${options.notionDatabaseId}`);
      
      // Get Monday board items
      const mondayItems = await mondayService.getBoardItems(options.mondayBoardId);
      console.log(`Found ${mondayItems.length} items in Monday board`);

      // Get Notion database pages
      const notionPages = await notionService.getDatabasePages(options.notionDatabaseId);
      console.log(`Found ${notionPages.length} pages in Notion database`);

      // For now, migrate based on order (item[0] -> page[0], etc.)
      // In a real scenario, you'd want better matching logic
      const itemsToMigrate = Math.min(mondayItems.length, notionPages.length);

      for (let i = 0; i < itemsToMigrate; i++) {
        const mondayItem = mondayItems[i];
        const notionPage = notionPages[i];

        console.log(`\\n📝 Migrating item ${i + 1}/${itemsToMigrate}: ${mondayItem.name} -> ${(notionPage as any).id}`);

        const result = await translator.migrateItemComments(
          mondayItem.id,
          (notionPage as any).id,
          {
            dryRun: options.dryRun,
            preserveThreading: options.preserveThreading,
          }
        );

        // Aggregate results
        totalResult.processed += result.processed;
        totalResult.created += result.created;
        totalResult.skipped += result.skipped;
        totalResult.errors.push(...result.errors);
        
        if (!result.success) {
          totalResult.success = false;
        }

        // Small delay between items
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } else {
      console.error('❌ Either provide --monday-item-id with --notion-page-id, or --monday-board-id with --notion-database-id');
      process.exit(1);
    }

    // Save mappings for future reference
    await translator.saveMappings('./migration-mappings.json');

    // Print summary
    console.log('\n📊 Migration Summary:');
    console.log(`  Processed: ${totalResult.processed} comments`);
    console.log(`  Created: ${totalResult.created} comments`);
    console.log(`  Skipped: ${totalResult.skipped} comments`);
    console.log(`  Errors: ${totalResult.errors.length} errors`);

    if (totalResult.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      for (const error of totalResult.errors) {
        console.log(`  - ${error.message}`);
      }
    }

    if (totalResult.success) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️ Migration completed with errors.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// CLI setup with yargs
const cli = yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .command(
    'test',
    'Test connections to Monday.com and Notion APIs',
    {},
    testConnections
  )
  .command(
    'migrate',
    'Migrate comments from Monday.com to Notion',
    {
      'monday-item-id': {
        type: 'string',
        describe: 'Monday.com item ID to migrate comments from',
        group: 'Single Item Migration:',
      },
      'notion-page-id': {
        type: 'string',
        describe: 'Notion page ID to migrate comments to',
        group: 'Single Item Migration:',
      },
      'monday-board-id': {
        type: 'string',
        describe: 'Monday.com board ID to migrate all items from',
        group: 'Board Migration:',
      },
      'notion-database-id': {
        type: 'string',
        describe: 'Notion database ID to migrate all pages to',
        group: 'Board Migration:',
      },
      'dry-run': {
        type: 'boolean',
        default: false,
        describe: 'Preview migration without making changes',
        group: 'Options:',
      },
      'preserve-threading': {
        type: 'boolean',
        default: true,
        describe: 'Preserve comment threads (replies) in Notion',
        group: 'Options:',
      }
    },
    migrateComments
  )
  .example('$0 test', 'Test API connections')
  .example('$0 migrate --monday-item-id 123 --notion-page-id abc', 'Migrate single item comments')
  .example('$0 migrate --monday-board-id 456 --notion-database-id def --dry-run', 'Preview board migration')
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .demandCommand(1, 'You need at least one command before moving on')
  .strict();

// Environment variables help
console.log('📋 Required Environment Variables:');
console.log('  MONDAY_API_TOKEN - Your Monday.com API token');
console.log('  NOTION_API_TOKEN - Your Notion integration token');
console.log('  MONDAY_BOARD_ID - (optional) Default Monday board ID');
console.log('  NOTION_DATABASE_ID - (optional) Default Notion database ID');
console.log('');

// Parse and execute
cli.parse();