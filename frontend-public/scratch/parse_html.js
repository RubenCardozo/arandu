const fs = require('fs');

const html = fs.readFileSync('c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/src/app/pages/session/session.component.html', 'utf8');

// A very simple tag parser to find open/close tag mismatches
let pos = 0;
const stack = [];
const lines = html.split('\n');

for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
  const line = lines[lineNum - 1];
  let match;
  // Match HTML tags
  const tagRegex = /<(\/?[a-zA-Z0-9:-]+)([^>]*?)>/g;
  while ((match = tagRegex.exec(line)) !== null) {
    const tagName = match[1];
    const isClosing = tagName.startsWith('/');
    const cleanTagName = isClosing ? tagName.slice(1) : tagName;
    
    // Ignore self-closing tags, comments, angular templates, etc.
    if (match[2].endsWith('/') || ['img', 'input', 'br', 'hr', 'link', 'meta'].includes(cleanTagName.toLowerCase())) {
      continue;
    }
    
    if (isClosing) {
      if (stack.length === 0) {
        console.log(`Line ${lineNum}: Unexpected closing tag </${cleanTagName}>`);
      } else {
        const top = stack.pop();
        if (top.name !== cleanTagName) {
          console.log(`Line ${lineNum}: Mismatched closing tag </${cleanTagName}>, expected </${top.name}> (opened on Line ${top.line})`);
          // Put it back to keep tracking if possible
          stack.push(top);
        }
      }
    } else {
      stack.push({ name: cleanTagName, line: lineNum });
    }
  }
}

console.log('Unclosed tags at end of file:', stack);
