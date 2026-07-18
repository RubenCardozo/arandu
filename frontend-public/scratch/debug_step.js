const fs = require('fs');
const logPath = 'C:/Users/Rubén/.gemini/antigravity/brain/7d3309c5-cbf9-4bb8-a13e-d2a8363368f1/.system_generated/logs/transcript_full.jsonl';
const log = fs.readFileSync(logPath, 'utf8').split('\n');

for (const line of log) {
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 7947) {
      const tc = obj.tool_calls[0];
      const args = tc.args || tc.Arguments || tc.arguments;
      fs.writeFileSync('c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/scratch/7947_target.html', args.TargetContent.replace(/\r\n/g, '\n'), 'utf8');
      fs.writeFileSync('c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/scratch/7947_replacement.html', args.ReplacementContent.replace(/\r\n/g, '\n'), 'utf8');
      console.log('Saved 7947 target and replacement files!');
      break;
    }
  } catch (e) {}
}
