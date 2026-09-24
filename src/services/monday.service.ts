import { MondayApiResponse, MondayItem, MondayUpdate } from '../types';

export class MondayService {
  private readonly apiUrl = 'https://api.monday.com/v2';
  private readonly apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async makeRequest<T>(query: string, variables?: any): Promise<MondayApiResponse<T>> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Monday API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors && result.errors.length > 0) {
      throw new Error(`Monday API error: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    return result;
  }

  async getItemsWithComments(boardId?: string, itemIds?: string[]): Promise<MondayItem[]> {
    let query = `
      query GetItemsWithComments($boardIds: [ID!], $itemIds: [ID!]) {
        items(board_ids: $boardIds, ids: $itemIds, limit: 100) {
          id
          name
          updates(limit: 100) {
            id
            body
            created_at
            creator {
              id
              name
              email
            }
            replies(limit: 50) {
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
    `;

    const variables: any = {};
    if (boardId) {
      variables.boardIds = [boardId];
    }
    if (itemIds) {
      variables.itemIds = itemIds;
    }

    const response = await this.makeRequest<{ items: MondayItem[] }>(query, variables);
    return response.data.items;
  }

  async getItemComments(itemId: string): Promise<MondayUpdate[]> {
    const query = `
      query GetItemComments($itemId: ID!) {
        items(ids: [$itemId]) {
          updates(limit: 100) {
            id
            body
            created_at
            creator {
              id
              name
              email
            }
            replies(limit: 50) {
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
    `;

    const response = await this.makeRequest<{ items: MondayItem[] }>(query, { itemId });
    return response.data.items[0]?.updates || [];
  }

  async getBoardItems(boardId: string): Promise<MondayItem[]> {
    const query = `
      query GetBoardItems($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page(limit: 100) {
            items {
              id
              name
              updates(limit: 100) {
                id
                body
                created_at
                creator {
                  id
                  name
                  email
                }
                replies(limit: 50) {
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
        }
      }
    `;

    const response = await this.makeRequest<{ 
      boards: Array<{ 
        items_page: { 
          items: MondayItem[] 
        } 
      }> 
    }>(query, { boardId });
    
    return response.data.boards[0]?.items_page?.items || [];
  }

  /**
   * Test the connection to Monday.com API
   */
  async testConnection(): Promise<boolean> {
    try {
      const query = `
        query {
          me {
            id
            name
          }
        }
      `;
      
      await this.makeRequest<{ me: { id: string; name: string } }>(query);
      return true;
    } catch (error) {
      console.error('Monday API connection test failed:', error);
      return false;
    }
  }
}