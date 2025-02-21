import { ScriptTextData } from './extractScriptTextPointers';

/**
 * Links text pointers to their actual text content by combining the output
 * from extractScriptTextPointers and extractTextFromASM.
 */
export function linkTextPointerToText(
  pointers: ScriptTextData,
  textContent: Record<string, string>
): ScriptTextData {
  const result: ScriptTextData = {};

  for (const [textId, pointerData] of Object.entries(pointers)) {
    if (pointerData.type === "trainer") {
      // For trainer text, look up each of the three text components
      const before = textContent[pointerData.textBefore];
      const end = textContent[pointerData.textEnd];
      const after = textContent[pointerData.textAfter];

      // Only include if all text components are found
      if (before && end && after) {
        result[textId] = {
          type: "trainer",
          textBefore: before,
          textEnd: end,
          textAfter: after,
        };
      }
    } else {
      // For regular text, look up each pointer in the text content
      const resolvedText = pointerData.text
        .map(ptr => textContent[ptr])
        .filter(text => text !== undefined);

      // Only include if at least one text pointer was resolved
      if (resolvedText.length > 0) {
        result[textId] = {
          type: "text",
          text: resolvedText
        };
      }
    }
  }

  return result;
}
