import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * For non-trainer text pointers we return an array of final text pointer strings.
 * For trainer text pointers we return an object with three parts.
 */
export type ExtractedText =
  | string[]
  | {
      type: "trainer";
      textBefore: string;
      textEnd: string;
      textAfter: string;
    };

/**
 * ScriptTextData maps a text ID (e.g. TEXT_CERULEANGYM_COOLTRAINER_F)
 * to an extracted text value.
 */
export interface ScriptTextData {
  [textID: string]: ExtractedText;
}

/* ────────────────────────────────────────────────────────── */
/* 1. Parse Pointer Definitions from _TextPointers Sections   */
/* ────────────────────────────────────────────────────────── */
/**
 * Processes any section whose header ends with "_TextPointers" (e.g.
 * CeruleanGym_TextPointers, Route1_TextPointers, etc.) and extracts lines of the form:
 *
 *   dw_const <pointerName>, <textID>
 */
function parseTextPointerDefinitions(asmContent: string): { pointerName: string; textID: string }[] {
  const pointerDefs: { pointerName: string; textID: string }[] = [];
  const lines = asmContent.split(/\r?\n/);
  let currentSection: string | null = null;
  const sectionHeaderRegex = /^(\S+):/;
  const pointerRegex = /dw_const\s+(\S+),\s+(\S+)/;

  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(sectionHeaderRegex);
    if (headerMatch) {
      currentSection = headerMatch[1];
      continue;
    }
    if (currentSection && currentSection.endsWith("_TextPointers")) {
      const ptrMatch = trimmed.match(pointerRegex);
      if (ptrMatch) {
        pointerDefs.push({
          pointerName: ptrMatch[1],
          textID: ptrMatch[2],
        });
      }
    }
  }
  return pointerDefs;
}

/* ────────────────────────────────────────────────────────── */
/* 2. Parse Trainer Macro Invocations                        */
/* ────────────────────────────────────────────────────────── */
/**
 * Searches for trainer macro invocations (lines starting with "trainer")
 * and returns an array (in order) of objects containing its three pointer arguments.
 */
function parseTrainerMacros(asmContent: string): { before: string; end: string; after: string }[] {
  const trainers: { before: string; end: string; after: string }[] = [];
  const regex = /trainer\s+\S+,\s*\d+,\s*(\S+),\s*(\S+),\s*(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(asmContent)) !== null) {
    trainers.push({
      before: match[1],
      end: match[2],
      after: match[3],
    });
  }
  return trainers;
}

/* ────────────────────────────────────────────────────────── */
/* 3. Global Resolution: Find a text_far Command             */
/* ────────────────────────────────────────────────────────── */
/**
 * Searches the entire ASM for a global label definition (e.g. "Label:")
 * and returns the argument passed to its text_far command.
 */
function resolveTextPointer(asmContent: string, pointerLabel: string): string | null {
  const lines = asmContent.split(/\r?\n/);
  const labelRegex = new RegExp("^" + pointerLabel + "[:]+\\s*$", "i");
  for (let i = 0; i < lines.length; i++) {
    if (labelRegex.test(lines[i].trim())) {
      for (let j = i + 1; j < lines.length; j++) {
        const subline = lines[j].trim();
        const m = subline.match(/^text_far\s+(\S+)/i);
        if (m) {
          return m[1];
        }
        if (/^[A-Za-z0-9_\.]+:/.test(subline)) break;
      }
      break;
    }
  }
  return null;
}

/* ────────────────────────────────────────────────────────── */
/* 4. Get the text_asm Block for a Pointer Label              */
/* ────────────────────────────────────────────────────────── */
/**
 * Finds the text_asm block that starts at the given pointer label (global or local)
 * and returns its text as a string.
 */
function getTextAsmBlock(asmContent: string, pointerLabel: string): string {
  const lines = asmContent.split(/\r?\n/);
  // Escape special regex characters in the label.
  const escapedLabel = pointerLabel.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  // If the label is local (starts with a dot), allow colon to be optional.
  const colonPattern = pointerLabel.startsWith(".") ? "[:]{0,2}" : "[:]+";
  const blockStartRegex = new RegExp("^" + escapedLabel + colonPattern + "\\s*$", "i");
  let startIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (blockStartRegex.test(lines[i].trim())) {
      startIndex = i;
      break;
    }
  }
  if (startIndex === -1) return "";

  // End at the next global label (that doesn't start with a dot)
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^[A-Za-z0-9_]/.test(trimmed) && /^[A-Za-z0-9_]+:/.test(trimmed)) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(startIndex, endIndex).join("\n");
}

/* ────────────────────────────────────────────────────────── */
/* 5. Follow a text_asm Block (Non-Trainer) via DFS           */
/* ────────────────────────────────────────────────────────── */
/**
 * Recursively traverses a text_asm block starting at a given label,
 * following farcalls, conditional jumps (jr), unconditional jumps (jp),
 * and patterns like "ld hl, <label>" immediately followed by "call PrintText".
 * Each branch uses a cloned visited set so that it is fully explored.
 */
function followTextBlock(asmContent: string, label: string, visited: Set<string> = new Set()): string[] {
  if (visited.has(label)) return [];

  const branchVisited = new Set(visited);
  branchVisited.add(label);
  const block = getTextAsmBlock(asmContent, label);
  const blockLines = block.split(/\r?\n/);
  const results = new Set<string>();

  for (let i = 0; i < blockLines.length; i++) {
    const trimmed = blockLines[i].trim();

    // Direct text_far command.
    let m = trimmed.match(/^text_far\s+(\S+)/i);
    if (m) {
      results.add(m[1]);
    }

    // Follow farcall instructions.
    m = trimmed.match(/^farcall\s+(\S+)/i);
    if (m) {
      followTextBlock(asmContent, m[1], branchVisited).forEach((r) => results.add(r));
    }

    // Follow conditional jump instructions (jr with condition).
    m = trimmed.match(/^jr\s+(?:nz|z|nc|c)\s*,\s*(\S+)/i);
    if (m) {
      followTextBlock(asmContent, m[1], branchVisited).forEach((r) => results.add(r));
    }

    // Follow unconditional jump instructions.
    m = trimmed.match(/^jp\s+(\S+)/i);
    if (m) {
      const target = m[1];
      if (target !== "TextScriptEnd") { // ignore jump-to-end marker
        followTextBlock(asmContent, target, branchVisited).forEach((r) => results.add(r));
      }
      break;
    }

    // Follow ld hl, <label> instructions.
    m = trimmed.match(/^ld\s+hl,\s*(\S+)/i);
    if (m) {
      followTextBlock(asmContent, m[1], branchVisited).forEach((r) => results.add(r));
    }

    // Stop if we hit a ret.
    const retMatch = trimmed.match(/^\s*ret\s*(.*)$/i);
    if (retMatch) {
      const condition = retMatch[1].trim();
      if (condition === "") break;
    }
  }
  return Array.from(results);
}

/* ────────────────────────────────────────────────────────── */
/* 6. Combine Data into Structured Output                    */
/* ────────────────────────────────────────────────────────── */
/**
 * extractScriptTextPointers processes the entire ASM file.
 * For each pointer definition from a _TextPointers section:
 *
 * - If its text_asm block calls or references TalkToTrainer or loads a TrainerHeader, we treat it as a trainer pointer.
 *   We then extract the trainer header label, consume the next trainer macro,
 *   and resolve its three pointers via the global chain.
 *
 * - Otherwise, we follow the text_asm block (via DFS traversal) to collect all final text_far pointers.
 */
export function extractScriptTextPointers(asmContent: string): ScriptTextData {
  const pointerDefs = parseTextPointerDefinitions(asmContent);
  const trainerMacros = parseTrainerMacros(asmContent);
  const result: ScriptTextData = {};
  let trainerIndex = 0;

  for (const def of pointerDefs) {
    if (!def.textID.startsWith("TEXT_")) continue;
    const textBlock = getTextAsmBlock(asmContent, def.pointerName);

    // Modified condition to detect trainer text pointers:
    if (/TalkToTrainer/i.test(textBlock) || /ld\s+hl,\s*\S*TrainerHeader/i.test(textBlock)) {
      // Trainer flow: extract the trainer header label.
      if (trainerIndex < trainerMacros.length) {
        const trainer = trainerMacros[trainerIndex++];
        const resolvedBefore = resolveTextPointer(asmContent, trainer.before) || trainer.before;
        const resolvedEnd = resolveTextPointer(asmContent, trainer.end) || trainer.end;
        const resolvedAfter = resolveTextPointer(asmContent, trainer.after) || trainer.after;
        result[def.textID] = {
          type: "trainer",
          textBefore: resolvedBefore,
          textEnd: resolvedEnd,
          textAfter: resolvedAfter,
        };
      } else {
        result[def.textID] = [def.pointerName];
      }
    } else {
      // Non-trainer text: use DFS traversal to follow all branches.
      const finalPointers = followTextBlock(asmContent, def.pointerName);
      result[def.textID] = finalPointers.length > 0 ? finalPointers : [def.pointerName];
    }
  }
  return result;
}

/* ────────────────────────────────────────────────────────── */
/* 7. Testing                                              */
/* ────────────────────────────────────────────────────────── */
// For example, testing with Route15.asm
const asmFilePath = path.join(__dirname, '../../public/pkassets/scripts/FuchsiaCity.asm');
if (fs.existsSync(asmFilePath)) {
  const asmContent: string = fs.readFileSync(asmFilePath, 'utf8');
  const extracted: ScriptTextData = extractScriptTextPointers(asmContent);
  console.log(JSON.stringify(extracted, null, 2));
} else {
  console.error(`File not found: ${asmFilePath}`);
}