import "dotenv/config"
import { connectDB, disconnectDB } from "../db/index.js"

const redact = (uri) => uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@")

const uris = Object.entries(process.env)
    .filter(([key]) => /^MONGODB_URI_\d+(_LONG)?$/.test(key))
    .sort(([a], [b]) => a.localeCompare(b))

if (uris.length === 0) {
    console.error("No MONGODB_URI_* entries found in .env")
    process.exit(1)
}

const results = []

for (const [name, uri] of uris) {
    process.stdout.write(`[${name}] ${redact(uri)} ... `)
    if (uri.includes("<db_password>")) {
        console.log("SKIP (password placeholder not replaced)")
        results.push({ name, status: "skipped" })
        continue
    }
    try {
        await connectDB(uri, { timeoutMs: 10000 })
        console.log("OK")
        results.push({ name, status: "ok" })
    } catch (err) {
        console.log(`FAIL — ${err.message}`)
        results.push({ name, status: "fail", error: err.message })
    } finally {
        await disconnectDB().catch(() => {})
    }
}

const ok = results.filter((r) => r.status === "ok").length
const fail = results.filter((r) => r.status === "fail").length
const skip = results.filter((r) => r.status === "skipped").length
console.log(`\nSummary: ${ok} ok, ${fail} fail, ${skip} skipped`)
process.exit(fail > 0 ? 1 : 0)
