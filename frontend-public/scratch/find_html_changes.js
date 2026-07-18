const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:/Users/Rubén/.gemini/antigravity/brain/7d3309c5-cbf9-4bb8-a13e-d2a8363368f1/.system_generated/logs/transcript_full.jsonl');
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let stepCount = 0;
  for await (const line of rl) {
    stepCount++;
    try {
      const obj = JSON.parse(line);
      // Look for write_to_file or replace_file_content calls targetting session.component.html
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          const args = tc.arguments || tc.Arguments;
          if (args && JSON.stringify(args).includes('session.component.html')) {
            console.log(`Step ${stepCount} (Index ${obj.step_index}): Found tool call: ${tc.name || tc.ToolName}`);
            // Print the arguments
            console.log(JSON.stringify(args, null, 2));
            console.log('----------------------------------------------------');
          }
        }
      }
    } catch (e) {
      // ignore parsing errors
    }
  }
}

run();
