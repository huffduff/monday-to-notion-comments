import { NotionRichText, UserMapping } from '../types';

/**
 * Result of HTML conversion that includes extracted mention information
 */
export interface ConversionResult {
  richText: NotionRichText[];
  mentions: MentionReference[];
}

export interface MentionReference {
  mondayUserId: string;
  displayName: string;
  position: number; // Position in the rich text array where this mention appears
}

/**
 * Enhanced HTML converter that extracts user mentions for separate processing
 */
export class EnhancedHtmlConverter {
  /**
   * Convert HTML to rich text and extract mention references for later resolution
   */
  static convertWithMentions(htmlContent: string): ConversionResult {
    const mentions: MentionReference[] = [];
    const richTextElements: NotionRichText[] = [];

    if (!htmlContent || typeof htmlContent !== 'string') {
      return { richText: [], mentions: [] };
    }

    // Handle plain text (no HTML tags)
    if (!htmlContent.includes('<')) {
      richTextElements.push({
        type: 'text',
        text: { content: htmlContent.trim() },
        plain_text: htmlContent.trim(),
      } as NotionRichText);
      return { richText: richTextElements, mentions };
    }

    try {
      // First pass: extract mentions and replace with placeholders
      const { processedHtml, extractedMentions } = this.extractMentions(htmlContent);
      
      // Second pass: convert HTML to rich text (mentions are now placeholders)
      const richText = this.convertHtmlToRichText(processedHtml, extractedMentions);

      return {
        richText,
        mentions: extractedMentions
      };

    } catch (error) {
      console.warn('Enhanced HTML parsing failed, falling back to simple conversion:', error);
      return {
        richText: [{
          type: 'text',
          text: { content: this.stripHtml(htmlContent) },
          plain_text: this.stripHtml(htmlContent),
        } as NotionRichText],
        mentions: []
      };
    }
  }

  /**
   * First pass: extract mention information and replace with placeholders
   */
  private static extractMentions(htmlContent: string): {
    processedHtml: string;
    extractedMentions: MentionReference[];
  } {
    const mentions: MentionReference[] = [];
    let mentionIndex = 0;

    // Match Monday.com mention spans: <span data-mention="user123">@John Doe</span>
    const mentionRegex = /<span[^>]*data-mention=["']([^"']+)["'][^>]*>(.*?)<\/span>/gi;
    
    const processedHtml = htmlContent.replace(mentionRegex, (match, userId, displayText) => {
      const cleanDisplayName = this.stripHtml(displayText).replace(/^@/, ''); // Remove @ prefix if present
      
      mentions.push({
        mondayUserId: userId,
        displayName: cleanDisplayName,
        position: mentionIndex // We'll update this during conversion
      });

      // Replace with placeholder that we can find later
      return `__MENTION_PLACEHOLDER_${mentionIndex++}__`;
    });

    return {
      processedHtml,
      extractedMentions: mentions
    };
  }

  /**
   * Second pass: convert processed HTML to rich text, handling mention placeholders
   */
  private static convertHtmlToRichText(processedHtml: string, mentions: MentionReference[]): NotionRichText[] {
    // For now, use a simple approach - we can enhance this with proper HTML parsing later
    let richText: NotionRichText[] = [];

    // Split by mention placeholders and process each segment
    const parts = processedHtml.split(/(__MENTION_PLACEHOLDER_\d+__)/);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Check if this part is a mention placeholder
      const mentionMatch = part.match(/^__MENTION_PLACEHOLDER_(\d+)__$/);
      if (mentionMatch) {
        const mentionIndex = parseInt(mentionMatch[1]);
        const mention = mentions[mentionIndex];
        
        if (mention) {
          // Update the position to current rich text array position
          mention.position = richText.length;
          
          // Add placeholder rich text element (will be replaced with actual mention or fallback)
          richText.push({
            type: 'text',
            text: { content: `@${mention.displayName}` },
            plain_text: `@${mention.displayName}`,
            annotations: { bold: true }, // Temporary highlighting
            // Add metadata to identify this as a mention placeholder
            __mention_placeholder: {
              mondayUserId: mention.mondayUserId,
              displayName: mention.displayName
            }
          } as any);
        }
      } else if (part.trim()) {
        // Process non-mention HTML content
        const htmlElements = this.convertSimpleHtml(part);
        richText.push(...htmlElements);
      }
    }

    return richText;
  }

  /**
   * Simple HTML to rich text conversion for non-mention content
   */
  private static convertSimpleHtml(html: string): NotionRichText[] {
    // This is a simplified version - we can reuse the complex logic from the original converter
    const plainText = this.stripHtml(html);
    
    if (!plainText.trim()) {
      return [];
    }

    // For now, just return plain text - we can enhance this with formatting later
    return [{
      type: 'text',
      text: { content: plainText },
      plain_text: plainText,
    } as NotionRichText];
  }

  /**
   * Resolve mentions after user mapping is available
   */
  static resolveMentions(
    richText: NotionRichText[], 
    mentions: MentionReference[], 
    userMappings: Map<string, UserMapping>
  ): NotionRichText[] {
    if (mentions.length === 0) {
      return richText;
    }

    return richText.map((element: any, index) => {
      // Check if this element is a mention placeholder
      if (element.__mention_placeholder) {
        const { mondayUserId, displayName } = element.__mention_placeholder;
        
        // Look up the user mapping
        const userMapping = Array.from(userMappings.values())
          .find(mapping => mapping.mondayId === mondayUserId);
        
        if (userMapping && userMapping.notionId) {
          // User exists in Notion - create proper mention
          console.log(`✅ Resolving mention: @${displayName} → Notion user ${userMapping.notionId}`);
          
          return {
            type: 'mention',
            mention: {
              type: 'user',
              user: { id: userMapping.notionId }
            },
            plain_text: `@${displayName}`,
          } as NotionRichText;
        } else {
          // User not found in Notion - fallback to highlighted text with warning
          console.warn(`⚠️ User @${displayName} (Monday ID: ${mondayUserId}) not found in Notion - converting to highlighted text`);
          
          return {
            type: 'text',
            text: { content: `@${displayName}` },
            plain_text: `@${displayName}`,
            annotations: { 
              bold: true, 
              color: 'orange' // Use color to indicate unresolved mention
            }
          } as NotionRichText;
        }
      }

      // Remove the temporary metadata
      const { __mention_placeholder, ...cleanElement } = element;
      return cleanElement;
    });
  }

  /**
   * Strip HTML and decode entities
   */
  private static stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}