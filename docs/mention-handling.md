# User Mention Handling in Monday→Notion Migration

## Overview

When migrating comments from Monday.com to Notion, user mentions require special handling because they reference user IDs that may not exist across both platforms.

## Monday.com Mention Format

Monday.com stores user mentions as HTML spans with metadata:
```html
<span data-mention="monday_user_id_123">@John Doe</span>
```

## Migration Process

### 1. **User Mapping Phase** (Before Comment Migration)
- System attempts to match Monday users to Notion users by email address
- Successful matches are stored in a user mapping table
- Failed matches are logged with warnings

### 2. **Mention Extraction Phase** (During HTML Parsing)
- HTML content is parsed to identify mention spans
- Monday user IDs and display names are extracted
- Mention placeholders are inserted in the rich text

### 3. **Mention Resolution Phase** (After User Mapping)
- Each mention placeholder is checked against the user mapping table
- Two possible outcomes per mention:

## Mention Resolution Outcomes

### ✅ **User Found in Notion**
**Condition**: Monday user has matching email in Notion workspace

**Result**: Creates a proper interactive Notion mention
```json
{
  "type": "mention",
  "mention": {
    "type": "user", 
    "user": { "id": "notion_user_uuid" }
  },
  "plain_text": "@John Doe"
}
```

**Visual**: Shows as `@John Doe` (clickable, links to user profile)

### ⚠️ **User NOT Found in Notion** 
**Condition**: Monday user email doesn't match any Notion workspace member

**Result**: Creates highlighted text with visual indication
```json
{
  "type": "text",
  "text": { "content": "@John Doe" },
  "plain_text": "@John Doe",
  "annotations": { 
    "bold": true, 
    "color": "orange" 
  }
}
```

**Visual**: Shows as **@John Doe** (bold orange text, not clickable)

## Common Scenarios

### Scenario 1: Company Migration
- **Context**: Migrating team workspace where most users exist in both platforms
- **Expected**: 80-90% of mentions become interactive Notion mentions
- **Missing users**: Contractors, former employees, external collaborators

### Scenario 2: Partial Migration  
- **Context**: Moving select projects to Notion, not entire team
- **Expected**: 30-60% of mentions become interactive
- **Missing users**: Team members not yet invited to Notion workspace

### Scenario 3: Cross-Organization Migration
- **Context**: Migrating from one org's Monday to another org's Notion
- **Expected**: 10-30% of mentions become interactive
- **Missing users**: Most users from different organization domains

## Best Practices

### Before Migration
1. **Audit Users**: Export user lists from both Monday and Notion
2. **Invite Missing Users**: Add key mentioned users to Notion workspace
3. **Email Verification**: Ensure users have same email addresses in both platforms

### During Migration
1. **Review Logs**: Check mention resolution warnings
2. **Test Sample**: Run dry-run migration on representative content
3. **Document Mappings**: Save user mapping results for reference

### After Migration
1. **Update Orange Mentions**: Manually review bold orange @mentions
2. **Invite Remaining Users**: Add frequently mentioned missing users to Notion
3. **Re-run Selective**: Re-migrate specific comments after adding users

## Technical Notes

- **Email Matching**: Case-insensitive comparison by email address
- **Fallback Graceful**: Missing users don't break comment migration
- **Logging Detailed**: All mention resolutions logged with user context
- **Reversible**: Original Monday data preserved, migration can be re-run

## Example Migration Log

```
✅ Resolving mention: @John Doe → Notion user abc-123-def
✅ Resolving mention: @Jane Smith → Notion user xyz-789-uvw  
⚠️ User @Bob Wilson (Monday ID: user456) not found in Notion - converting to highlighted text
⚠️ User @external@contractor.com (Monday ID: user789) not found in Notion - converting to highlighted text
```

## FAQ

**Q: Can I re-run migration after adding more users to Notion?**
A: Yes, the system can re-process comments to resolve previously missing mentions.

**Q: What if a user has different emails in Monday vs Notion?**
A: Create manual user mapping entries or update email addresses to match before migration.

**Q: Do orange highlighted mentions break anything?**
A: No, they appear as regular formatted text and don't affect Notion functionality.

**Q: Can I convert orange mentions to real mentions later?**
A: Yes, by inviting the user to Notion and re-running the comment migration for affected pages.