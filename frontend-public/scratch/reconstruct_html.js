const fs = require('fs');
const readline = require('readline');

async function run() {
  const logPath = 'C:/Users/Rubén/.gemini/antigravity/brain/7d3309c5-cbf9-4bb8-a13e-d2a8363368f1/.system_generated/logs/transcript_full.jsonl';
  const fileStream = fs.createReadStream(logPath);
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const edits = {};
  const stepsToFind = [7430, 7440, 7450, 7757, 7819, 7823, 7919, 7931, 7947, 7955, 7967, 8071, 8097];

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (stepsToFind.includes(obj.step_index)) {
        if (obj.tool_calls) {
          for (const tc of obj.tool_calls) {
            const args = tc.args || tc.Arguments || tc.arguments;
            const name = tc.name || tc.ToolName;
            if (args && JSON.stringify(args).toLowerCase().includes('session.component.html')) {
              if (name === 'replace_file_content') {
                edits[obj.step_index] = {
                  target: (args.TargetContent || args.targetContent).replace(/\r\n/g, '\n'),
                  replacement: (args.ReplacementContent || args.replacementContent).replace(/\r\n/g, '\n')
                };
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  // Load the clean html and normalize it to LF
  let html = fs.readFileSync('c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/src/app/pages/session/session.component.html', 'utf8');
  html = html.replace(/\r\n/g, '\n');

  // Apply edits in order
  for (const step of stepsToFind) {
    const edit = edits[step];
    if (!edit) {
      console.log(`Warning: No replace_file_content edit found for Step ${step}`);
      continue;
    }
    
    // Check if target exists in html
    if (!html.includes(edit.target)) {
      console.log(`Error: Target for Step ${step} not found in HTML!`);
      // Print first 100 characters of the target
      console.log('Target snippet:', JSON.stringify(edit.target.slice(0, 100)));
    } else {
      html = html.replace(edit.target, edit.replacement);
      console.log(`Applied Step ${step} successfully.`);
    }
  }

  fs.writeFileSync('c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/src/app/pages/session/session.component.html', html, 'utf8');
  console.log('Reconstruction finished.');
}

run();
