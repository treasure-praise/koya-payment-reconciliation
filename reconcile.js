// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Amounts arrive either as numbers or as strings with thousands separators ("4,804.15").
function parseAmount(amount) {
  if (typeof amount === "number") return amount;
  return Number(String(amount).replace(/,/g, "").trim());
}

// Keep only the latest attempt for each txn_id. The export isn't in time order,
// so compare timestamps rather than relying on line order.
const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split(/\r?\n/);
for (const line of lines) {
  if (line.trim().length === 0) continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // unreadable line
  }
  if (!event || typeof event !== "object" || !event.txn_id) continue;

  const ts = Date.parse(event.ts);
  const prev = latest.get(event.txn_id);
  if (!prev || ts > prev.ts) {
    latest.set(event.txn_id, { ts, status: event.status, amount: event.amount });
  }
}

let total = 0;
let count = 0;
for (const { status, amount } of latest.values()) {
  if (status === "success") {
    total += parseAmount(amount);
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
