import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, callback: (filepath: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(dirPath);
    });
}

const apiDir = path.join(process.cwd(), 'src/app/api');
let modifiedCount = 0;

walk(apiDir, (filePath) => {
    if (!filePath.endsWith('.ts')) return;
    if (filePath.includes('auth\\login') || filePath.includes('auth/login')) return; // skip
    if (filePath.includes('auth\\session') || filePath.includes('auth/session')) return; // skip

    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('getSessionUser')) return;

    const originalContent = content;

    // 1. Update import
    if (content.includes("import { getSessionUser } from '@/lib/auth'") && !content.includes('withAuth')) {
        content = content.replace(
            "import { getSessionUser } from '@/lib/auth'",
            "import { withAuth } from '@/lib/auth'\nimport { UserRole } from '@prisma/client'"
        );
    }

    // Next.js Route param types: export async function GET(request: Request, { params }: { params: { id: string } })
    // We need to match the signature properly.

    const methods = ['GET', 'POST', 'PATCH', 'DELETE'];

    for (const method of methods) {
        // Match standard export async function METHOD(request: Request, { params }: { params: { id: string } }) { ... }
        const regex1 = new RegExp(`export async function ${method}\\(([^)]+)\\) \\{\\s*const user = await getSessionUser\\(\\)\\s*if \\(!user\\) return new NextResponse\\('Unauthorized', \\{ status: 401 \\}\\)`, 'g');

        // Match export async function METHOD(request: Request) { ... }
        const regex2 = new RegExp(`export async function ${method}\\(request: Request\\) \\{\\s*const user = await getSessionUser\\(\\)\\s*if \\(!user\\) return new NextResponse\\('Unauthorized', \\{ status: 401 \\}\\)`, 'g');

        // A simpler replacement approach: first replace the function signature and the auth check
        // Since our withAuth provides (request, context, user)
        content = content.replace(regex1, `export const ${method} = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async ($1, user) => {`);
        content = content.replace(regex2, `export const ${method} = withAuth([UserRole.SUPER_ADMIN, UserRole.AGGREGATOR_MANAGER, UserRole.MILL_MANAGER, UserRole.MILL_STAFF, UserRole.AUDITOR], async (request: Request, context: any, user) => {`);
    }

    // Quick hack to close the wrapper since we opened a parenthesis `withAuth(..., async (...) => {`
    if (content !== originalContent) {
        content = content.replace(/}\n$/m, '})\n')
            .replace(/}\n\nexport/g, '})\n\nexport');

        fs.writeFileSync(filePath, content);
        modifiedCount++;
        console.log(`Updated ${filePath}`);
    }
});

console.log(`Updated ${modifiedCount} files.`);
