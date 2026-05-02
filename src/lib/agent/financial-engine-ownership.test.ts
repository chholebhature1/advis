import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);
const IGNORE_DIRECTORIES = new Set(["node_modules", ".git", ".next", "coverage", "dist", "build"]);

type SymbolRule = {
  name: string;
  expectedFile: string;
  definitionPattern: RegExp;
};

const SYMBOL_RULES: SymbolRule[] = [
  {
    name: "generateFinancialSnapshot",
    expectedFile: "src/lib/agent/financial-engine.ts",
    definitionPattern: /^\s*(?:export\s+)?(?:async\s+)?function\s+generateFinancialSnapshot\b|^\s*(?:export\s+)?(?:const|let|var)\s+generateFinancialSnapshot\s*=/m,
  },
  {
    name: "calculateFeasibility",
    expectedFile: "src/lib/agent/financial-engine.ts",
    definitionPattern: /^\s*(?:export\s+)?(?:async\s+)?function\s+calculateFeasibility\b|^\s*(?:export\s+)?(?:const|let|var)\s+calculateFeasibility\s*=/m,
  },
  {
    name: "calculateSmartAllocation",
    expectedFile: "src/lib/agent/financial-engine.ts",
    definitionPattern: /^\s*(?:export\s+)?(?:async\s+)?function\s+calculateSmartAllocation\b|^\s*(?:export\s+)?(?:const|let|var)\s+calculateSmartAllocation\s*=/m,
  },
];

function collectSourceFiles(rootDir: string, results: string[] = []): string[] {
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRECTORIES.has(entry.name)) {
        continue;
      }

      collectSourceFiles(join(rootDir, entry.name), results);
      continue;
    }

    if (CODE_EXTENSIONS.has(extname(entry.name))) {
      results.push(join(rootDir, entry.name));
    }
  }

  return results;
}

function filesDefining(pattern: RegExp): string[] {
  return collectSourceFiles(repoRoot).filter((filePath) => pattern.test(readFileSync(filePath, "utf8")));
}

function normalizePath(filePath: string): string {
  return relative(repoRoot, filePath).replace(/\\/g, "/");
}

describe("financial engine ownership", () => {
  for (const rule of SYMBOL_RULES) {
    it(`keeps ${rule.name} defined in only one file`, () => {
      const matchedFiles = filesDefining(rule.definitionPattern).map(normalizePath);
      expect(matchedFiles).toEqual([rule.expectedFile]);
    });
  }
});