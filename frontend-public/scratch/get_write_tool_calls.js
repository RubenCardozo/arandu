const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:/Users/Rubén/.gemini/antigravity/brain/7d3309c5-cbf9-4bb8-a13e-d2a8363368f1/.system_generated/logs/transcript_full.jsonl');
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          const args = tc.args || tc.Arguments || tc.arguments;
          const name = tc.name || tc.ToolName;
          if (args && JSON.stringify(args).toLowerCase().includes('session.component.html')) {
            console.log(`[Line ${lineNum}] Step ${obj.step_index}: ${name}`);
            if (name === 'replace_file_content' || name === 'write_to_file') {
              console.log('Args:', JSON.stringify(args, null, 2));
              console.log('==================================================');
            }
          }
        }
      }
    } catch (e) {}
  }
}

run();
