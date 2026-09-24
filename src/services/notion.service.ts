import { Client } from '@notionhq/client';
import { 
  NotionComment, 
  NotionCreateCommentRequest, 
  NotionRichText,
  NotionUser
} from '../types';

export class NotionService {
  private client: Client;

  constructor(apiToken: string) {
    this.client = new Client({
      auth: apiToken,
    });
  }

  /**
   * Get comments for a specific page
   */
  async getPageComments(pageId: string): Promise<NotionComment[]> {
    try {
      const response = await this.client.comments.list({
        block_id: pageId,
        page_size: 100,
      });

      return response.results as unknown as NotionComment[];
    } catch (error) {
      console.error(`Failed to get comments for page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Get comments for a specific block
   */
  async getBlockComments(blockId: string): Promise<NotionComment[]> {
    try {
      const response = await this.client.comments.list({
        block_id: blockId,
        page_size: 100,
      });

      return response.results as unknown as NotionComment[];
    } catch (error) {
      console.error(`Failed to get comments for block ${blockId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new comment
   */
  async createComment(request: NotionCreateCommentRequest): Promise<NotionComment> {
    try {
      const createParams: any = {
        parent: request.parent,
        rich_text: request.rich_text as any,
      };
      
      if (request.discussion_id) {
        createParams.discussion_id = request.discussion_id;
      }

      const response = await this.client.comments.create(createParams);

      return response as unknown as NotionComment;
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  }

  /**
   * Get user information
   */
  async getUser(userId: string): Promise<NotionUser> {
    try {
      const response = await this.client.users.retrieve({
        user_id: userId,
      });

      return response as unknown as NotionUser;
    } catch (error) {
      console.error(`Failed to get user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * List all users in the workspace
   */
  async listUsers(): Promise<NotionUser[]> {
    try {
      const response = await this.client.users.list({
        page_size: 100,
      });

      return response.results as unknown as NotionUser[];
    } catch (error) {
      console.error('Failed to list users:', error);
      throw error;
    }
  }

  /**
   * Get page information
   */
  async getPage(pageId: string) {
    try {
      const response = await this.client.pages.retrieve({
        page_id: pageId,
      });

      return response;
    } catch (error) {
      console.error(`Failed to get page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Get database pages
   */
  async getDatabasePages(databaseId: string) {
    try {
      // Use pages.retrieve instead of databases.query
      const response = await this.client.pages.retrieve({
        page_id: databaseId,
      });

      // This is a simplified approach - you'd need to implement proper database querying
      // For now, we'll return an empty array and let the user handle database page discovery
      console.warn('Database page querying is not fully implemented. Please provide specific page IDs.');
      return [];
    } catch (error) {
      console.error(`Failed to get database pages for ${databaseId}:`, error);
      throw error;
    }
  }

  /**
   * Convert plain text to Notion rich text format
   */
  createRichText(content: string): NotionRichText[] {
    return [
      {
        type: 'text',
        text: {
          content: content,
        },
        plain_text: content,
      } as NotionRichText
    ];
  }

  /**
   * Convert HTML content to Notion rich text (simplified version)
   * This is a basic implementation - you might want to use a more sophisticated HTML parser
   */
  htmlToRichText(htmlContent: string): NotionRichText[] {
    // Remove HTML tags for now - this could be enhanced to preserve formatting
    const plainText = htmlContent.replace(/<[^>]*>/g, '');
    return this.createRichText(plainText);
  }

  /**
   * Test the connection to Notion API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.users.me({});
      return true;
    } catch (error) {
      console.error('Notion API connection test failed:', error);
      return false;
    }
  }

  /**
   * Find user by email (helper for mapping Monday users to Notion users)
   */
  async findUserByEmail(email: string): Promise<NotionUser | null> {
    try {
      const users = await this.listUsers();
      const user = users.find(u => 
        u.type === 'person' && 
        u.person?.email?.toLowerCase() === email.toLowerCase()
      );
      
      return user || null;
    } catch (error) {
      console.error(`Failed to find user by email ${email}:`, error);
      return null;
    }
  }
}