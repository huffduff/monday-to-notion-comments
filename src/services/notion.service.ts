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
      // Use the latest API version
      notionVersion: '2022-06-28',
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
        rich_text: request.rich_text,
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
   * Query database for pages (latest SDK pattern)
   */
  async getDatabasePages(databaseId: string) {
    try {
      // Use the databases.query method with proper typing
      const response = await (this.client.databases as any).query({
        database_id: databaseId,
        page_size: 100,
      });

      return response.results;
    } catch (error) {
      console.error(`Failed to get database pages for ${databaseId}:`, error);
      
      // Fallback: return empty array and let user know they need to provide page IDs directly
      console.warn('Note: For database page discovery, you may need to provide specific page IDs directly.');
      return [];
    }
  }

  /**
   * Convert plain text to Notion rich text format (latest SDK format)
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
   * Convert HTML content to Notion rich text (enhanced for latest SDK)
   */
  htmlToRichText(htmlContent: string): NotionRichText[] {
    // Basic HTML to rich text conversion
    // For production, consider using a proper HTML parser like 'node-html-parser'
    
    // Remove HTML tags and decode entities
    let plainText = htmlContent
      .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to newlines
      .replace(/<[^>]*>/g, '')        // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')        // Convert &nbsp; to space
      .replace(/&amp;/g, '&')         // Convert &amp; to &
      .replace(/&lt;/g, '<')          // Convert &lt; to <
      .replace(/&gt;/g, '>')          // Convert &gt; to >
      .trim();

    return this.createRichText(plainText);
  }

  /**
   * Test the connection to Notion API (latest SDK pattern)
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.users.me({});
      return true;
    } catch (error) {
      console.error('Notion API connection test failed:', error);
      return false;
    }
  }

  /**
   * Find user by email (enhanced for latest SDK)
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

  /**
   * Get workspace information (useful for debugging)
   */
  async getWorkspaceInfo(): Promise<any> {
    try {
      const me = await this.client.users.me({});
      console.log('Connected to Notion as:', me);
      return me;
    } catch (error) {
      console.error('Failed to get workspace info:', error);
      throw error;
    }
  }
}