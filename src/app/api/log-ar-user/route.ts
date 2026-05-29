import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const { name } = await request.json();

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const csvPath = path.join(process.cwd(), 'public', 'arusers.csv');
        const timestamp = new Date().toISOString();
        const sanitized = name.trim().replace(/"/g, '""');
        const line = `"${sanitized}","${timestamp}"\n`;

        // Create with header if file doesn't exist
        if (!fs.existsSync(csvPath)) {
            fs.writeFileSync(csvPath, 'name,timestamp\n', 'utf8');
        }

        fs.appendFileSync(csvPath, line, 'utf8');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error writing to arusers.csv:', error);
        return NextResponse.json({ error: 'Failed to save user' }, { status: 500 });
    }
}