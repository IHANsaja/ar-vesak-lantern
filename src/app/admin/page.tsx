import React from "react";
import fs from "fs";
import path from "path";
import Link from "next/link";

// Force Next.js to run this server component dynamically on every request
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface UserLog {
    name: string;
    timestamp: string;
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip the second quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function readUsersFromCSV(): UserLog[] {
    const csvPath = path.join(process.cwd(), "public", "arusers.csv");
    if (!fs.existsSync(csvPath)) {
        return [];
    }
    try {
        const fileContent = fs.readFileSync(csvPath, "utf8");
        const lines = fileContent.split("\n");
        const users: UserLog[] = [];
        
        // Dynamically detect header row presence (case-insensitive and quote-independent)
        let startIdx = 0;
        if (lines.length > 0) {
            const firstLineClean = lines[0].trim().replace(/["']/g, "").toLowerCase();
            if (firstLineClean === "name,timestamp") {
                startIdx = 1;
            }
        }

        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = parseCSVLine(line);
            if (parts.length >= 2) {
                users.push({
                    name: parts[0].trim(),
                    timestamp: parts[1].trim(),
                });
            }
        }
        // Sort newest first
        return users.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
        console.error("Error reading arusers.csv:", err);
        return [];
    }
}

function getRelativeTime(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    if (isNaN(past.getTime())) return "Unknown time";

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

function formatDateTime(timestamp: string): string {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
}

export default async function AdminPage() {
    const users = readUsersFromCSV();

    // Stats calculations
    const totalViews = users.length;
    
    // Unique user count
    const uniqueNames = new Set(users.map(u => u.name.toLowerCase()));
    const uniqueCount = uniqueNames.size;

    // Active in last 24h
    const now = new Date().getTime();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const activeLast24h = users.filter(u => new Date(u.timestamp).getTime() > oneDayAgo).length;

    return (
        <main className="min-h-screen bg-[#0A090E] text-[#F0EBE1] font-sans antialiased relative overflow-hidden flex flex-col items-center py-10 px-4">
            {/* Background design elements matching AR scene */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(201,168,76,0.12)_0%,transparent_70%)] pointer-events-none z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(30,20,50,0.4)_0%,transparent_80%)] pointer-events-none z-0" />

            {/* Glowing background circles */}
            <div className="absolute top-[20%] left-[10%] w-72 h-72 rounded-full bg-[rgba(201,168,76,0.02)] blur-3xl pointer-events-none z-0" />
            <div className="absolute bottom-[20%] right-[10%] w-80 h-80 rounded-full bg-[rgba(160,120,48,0.03)] blur-3xl pointer-events-none z-0" />

            <div className="w-full max-w-5xl z-10 flex flex-col gap-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(201,168,76,0.15)] pb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C9A84C] mb-2">
                            <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
                            Admin Console
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight text-[#F0EBE1] mb-1">
                            AR වෙසක් පහන් කූඩුව
                        </h1>
                        <p className="text-sm text-[rgba(240,235,225,0.6)]">
                            Real-time tracking of users who viewed the augmented reality lantern.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link 
                            href="/" 
                            className="flex items-center gap-2 bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.07)] text-sm font-medium border border-[rgba(255,255,255,0.08)] hover:border-[rgba(201,168,76,0.3)] px-5 py-2.5 rounded-xl transition duration-200"
                        >
                            ← Back to App
                        </Link>
                        <a 
                            href="/admin" 
                            className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] hover:from-[#E8C96A] hover:to-[#C9A84C] text-[#0A0800] text-sm font-bold px-5 py-2.5 rounded-xl shadow-[0_4px_15px_rgba(201,168,76,0.25)] transition duration-200"
                        >
                            ↻ Refresh Data
                        </a>
                    </div>
                </div>

                {/* Stats Dashboard */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Stat card 1 */}
                    <div className="bg-[rgba(17,16,24,0.6)] border border-[rgba(201,168,76,0.15)] rounded-2xl p-5 backdrop-blur-xl flex flex-col gap-1 shadow-lg">
                        <span className="text-xs text-[rgba(240,235,225,0.5)] font-semibold uppercase tracking-wider">Total Views</span>
                        <div className="text-3xl font-extrabold text-[#E8C96A] mt-1 flex items-baseline gap-1">
                            {totalViews}
                            <span className="text-xs text-[rgba(240,235,225,0.4)] font-normal">scans</span>
                        </div>
                        <p className="text-xs text-[rgba(240,235,225,0.45)] mt-2">Total hits in public/arusers.csv</p>
                    </div>

                    {/* Stat card 2 */}
                    <div className="bg-[rgba(17,16,24,0.6)] border border-[rgba(201,168,76,0.15)] rounded-2xl p-5 backdrop-blur-xl flex flex-col gap-1 shadow-lg">
                        <span className="text-xs text-[rgba(240,235,225,0.5)] font-semibold uppercase tracking-wider">Unique Users</span>
                        <div className="text-3xl font-extrabold text-[#E8C96A] mt-1 flex items-baseline gap-1">
                            {uniqueCount}
                            <span className="text-xs text-[rgba(240,235,225,0.4)] font-normal">people</span>
                        </div>
                        <p className="text-xs text-[rgba(240,235,225,0.45)] mt-2">Unique names registered</p>
                    </div>

                    {/* Stat card 3 */}
                    <div className="bg-[rgba(17,16,24,0.6)] border border-[rgba(201,168,76,0.15)] rounded-2xl p-5 backdrop-blur-xl flex flex-col gap-1 shadow-lg">
                        <span className="text-xs text-[rgba(240,235,225,0.5)] font-semibold uppercase tracking-wider">Active (24h)</span>
                        <div className="text-3xl font-extrabold text-[#C9A84C] mt-1 flex items-baseline gap-1">
                            {activeLast24h}
                            <span className="text-xs text-[rgba(240,235,225,0.4)] font-normal">views</span>
                        </div>
                        <p className="text-xs text-[rgba(240,235,225,0.45)] mt-2">Users active since yesterday</p>
                    </div>
                </div>

                {/* Main Table Card */}
                <div className="bg-[rgba(17,16,24,0.7)] border border-[rgba(201,168,76,0.15)] rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl flex flex-col">
                    <div className="border-b border-[rgba(201,168,76,0.12)] px-6 py-5 flex items-center justify-between">
                        <h2 className="text-lg font-serif font-semibold text-[#F0EBE1] flex items-center gap-2">
                            <span>🪔</span> User Session Logs
                        </h2>
                        <span className="text-xs bg-[rgba(255,255,255,0.04)] text-[rgba(240,235,225,0.6)] px-3 py-1 rounded-full border border-[rgba(255,255,255,0.06)]">
                            Showed {users.length} logs
                        </span>
                    </div>

                    {users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                            <span className="text-4xl mb-4">🕯️</span>
                            <h3 className="text-base font-semibold text-[rgba(240,235,225,0.8)] mb-1">No scan logs found</h3>
                            <p className="text-xs text-[rgba(240,235,225,0.45)] max-w-xs">
                                When users enter their name and start the AR scene, their entries will show up here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[rgba(201,168,76,0.1)] text-xs font-semibold text-[rgba(240,235,225,0.5)] uppercase tracking-wider bg-[rgba(255,255,255,0.01)]">
                                        <th className="py-4 px-6 w-16 text-center">No</th>
                                        <th className="py-4 px-6">User Name</th>
                                        <th className="py-4 px-6">Timestamp</th>
                                        <th className="py-4 px-6 text-right">Time Ago</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[rgba(201,168,76,0.06)]">
                                    {users.map((user, idx) => (
                                        <tr 
                                            key={user.timestamp + idx} 
                                            className="hover:bg-[rgba(201,168,76,0.02)] transition duration-150"
                                        >
                                            <td className="py-4 px-6 text-center text-xs font-mono text-[rgba(240,235,225,0.4)]">
                                                {users.length - idx}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="inline-flex items-center bg-[rgba(201,168,76,0.05)] border border-[rgba(201,168,76,0.15)] rounded-lg px-3 py-1.5 text-sm font-medium text-[#E8C96A] max-w-[280px] truncate">
                                                    👤 {user.name}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-xs text-[rgba(240,235,225,0.7)] font-mono">
                                                {formatDateTime(user.timestamp)}
                                            </td>
                                            <td className="py-4 px-6 text-right text-xs font-semibold text-[#C9A84C]">
                                                {getRelativeTime(user.timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer credit */}
                <div className="text-center text-xs text-[rgba(240,235,225,0.35)] mt-4">
                    AR Vesak Lantern Platform · developed by Amandi and Ihan
                </div>
            </div>
        </main>
    );
}
