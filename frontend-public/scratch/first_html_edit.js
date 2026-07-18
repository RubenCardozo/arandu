const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:/Users/Rubén/.gemini/antigravity/brain/7d3309c5-cbf9-4bb8-a13e-d2a8363368f1/.system_generated/logs/transcript_full.jsonl');
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNum = 0;
  let count = 0;
  for await (const line of rl) {
    lineNum++;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          const args = tc.args || tc.Arguments || tc.arguments;
          const name = tc.name || tc.ToolName;
          if (args && JSON.stringify(args).toLowerCase().includes('session.component.html')) {
            if (name === 'replace_file_content' || name === 'write_to_file') {
              count++;
              if (count <= 10) {
                console.log(`[Edit #${count}] [Line ${lineNum}] Step ${obj.step_index}: ${name}`);
                console.log('TargetFile:', args.TargetFile || args.targetFile);
                if (args.TargetContent) {
                  console.log('TargetContent:', JSON.stringify(args.TargetContent));
                  console.log('ReplacementContent:', JSON.stringify(args.ReplacementContent));
                } else if (args.CodeContent) {
                  console.log('CodeContent length:', args.CodeContent.length);
                }
                console.log('--------------------------------------------------');
              }
            }
          }
        }
      }
    } catch (e) {}
  }
}

run();
