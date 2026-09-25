import { HtmlToNotionConverter } from '../src/utils/html-converter';

// Test various Monday.com HTML formats that would typically be found in comments
const testCases = [
  // Basic formatting
  '<strong>Bold text</strong> and <em>italic text</em>',
  
  // Mixed formatting
  '<p>This is a <strong>bold</strong> word and this is <em>italic</em> and <u>underlined</u>.</p>',
  
  // Links
  '<p>Check out <a href="https://example.com">this link</a> for more info.</p>',
  
  // User mentions (typical Monday.com format)
  '<p>Hey <span data-mention="user123">@John Doe</span>, can you review this?</p>',
  
  // Lists
  '<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>',
  
  // Complex mixed content
  '<p>Here\'s the <strong>summary</strong>:</p><ul><li><em>Issue</em>: The API is <s>broken</s> slow</li><li><strong>Fix</strong>: Update to <code>v2.1</code></li><li><u>Timeline</u>: By <a href="https://calendar.com">Friday</a></li></ul><p>CC: <span data-mention="user456">@Jane Smith</span></p>',
  
  // Code and strikethrough
  '<p>Use the <code>npm install</code> command, not the <s>old method</s>.</p>',
  
  // Line breaks and paragraphs
  '<p>First paragraph.</p><br><p>Second paragraph after a break.</p>',
];

console.log('🧪 HTML to Notion Rich Text Conversion Tests\n');
console.log('=' .repeat(60));

testCases.forEach((html, index) => {
  console.log(`\n📝 Test Case ${index + 1}:`);
  console.log(`HTML: ${html}`);
  console.log('---');
  
  try {
    const richText = HtmlToNotionConverter.convertHtml(html);
    console.log('Notion Rich Text:');
    richText.forEach((element, i) => {
      const annotations = element.annotations ? 
        Object.entries(element.annotations)
          .filter(([_, value]) => value)
          .map(([key, _]) => key)
          .join(', ') : 'none';
      
      console.log(`  [${i}] "${element.plain_text}" (${element.type}${annotations !== 'none' ? `, ${annotations}` : ''}${element.text?.link ? `, link: ${element.text.link.url}` : ''})`);
    });
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
  }
  
  console.log('=' .repeat(60));
});

console.log('\n✅ Tests completed!');