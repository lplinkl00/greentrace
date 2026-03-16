import fs from 'fs';
import { execSync } from 'child_process';
const out = execSync('bun run scripts/generate-invite.ts').toString();
const match = out.match(/Token \(share this\):\s*([a-f0-9]+)/);
if (match) {
    fs.writeFileSync('utf8_token.txt', match[1], 'utf8');
}
