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
    if (line.toLowerCase().includes('session.component.html')) {
      console.log(`Line ${lineNum} mentions session.component.html`);
      // Print first 200 chars of the line
      console.log(line.slice(0, 300));
      console.log('---');
    }
  }
}

run();
