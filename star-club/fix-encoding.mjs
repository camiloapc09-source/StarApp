#!/usr/bin/env node
// fix-encoding.mjs - Fixes double-UTF-8 encoding corruption in source files
// When a UTF-8 file is read as Windows-1252 and re-written as UTF-8,
// each original byte X (0x80-0xFF) becomes two UTF-8 bytes.
// Fix: read file as UTF-8, convert each char back to its byte value (Latin-1),
// then interpret the resulting byte array as UTF-8.

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", ".git", "dist"]);

function isDoubleEncoded(str) {
  // Check for characteristic patterns of latin1-read UTF-8 sequences
  return /[\xC0-\xC5][\x80-\xBF]/.test(str) || /\xC2[\x80-\xBF]/.test(str);
}

function tryFix(content) {
  // Convert the string (which was incorrectly decoded as Latin-1 then re-encoded as UTF-8)
  // back to the original UTF-8 by:
  // 1. Encode current string as Latin-1 byte array
  // 2. Decode that byte array as UTF-8
  try {
    const bytes = Buffer.from(content, "latin1");
    // Try to decode as UTF-8 - if it works cleanly, the result is the fixed version
    const fixed = bytes.toString("utf8");
    return fixed;
  } catch {
    return content;
  }
}

let fixedCount = 0;
let skippedCount = 0;

function processFile(filePath) {
  try {
    // Read raw bytes, then decode as latin1 (1:1 byte to char mapping)
    const rawBytes = readFileSync(filePath);
    // Remove BOM if present
    const startIdx = (rawBytes[0] === 0xEF && rawBytes[1] === 0xBB && rawBytes[2] === 0xBF) ? 3 : 0;
    const bytes = startIdx > 0 ? rawBytes.slice(startIdx) : rawBytes;
    
    // First attempt: decode as UTF-8 (how it's stored on disk)
    const asUtf8 = bytes.toString("utf8");
    
    // Check if it has the double-encoding signature
    // Double-encoded chars pattern: original UTF-8 bytes, read as latin1, re-encoded as UTF-8
    // means e.g. U+00C3 U+00A9 (Ã + ©) on disk, which was originally é (U+00E9)
    
    // Detect: convert utf8 string back to latin1 bytes and try to decode as utf8
    const asLatin1Bytes = Buffer.from(asUtf8, "latin1");
    
    // Check if decoding as utf8 gives different (cleaner) result
    let asRedecodedUtf8;
    try {
      asRedecodedUtf8 = asLatin1Bytes.toString("utf8");
    } catch {
      skippedCount++;
      return;
    }
    
    // If redecodedUtf8 differs and has fewer replacement chars, use it
    const originalReplacements = (asUtf8.match(/\uFFFD/g) || []).length;
    const redecodedReplacements = (asRedecodedUtf8.match(/\uFFFD/g) || []).length;
    
    // Also check: does original contain sequences like Ã+ (mojibake pattern)?
    const hasMojibake = /[ÃÂ][©¡¿°¢£¤¥¦§¨ªàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(asUtf8);
    
    if (hasMojibake && redecodedReplacements <= originalReplacements) {
      writeFileSync(filePath, asRedecodedUtf8, "utf8");
      fixedCount++;
      console.log(`Fixed: ${filePath}`);
    } else {
      skippedCount++;
    }
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
  }
}

function walkDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walkDir(join(dir, entry.name));
      }
    } else if (EXTENSIONS.has(extname(entry.name))) {
      processFile(join(dir, entry.name));
    }
  }
}

console.log("Scanning for double-encoded UTF-8 files...\n");
walkDir("./src");
walkDir("./prisma");
console.log(`\nDone. Fixed: ${fixedCount}, Skipped: ${skippedCount}`);
