import { spawn } from "child_process";

const timeoutMs = 3500;

function sanitizeError(text = "") {
  return String(text)
    .replace(/[A-Z]:\\[^:\n]+/g, "[path]")
    .replace(/\/[^:\n\s]+/g, "[path]")
    .slice(0, 500);
}

function statusFromResults(results, timedOut, stderr) {
  if (timedOut) return "Time Limit Exceeded";
  if (stderr) {
    if (/SyntaxError/i.test(stderr)) return "Compilation/Syntax Error";
    return "Runtime Error";
  }
  if (results.some(item => item.error)) return "Runtime Error";
  const passed = results.filter(item => item.passed).length;
  if (passed === results.length) return "Accepted";
  if (passed > 0) return "Partially Correct";
  return "Wrong Answer";
}

export function runPythonTests({ code, functionName, testCases, revealTests = true }) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ code, functionName, testCases, revealTests });
    const child = spawn("python", ["-I", "-c", runnerSource], {
      cwd: process.platform === "win32" ? process.env.TEMP || "." : "/tmp",
      env: {},
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    child.on("close", () => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({ status: "Time Limit Exceeded", passed: 0, total: testCases.length, results: [], message: "Your code exceeded the time limit." });
        return;
      }

      try {
        const parsed = JSON.parse(stdout || "{}");
        const safeError = sanitizeError(parsed.error || stderr);
        const results = parsed.results || [];
        const status = statusFromResults(results, false, safeError);
        resolve({
          status,
          passed: results.filter(item => item.passed).length,
          total: testCases.length,
          results,
          message: safeError || parsed.message || results.find(item => item.error)?.error || ""
        });
      } catch {
        resolve({ status: "Runtime Error", passed: 0, total: testCases.length, results: [], message: sanitizeError(stderr || "Unable to execute code.") });
      }
    });

    child.stdin.end(payload);
  });
}

const runnerSource = String.raw`
import ast, json, sys, traceback

payload = json.loads(sys.stdin.read())
code = payload.get("code", "")
function_name = payload.get("functionName", "")
test_cases = payload.get("testCases", [])
reveal_tests = payload.get("revealTests", True)

blocked_calls = {"eval", "exec", "open", "__import__", "compile", "input", "globals", "locals", "vars", "dir", "getattr", "setattr", "delattr", "help"}
allowed_builtins = {
  "abs": abs, "all": all, "any": any, "bool": bool, "dict": dict, "enumerate": enumerate,
  "filter": filter, "float": float, "int": int, "len": len, "list": list, "map": map,
  "max": max, "min": min, "pow": pow, "range": range, "reversed": reversed, "round": round,
  "set": set, "sorted": sorted, "str": str, "sum": sum, "tuple": tuple, "zip": zip,
  "True": True, "False": False, "None": None
}

try:
  tree = ast.parse(code)
  for node in ast.walk(tree):
    if isinstance(node, (ast.Import, ast.ImportFrom)):
      raise ValueError("Imports are disabled in this coding sandbox.")
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in blocked_calls:
      raise ValueError(f"{node.func.id} is disabled in this coding sandbox.")
    if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
      raise ValueError("Dunder attribute access is disabled in this coding sandbox.")

  namespace = {"__builtins__": allowed_builtins}
  exec(compile(tree, "<candidate>", "exec"), namespace, namespace)
  fn = namespace.get(function_name)
  if not callable(fn):
    raise ValueError(f"Missing required function: {function_name}")

  results = []
  for index, case in enumerate(test_cases, start=1):
    args = case.get("input", [])
    expected = case.get("expected")
    try:
      actual = fn(*args)
      passed = actual == expected
      item = {"index": index, "passed": passed}
      if reveal_tests:
        item.update({"input": args, "expected": expected, "actual": actual})
      results.append(item)
    except Exception as exc:
      item = {"index": index, "passed": False, "error": f"{type(exc).__name__}: {exc}"}
      if reveal_tests:
        item.update({"input": args, "expected": expected})
      results.append(item)
  print(json.dumps({"results": results}))
except Exception as exc:
  print(json.dumps({"error": f"{type(exc).__name__}: {exc}"}))
`;
