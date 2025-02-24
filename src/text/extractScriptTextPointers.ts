// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

export type ExtractedText =
  | {
      type: "trainer";
      textBefore: string;
      textEnd: string;
      textAfter: string;
    }
  | {
      type: "text";
      text: string[];
    };

export interface ScriptTextData {
  [textID: string]: ExtractedText;
}

/* ────────────────────────────────────────────────────────── */
/* 1. Parse Pointer Definitions from _TextPointers Sections   */
/* ────────────────────────────────────────────────────────── */
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
    // Accept sections ending with _TextPointers optionally followed by digits.
    if (currentSection && /_TextPointers(\d*)?$/i.test(currentSection)) {
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
function getTextAsmBlock(asmContent: string, pointerLabel: string): string {
  const lines = asmContent.split(/\r?\n/);
  const escapedLabel = pointerLabel.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
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
/* 4a. Get a Local Label Block within a Parent Block           */
/* ────────────────────────────────────────────────────────── */
function getLocalLabelBlock(block: string, localLabel: string): string {
  const lines = block.split(/\r?\n/);
  const escapedLocal = localLabel.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  const regex = new RegExp("^" + escapedLocal + "[:]{0,2}\\s*$", "i");
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i].trim())) {
      startIndex = i;
      break;
    }
  }
  if (startIndex === -1) return "";
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
function followTextBlock(
  asmContent: string,
  label: string,
  visited: Set<string> = new Set(),
  contextBlock?: string
): string[] {
  if (visited.has(label)) return [];
  const branchVisited = new Set(visited);
  branchVisited.add(label);
  let block: string;
  if (contextBlock && contextBlock.trim().length > 0) {
    block = contextBlock;
  } else {
    block = getTextAsmBlock(asmContent, label);
  }
  const blockLines = block.split(/\r?\n/);
  const results = new Set<string>();
  for (let i = 0; i < blockLines.length; i++) {
    const trimmed = blockLines[i].trim();
    let m: RegExpMatchArray | null = null;
    if ((m = trimmed.match(/^text_far\s+(\S+)/i))) {
      results.add(m[1]);
    } else if ((m = trimmed.match(/^(?:farcall|callfar)\s+(\S+)/i))) {
      followTextBlock(asmContent, m[1], new Set(branchVisited)).forEach((r) => results.add(r));
    } else if ((m = trimmed.match(/^(?:jr|jp)\s+(?:nz|z|nc|c)\s*,\s*(\S+)/i))) {
      if (m[1].startsWith(".") && contextBlock) {
        const localBlock = getLocalLabelBlock(contextBlock, m[1]);
        if (localBlock) {
          followTextBlock(asmContent, m[1], new Set(branchVisited), localBlock).forEach((r) => results.add(r));
        }
      } else {
        followTextBlock(asmContent, m[1], new Set(branchVisited)).forEach((r) => results.add(r));
      }
    } else if ((m = trimmed.match(/^jp\s+(?!nz,|z,|nc,|c,)(\S+)/i))) {
      const target = m[1];
      if (target !== "TextScriptEnd") {
        if (target.startsWith(".") && contextBlock) {
          const localBlock = getLocalLabelBlock(contextBlock, target);
          if (localBlock) {
            followTextBlock(asmContent, target, new Set(branchVisited), localBlock).forEach((r) =>
              results.add(r)
            );
          }
        } else {
          followTextBlock(asmContent, target, new Set(branchVisited)).forEach((r) => results.add(r));
        }
      }
      break;
    } else if ((m = trimmed.match(/^ld\s+hl,\s*(\S+)/i))) {
      if (m[1].startsWith(".")) {
        const localBlock = getLocalLabelBlock(block, m[1]);
        if (localBlock) {
          followTextBlock(asmContent, m[1], new Set(branchVisited), localBlock).forEach((r) =>
            results.add(r)
          );
        }
      } else {
        followTextBlock(asmContent, m[1], new Set(branchVisited)).forEach((r) => results.add(r));
      }
    }
    if (/^\s*ret\s*(.*)$/i.test(trimmed)) {
      const retMatch = trimmed.match(/^\s*ret\s*(.*)$/i);
      const condition = retMatch ? retMatch[1].trim() : "";
      if (condition === "") break;
    }
  }
  return Array.from(results);
}

/* ────────────────────────────────────────────────────────── */
/* 6. Combine Data into Structured Output                    */
/* ────────────────────────────────────────────────────────── */
export function extractScriptTextPointers(asmContent: string): ScriptTextData {
  const pointerDefs = parseTextPointerDefinitions(asmContent);
  const trainerMacros = parseTrainerMacros(asmContent);
  const result: ScriptTextData = {};
  let trainerIndex = 0;
  for (const def of pointerDefs) {
    if (!def.textID.startsWith("TEXT_")) continue;
    const textBlock = getTextAsmBlock(asmContent, def.pointerName);
    if (/TalkToTrainer/i.test(textBlock) || /ld\s+hl,\s*\S*TrainerHeader/i.test(textBlock)) {
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
        result[def.textID] = {
          type: "text",
          text: [def.pointerName],
        };
      }
    } else {
      // Use the text block as context so that local labels are resolved in the proper scope.
      const finalPointers = followTextBlock(asmContent, def.pointerName, new Set(), textBlock);
      result[def.textID] = {
        type: "text",
        text: finalPointers.length > 0 ? finalPointers : [def.pointerName],
      };
    }
  }
  return result;
}

/* ────────────────────────────────────────────────────────── */
/* 7. Testing                                              */
/* ────────────────────────────────────────────────────────── */
// For example, testing with Route15.asm
// loop through all files at '../../public/pkassets/scripts/FILENAME.asm' from the constants of the array AVAILABLE_HEADERS

// for (const header of ["ViridianMart.asm"]) {
//   const asmFilePath = path.join(__dirname, `../../public/pkassets/scripts/${header}`);
// if (fs.existsSync(asmFilePath)) {
//   const asmContent: string = fs.readFileSync(asmFilePath, 'utf8');
//   const extracted: ScriptTextData = extractScriptTextPointers(asmContent);
//   console.log(JSON.stringify(extracted, null, 2));
// } else {
//   console.error(`File not found: ${asmFilePath}`);
// }
// }