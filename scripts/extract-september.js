const fs = require('fs');
const readline = require('readline');

async function extract() {
  const fileStream = fs.createReadStream('C:\\Users\\PC\\.gemini\\antigravity\\brain\\c98a0142-50fb-470e-888f-14aa0669e606\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.includes('USER_INPUT') && line.includes('BẢNG CHI TIẾT CHẤM CÔNG')) {
      const obj = JSON.parse(line);
      const content = obj.content;
      if (!content) continue;
      const csvStart = content.indexOf('BẢNG CHI TIẾT CHẤM CÔNG');
      if (csvStart !== -1) {
        const csvContent = content.slice(csvStart).replace(/<\/USER_REQUEST>[\s\S]*$/, '').trim();
        fs.writeFileSync('scripts/september_raw.csv', csvContent, 'utf-8');
        console.log('Successfully wrote scripts/september_raw.csv, length:', csvContent.length);
        return;
      }
    }
  }
  console.log('Step 3328 not found');
}

extract();
