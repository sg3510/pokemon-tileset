// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import { dirname } from "path";
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

interface Token {
  type: string;
  value: string;
}

export function extractTextFromASM(
  asmFileContents: string
): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = asmFileContents.split(/\r?\n/);
  let currentLabel: string | null = null;
  let tokens: Token[] = [];

  // Helper: trim quotes if present.
  const unquote = (s: string) => s.replace(/^"(.+)"$/, "$1");

  // Process one token from a given line.
  // We assume each line is one command (although sometimes multiple commands occur on one line).
  function processLine(line: string) {
    line = line.trim();
    if (!line) return; // skip blank lines

    // Check if this is a label line (ends with "::")
    const labelMatch = line.match(/^(\S+)::/);
    if (labelMatch) {
      // If we were processing a previous label, finish it
      if (currentLabel && tokens.length > 0) {
        result[currentLabel] = joinTokens(tokens);
      }
      currentLabel = labelMatch[1];
      tokens = [];
      // There might be extra text after the label, but typically not.
      return;
    }

    // We’ll try several regexes for different commands.
    // 1. Commands with a quoted string argument: text, line, cont, para.
    let m = line.match(/^(text|line|cont|para)\s+"([^"]+)"/);
    if (m) {
      const cmd = m[1];
      const str = m[2];
      tokens.push({ type: cmd, value: str });
      return;
    }
    // 2. Command for variable insertion: text_ram
    m = line.match(/^text_ram\s+(\S+)/);
    if (m) {
      const varName = m[1];
      tokens.push({ type: "text_ram", value: varName });
      return;
    }
    // 3. Command for numeric variable: text_decimal (we ignore extra formatting params)
    m = line.match(/^text_decimal\s+(\S+),/);
    if (m) {
      const varName = m[1];
      tokens.push({ type: "text_decimal", value: varName });
      return;
    }
    // 4. Other commands we want to ignore: text_start, prompt, done, etc.
    m = line.match(/^(text_start|prompt|done)$/);
    if (m) {
      // Ignore these commands.
      return;
    }
    // If a line has multiple commands (e.g. a literal followed by a variable),
    // try to process each token separately.
    // For simplicity, split the line on whitespace and try each piece.
    const parts = line.split(/\s+/);
    for (const part of parts) {
      // Check for quoted string parts
      if (/^".*"$/.test(part)) {
        tokens.push({ type: "literal", value: unquote(part) });
      } else if (/^text_ram$/.test(part) || /^text_decimal$/.test(part)) {
        // In a real parser you might want to look ahead.
        // Here we do nothing because we expect those commands on their own line.
      }
    }
  }

  // Join tokens into a final string.
  // Heuristic: for tokens of type text, line, cont, text_ram, text_decimal,
  // join them with a space. But if a token is of type "para" then insert a newline.
  // Also, if a literal ends with "@" and the next token is a variable insertion,
  // then remove the "@" and insert the variable.
  function joinTokens(tokens: Token[]): string {
    let out = "";
    let prevToken: Token | null = null;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];

      // If the token is a paragraph marker, force newline.
      if (t.type === "para") {
        // Always start a new line for para tokens.
        out = out.trimEnd();
        out += "\n" + t.value;
        prevToken = t;
        continue;
      }

      // Determine text for this token.
      let tokenText = "";
      if (
        t.type === "text" ||
        t.type === "line" ||
        t.type === "cont" ||
        t.type === "literal"
      ) {
        tokenText = t.value;
      } else if (t.type === "text_ram" || t.type === "text_decimal") {
        tokenText = `<var:${t.value}>`;
      } else {
        // unknown token type: skip
        continue;
      }

      // Check if we should join without a leading space.
      let joiner = " ";
      if (prevToken === null) {
        joiner = "";
      } else {
        // Special case: if previous token ended with "@" and current token is a variable,
        // remove the "@" from the output.
        if (
          (prevToken.type === "text" ||
            prevToken.type === "line" ||
            prevToken.type === "cont" ||
            prevToken.type === "literal") &&
          /@$/.test(prevToken.value) &&
          (t.type === "text_ram" || t.type === "text_decimal")
        ) {
          // Remove trailing "@" from output.
          out = out.replace(/@$/, "");
          joiner = " ";
        }
        // Another heuristic: if previous token was "line" and current is "cont" and
        // the previous token’s text ends with punctuation (like "?" or "!"),
        // then insert a newline instead of a space.
        else if (
          prevToken.type === "line" &&
          t.type === "cont" &&
          /[?!]$/.test(prevToken.value)
        ) {
          joiner = "\n";
        }
      }
      out += joiner + tokenText;
      prevToken = t;
    }
    return out.trim();
  }

  // Process each line
  for (const line of lines) {
    processLine(line);
  }
  // If file ended while still in a block, output it.
  if (currentLabel && tokens.length > 0) {
    result[currentLabel] = joinTokens(tokens);
  }
  return result;
}

// let files = ["CinnabarIsland.asm", "VermilionCity.asm", "Route15.asm"]
// for (const file of files) {
//   const asmFilePath = path.join(__dirname, `../../public/pkassets/text/${file}`);
// if (fs.existsSync(asmFilePath)) {
//   const asmContent: string = fs.readFileSync(asmFilePath, "utf8");
//   // extract text from asm
//   const extracted = extractTextFromASM(asmContent);
//   console.log(JSON.stringify(extracted, null, 2));
//   console.log("--------------------------------");
// }
// }
