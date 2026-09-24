// Monday.com API Types
export interface MondayUser {
  id: string;
  name: string;
  email: string;
}

export interface MondayReply {
  id: string;
  body: string;
  created_at: string;
  creator: MondayUser;
}

export interface MondayUpdate {
  id: string;
  body: string;
  created_at: string;
  creator: MondayUser;
  replies?: MondayReply[];
}

export interface MondayItem {
  id: string;
  name: string;
  updates: MondayUpdate[];
}

export interface MondayApiResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code: string;
    };
  }>;
}

// Notion API Types
export interface NotionUser {
  object: 'user';
  id: string;
  name?: string;
  avatar_url?: string;
  type: 'person' | 'bot';
  person?: {
    email?: string;
  };
}

export interface NotionRichText {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: {
      url: string;
    };
  };
  mention?: any;
  equation?: {
    expression: string;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
  plain_text: string;
  href?: string;
}

export interface NotionComment {
  object: 'comment';
  id: string;
  parent: {
    type: 'page_id' | 'block_id';
    page_id?: string;
    block_id?: string;
  };
  discussion_id: string;
  created_time: string;
  last_edited_time: string;
  created_by: {
    object: 'user';
    id: string;
  };
  last_edited_by: {
    object: 'user';
    id: string;
  };
  rich_text: NotionRichText[];
}

export interface NotionCreateCommentRequest {
  parent: {
    page_id?: string;
    block_id?: string;
  };
  discussion_id?: string;
  rich_text: NotionRichText[];
}

// Translation Types
export interface UserMapping {
  mondayId: string;
  notionId: string;
  email?: string;
  name?: string;
}

export interface CommentMapping {
  mondayUpdateId: string;
  mondayReplyId?: string; // For nested replies
  notionCommentId: string;
  discussionId: string;
  parentId: string; // Notion page/block ID
}

export interface MigrationConfig {
  monday: {
    apiToken: string;
    boardId?: string;
    itemIds?: string[];
  };
  notion: {
    apiToken: string;
    databaseId?: string;
    pageIds?: string[];
  };
  options: {
    dryRun?: boolean;
    batchSize?: number;
    preserveThreading?: boolean;
    skipExisting?: boolean;
  };
}

export interface MigrationResult {
  success: boolean;
  processed: number;
  created: number;
  skipped: number;
  errors: Array<{
    message: string;
    item?: string;
    update?: string;
  }>;
}