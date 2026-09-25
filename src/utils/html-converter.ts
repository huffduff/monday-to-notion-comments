import { parse, HTMLElement } from 'node-html-parser';
import { NotionRichText } from '../types';

export class HtmlToNotionConverter {
  /**
   * Convert Monday.com HTML content to Notion rich text with full formatting preservation
   */
  static convertHtml(htmlContent: string): NotionRichText[] {
    if (!htmlContent || typeof htmlContent !== 'string') {
      return [];
    }

    // Handle plain text (no HTML tags)
    if (!htmlContent.includes('<')) {
      return [{
        type: 'text',
        text: { content: htmlContent.trim() },
        plain_text: htmlContent.trim(),
      } as NotionRichText];
    }

    const richTextElements: NotionRichText[] = [];

    try {
      // Parse the HTML
      const root = parse(htmlContent);
      
      // Process each child node
      this.processNode(root, richTextElements);
      
      // If no elements were created, fallback to plain text
      if (richTextElements.length === 0 && htmlContent.trim()) {
        richTextElements.push({
          type: 'text',
          text: { content: this.stripHtml(htmlContent) },
          plain_text: this.stripHtml(htmlContent),
        } as NotionRichText);
      }

    } catch (error) {
      console.warn('HTML parsing failed, falling back to plain text:', error);
      return [{
        type: 'text',
        text: { content: this.stripHtml(htmlContent) },
        plain_text: this.stripHtml(htmlContent),
      } as NotionRichText];
    }

    return richTextElements.filter(el => el.plain_text && el.plain_text.trim());
  }

  private static processNode(node: HTMLElement | any, richTextElements: NotionRichText[]): void {
    // Handle text nodes
    if (node.nodeType === 3 || (typeof node === 'string')) {
      const text = (typeof node === 'string' ? node : node.text).trim();
      if (text) {
        richTextElements.push({
          type: 'text',
          text: { content: text },
          plain_text: text,
        } as NotionRichText);
      }
      return;
    }

    // Handle element nodes
    if (node.tagName) {
      const tagName = node.tagName.toLowerCase();
      
      switch (tagName) {
        case 'br':
          richTextElements.push({
            type: 'text',
            text: { content: '\n' },
            plain_text: '\n',
          } as NotionRichText);
          break;

        case 'p':
          this.processChildren(node, richTextElements);
          // Add paragraph break if not the last element
          richTextElements.push({
            type: 'text',
            text: { content: '\n' },
            plain_text: '\n',
          } as NotionRichText);
          break;

        case 'strong':
        case 'b':
          this.processFormattedNode(node, richTextElements, { bold: true });
          break;

        case 'em':
        case 'i':
          this.processFormattedNode(node, richTextElements, { italic: true });
          break;

        case 'u':
          this.processFormattedNode(node, richTextElements, { underline: true });
          break;

        case 's':
        case 'del':
        case 'strike':
          this.processFormattedNode(node, richTextElements, { strikethrough: true });
          break;

        case 'code':
          this.processFormattedNode(node, richTextElements, { code: true });
          break;

        case 'a':
          this.processLinkNode(node, richTextElements);
          break;

        case 'span':
          this.processSpanNode(node, richTextElements);
          break;

        case 'ul':
        case 'ol':
          this.processListNode(node, richTextElements, tagName === 'ol');
          break;

        case 'li':
          richTextElements.push({
            type: 'text',
            text: { content: '• ' },
            plain_text: '• ',
          } as NotionRichText);
          this.processChildren(node, richTextElements);
          richTextElements.push({
            type: 'text',
            text: { content: '\n' },
            plain_text: '\n',
          } as NotionRichText);
          break;

        default:
          // For unknown tags, just process children
          this.processChildren(node, richTextElements);
          break;
      }
    } else if (node.childNodes) {
      // Process child nodes for containers
      this.processChildren(node, richTextElements);
    }
  }

  private static processChildren(node: any, richTextElements: NotionRichText[]): void {
    if (node.childNodes) {
      for (const child of node.childNodes) {
        this.processNode(child, richTextElements);
      }
    } else if (node.text) {
      const text = node.text.trim();
      if (text) {
        richTextElements.push({
          type: 'text',
          text: { content: text },
          plain_text: text,
        } as NotionRichText);
      }
    }
  }

  private static processFormattedNode(
    node: any, 
    richTextElements: NotionRichText[], 
    annotations: any
  ): void {
    const content = node.text || node.innerHTML || '';
    const plainText = this.stripHtml(content);
    
    if (plainText.trim()) {
      richTextElements.push({
        type: 'text',
        text: { content: plainText },
        annotations: annotations,
        plain_text: plainText,
      } as NotionRichText);
    }
  }

  private static processLinkNode(node: any, richTextElements: NotionRichText[]): void {
    const href = node.getAttribute('href');
    const content = node.text || node.innerHTML || '';
    const plainText = this.stripHtml(content);
    
    if (plainText.trim()) {
      const richTextElement: NotionRichText = {
        type: 'text',
        text: { 
          content: plainText,
          link: href ? { url: href } : undefined
        },
        plain_text: plainText,
      } as NotionRichText;

      richTextElements.push(richTextElement);
    }
  }

  private static processSpanNode(node: any, richTextElements: NotionRichText[]): void {
    const mention = node.getAttribute('data-mention');
    const content = node.text || node.innerHTML || '';
    const plainText = this.stripHtml(content);
    
    if (mention) {
      // This is a user mention - for now, convert to plain text with @ prefix
      // In the future, this could be enhanced to create Notion user mentions
      richTextElements.push({
        type: 'text',
        text: { content: `@${plainText}` },
        plain_text: `@${plainText}`,
        annotations: { bold: true } // Make mentions stand out
      } as NotionRichText);
    } else {
      // Regular span, just process content
      if (plainText.trim()) {
        richTextElements.push({
          type: 'text',
          text: { content: plainText },
          plain_text: plainText,
        } as NotionRichText);
      }
    }
  }

  private static processListNode(node: any, richTextElements: NotionRichText[], isOrdered: boolean): void {
    // Add list introduction
    richTextElements.push({
      type: 'text',
      text: { content: '\n' },
      plain_text: '\n',
    } as NotionRichText);
    
    this.processChildren(node, richTextElements);
  }

  /**
   * Fallback method to strip HTML and decode entities
   */
  private static stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to newlines
      .replace(/<\/p>/gi, '\n')       // Convert </p> to newlines
      .replace(/<[^>]*>/g, '')        // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')        // Convert &nbsp; to space
      .replace(/&amp;/g, '&')         // Convert &amp; to &
      .replace(/&lt;/g, '<')          // Convert &lt; to <
      .replace(/&gt;/g, '>')          // Convert &gt; to >
      .replace(/&quot;/g, '"')        // Convert &quot; to "
      .replace(/&#39;/g, "'")         // Convert &#39; to '
      .trim();
  }
}