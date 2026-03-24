import { createInterface } from "node:readline";

let _rl = null;
let _closed = false;

function getRL() {
  if (_closed) return null;
  if (!_rl) {
    _rl = createInterface({
      input: process.stdin,
      output: process.stderr,
      terminal: false,
    });
    _rl.on("close", () => {
      _closed = true;
      _rl = null;
    });
  }
  return _rl;
}

/**
 * Close the shared readline interface.
 */
export function closePrompts() {
  if (_rl) {
    _rl.close();
    _rl = null;
    _closed = true;
  }
}

/**
 * Ask a single question via readline and return the answer.
 */
export function ask(question) {
  process.stderr.write(question);
  const rl = getRL();
  if (!rl) return Promise.resolve("");

  return new Promise((resolve) => {
    const onLine = (line) => {
      rl.removeListener("close", onClose);
      resolve(line.trim());
    };
    const onClose = () => {
      rl.removeListener("line", onLine);
      resolve("");
    };
    rl.once("line", onLine);
    rl.once("close", onClose);
  });
}

/**
 * Ask a question with a default value shown in brackets.
 */
export async function askWithDefault(question, defaultValue) {
  const answer = await ask(`${question} [${defaultValue}]: `);
  return answer || defaultValue;
}

/**
 * Ask a required question — re-prompts if empty.
 * In non-TTY mode, accepts empty after first attempt to avoid infinite loop.
 */
export async function askRequired(question) {
  const isTTY = process.stdin.isTTY;

  let answer = await ask(`${question}: `);
  if (!answer && isTTY) {
    console.error("  (required)");
    answer = await ask(`${question}: `);
  }
  return answer || "(not provided)";
}
