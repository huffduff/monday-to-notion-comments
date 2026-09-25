import { 
  MondayUpdate, 
  MondayReply, 
  MondayUser,
  NotionCreateCommentRequest, 
  NotionRichText,
  UserMapping,
  CommentMapping,
  MigrationResult
} from '../types';
import { MondayService } from '../services/monday.service';
import { NotionService } from '../services/notion.service';
import { EnhancedHtmlConverter } from '../utils/enhanced-html-converter';

export class CommentTranslator {
  private mondayService: MondayService;
  private notionService: NotionService;
  private userMappings: Map<string, UserMapping> = new Map();
  private commentMappings: Map<string, CommentMapping> = new Map();

  constructor(mondayService: MondayService, notionService: NotionService) {
    this.mondayService = mondayService;
    this.notionService = notionService;
  }

  /**
   * Build user mappings between Monday and Notion by matching emails
   */
  async buildUserMappings(): Promise<UserMapping[]> {
    console.log('Building user mappings between Monday and Notion...');
    
    try {
      // Get all Notion users
      const notionUsers = await this.notionService.listUsers();
      const mappings: UserMapping[] = [];

      // For now, we'll need to collect Monday users from comments
      // In a real scenario, you might have a way to get all Monday users
      console.log(`Found ${notionUsers.length} Notion users`);

      // Store mappings for later use
      for (const notionUser of notionUsers) {
        if (notionUser.type === 'person' && notionUser.person?.email) {
          const mapping: UserMapping = {
            mondayId: '', // Will be filled when we encounter Monday users
            notionId: notionUser.id,
            email: notionUser.person.email,
            name: notionUser.name,
          };
          mappings.push(mapping);
        }
      }

      return mappings;
    } catch (error: any) {
      console.error('Failed to build user mappings:', error);
      throw error;
    }
  }

  /**
   * Find or create user mapping
   */
  private async findUserMapping(mondayUser: MondayUser): Promise<string | null> {
    // Check if we already have this mapping
    const existingMapping = this.userMappings.get(mondayUser.id);
    if (existingMapping) {
      return existingMapping.notionId;
    }

    // Try to find Notion user by email
    if (mondayUser.email) {
      const notionUser = await this.notionService.findUserByEmail(mondayUser.email);
      if (notionUser) {
        const mapping: UserMapping = {
          mondayId: mondayUser.id,
          notionId: notionUser.id,
          email: mondayUser.email,
          name: mondayUser.name,
        };
        this.userMappings.set(mondayUser.id, mapping);
        return notionUser.id;
      }
    }

    // No mapping found
    console.warn(`No Notion user found for Monday user: ${mondayUser.name} (${mondayUser.email})`);
    return null;
  }

  /**
   * Convert Monday comment content to Notion rich text with proper mention handling
   */
  private convertContentToRichText(content: string): NotionRichText[] {
    // Handle HTML content from Monday with mention extraction
    if (content.includes('<') && content.includes('>')) {
      const { richText, mentions } = EnhancedHtmlConverter.convertWithMentions(content);
      
      // Resolve mentions using our user mappings
      const resolvedRichText = EnhancedHtmlConverter.resolveMentions(
        richText, 
        mentions, 
        this.userMappings
      );
      
      return resolvedRichText;
    }
    
    // Handle plain text
    return this.notionService.createRichText(content);
  }

  /**
   * Convert a Monday update to Notion comment request
   */
  async convertUpdateToComment(
    update: MondayUpdate,
    parentPageId: string,
    discussionId?: string
  ): Promise<NotionCreateCommentRequest | null> {
    try {
      const richText = this.convertContentToRichText(update.body);
      
      const commentRequest: NotionCreateCommentRequest = {
        parent: {
          page_id: parentPageId,
        },
        rich_text: richText,
      };

      if (discussionId) {
        commentRequest.discussion_id = discussionId;
      }

      return commentRequest;
    } catch (error) {
      console.error(`Failed to convert update ${update.id}:`, error);
      return null;
    }
  }

  /**
   * Convert a Monday reply to Notion comment request
   */
  async convertReplyToComment(
    reply: MondayReply,
    parentPageId: string,
    discussionId: string
  ): Promise<NotionCreateCommentRequest | null> {
    try {
      const richText = this.convertContentToRichText(reply.body);
      
      const commentRequest: NotionCreateCommentRequest = {
        parent: {
          page_id: parentPageId,
        },
        rich_text: richText,
        discussion_id: discussionId,
      };

      return commentRequest;
    } catch (error) {
      console.error(`Failed to convert reply ${reply.id}:`, error);
      return null;
    }
  }

  /**
   * Migrate comments from a Monday item to a Notion page
   */
  async migrateItemComments(
    mondayItemId: string,
    notionPageId: string,
    options: { dryRun?: boolean; preserveThreading?: boolean } = {}
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [],
    };

    try {
      console.log(`Migrating comments from Monday item ${mondayItemId} to Notion page ${notionPageId}`);
      
      // Get Monday comments
      const updates = await this.mondayService.getItemComments(mondayItemId);
      result.processed = updates.length;

      if (updates.length === 0) {
        console.log('No comments found to migrate');
        return result;
      }

      for (const update of updates) {
        try {
          if (options.dryRun) {
            console.log(`[DRY RUN] Would migrate comment: ${update.id} - ${update.body.substring(0, 50)}...`);
            result.created++;
            continue;
          }

          // Convert and create main comment
          const commentRequest = await this.convertUpdateToComment(update, notionPageId);
          if (!commentRequest) {
            result.errors.push({
              message: `Failed to convert update ${update.id}`,
              update: update.id,
            });
            continue;
          }

          const createdComment = await this.notionService.createComment(commentRequest);
          console.log(`Created comment ${createdComment.id} for update ${update.id}`);
          result.created++;

          // Store mapping
          const mapping: CommentMapping = {
            mondayUpdateId: update.id,
            notionCommentId: createdComment.id,
            discussionId: createdComment.discussion_id,
            parentId: notionPageId,
          };
          this.commentMappings.set(update.id, mapping);

          // Handle replies if preserveThreading is enabled
          if (options.preserveThreading && update.replies && update.replies.length > 0) {
            for (const reply of update.replies) {
              try {
                const replyRequest = await this.convertReplyToComment(
                  reply,
                  notionPageId,
                  createdComment.discussion_id
                );

                if (replyRequest) {
                  const createdReply = await this.notionService.createComment(replyRequest);
                  console.log(`Created reply ${createdReply.id} for reply ${reply.id}`);
                  result.created++;

                  // Store reply mapping
                  const replyMapping: CommentMapping = {
                    mondayUpdateId: update.id,
                    mondayReplyId: reply.id,
                    notionCommentId: createdReply.id,
                    discussionId: createdReply.discussion_id,
                    parentId: notionPageId,
                  };
                  this.commentMappings.set(`${update.id}-${reply.id}`, replyMapping);
                }
              } catch (error: any) {
                result.errors.push({
                  message: `Failed to migrate reply ${reply.id}: ${error.message}`,
                  update: update.id,
                });
              }
            }
          }

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: any) {
          result.errors.push({
            message: `Failed to migrate update ${update.id}: ${error.message}`,
            update: update.id,
          });
          console.error(`Error migrating update ${update.id}:`, error);
        }
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push({
        message: `Failed to migrate comments: ${error.message}`,
        item: mondayItemId,
      });
      console.error('Migration failed:', error);
    }

    return result;
  }

  /**
   * Get current user mappings
   */
  getUserMappings(): UserMapping[] {
    return Array.from(this.userMappings.values());
  }

  /**
   * Get current comment mappings
   */
  getCommentMappings(): CommentMapping[] {
    return Array.from(this.commentMappings.values());
  }

  /**
   * Save mappings to file for future reference
   */
  async saveMappings(filePath: string): Promise<void> {
    const mappings = {
      users: this.getUserMappings(),
      comments: this.getCommentMappings(),
    };

    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(mappings, null, 2));
    console.log(`Mappings saved to ${filePath}`);
  }

  /**
   * Load mappings from file
   */
  async loadMappings(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(filePath, 'utf8');
      const mappings = JSON.parse(data);

      // Load user mappings
      if (mappings.users) {
        this.userMappings.clear();
        for (const userMapping of mappings.users) {
          this.userMappings.set(userMapping.mondayId, userMapping);
        }
      }

      // Load comment mappings
      if (mappings.comments) {
        this.commentMappings.clear();
        for (const commentMapping of mappings.comments) {
          const key = commentMapping.mondayReplyId 
            ? `${commentMapping.mondayUpdateId}-${commentMapping.mondayReplyId}`
            : commentMapping.mondayUpdateId;
          this.commentMappings.set(key, commentMapping);
        }
      }

      console.log(`Loaded ${mappings.users?.length || 0} user mappings and ${mappings.comments?.length || 0} comment mappings`);
    } catch (error: any) {
      console.warn(`Could not load mappings from ${filePath}:`, error.message);
    }
  }
}