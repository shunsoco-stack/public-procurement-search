process.argv.push("--screenshots");
if (!process.argv.some(value => /^https?:\/\//.test(value))) process.argv.push("https://public-procurement-search.vercel.app");
await import("./verify-app.mjs");
