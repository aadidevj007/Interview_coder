import { configHelper } from "./ConfigHelper"

const OLLAMA_BASE_URL = "http://127.0.0.1:11434/api/chat"
const OLLAMA_REQUEST_TIMEOUT_MS = 180000
const OLLAMA_RETRY_DELAY_MS = 1200
const OLLAMA_DEFAULT_SEED = 42
const DEFAULT_CODING_MODEL = "qwen2.5-coder"

const CODING_ONLY_SYSTEM_PROMPT =
  "You are a coding assistant. Only respond to programming-related queries. Reject all non-coding queries."

export interface OllamaChatOptions {
  model: string
  prompt: string
  images?: string[]
  signal?: AbortSignal
  keepAlive?: string
}

export interface OllamaProblemExtraction {
  problem_statement: string
  input_format: string
  output_format: string
  constraints: string
  example_input: string
  example_output: string
}

export interface OllamaSolutionResult {
  code: string
  thoughts: string[]
  time_complexity: string
  space_complexity: string
  raw: string
  model: string
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function uniqueModels(models: Array<string | undefined | null>): string[] {
  return [...new Set(models.filter((model): model is string => Boolean(model?.trim())))]
}

function extractSection(
  responseContent: string,
  sectionNames: string[],
  nextSectionNames: string[]
): string | null {
  const currentSectionPattern = sectionNames
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")

  const nextSectionPattern = nextSectionNames.length
    ? nextSectionNames
        .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|")
    : null

  const sectionRegex = new RegExp(
    nextSectionPattern
      ? `(?:^|\\n)\\s*(?:\\d+\\.\\s*)?(?:${currentSectionPattern})\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:\\d+\\.\\s*)?(?:${nextSectionPattern})\\s*:|$)`
      : `(?:^|\\n)\\s*(?:\\d+\\.\\s*)?(?:${currentSectionPattern})\\s*:?\\s*([\\s\\S]*)$`,
    "i"
  )

  const match = responseContent.match(sectionRegex)
  return match?.[1]?.trim() || null
}

function parseSolutionResponse(
  responseContent: string,
  model: string
): OllamaSolutionResult {
  const normalizeMalformedCode = (input: string): string => {
    if (!input) return input

    // Remove markdown emphasis/backticks that frequently break code formatting.
    let text = input.replace(/`/g, "").replace(/\*\*/g, "").replace(/\*/g, "")

    // If the model emitted one token per line, merge lines back into a single stream.
    const lines = text.split("\n")
    const shortLineCount = lines.filter((line) => line.trim().length > 0 && line.trim().length <= 14).length
    if (lines.length > 8 && shortLineCount / lines.length > 0.6) {
      text = lines.map((line) => line.trim()).filter(Boolean).join(" ")
    }

    // Normalize spacing around punctuation, then reinsert common statement breaks.
    text = text
      .replace(/\s+/g, " ")
      .replace(/\s*([(),:\[\]])\s*/g, "$1")
      .replace(/\s*=\s*/g, " = ")
      .replace(/\s*\+\s*/g, " + ")
      .replace(/\s*-\s*/g, " - ")
      .replace(/\s*<\s*/g, " < ")
      .replace(/\s*>\s*/g, " > ")
      .replace(/\s{2,}/g, " ")
      .trim()

    // Best-effort newline insertion for Python-like code.
    text = text
      .replace(/\b(def\s+\w+\(.*?\):)\s*/g, "$1\n    ")
      .replace(/\b(for\s+.*?:)\s*/g, "$1\n        ")
      .replace(/\b(if\s+.*?:)\s*/g, "$1\n        ")
      .replace(/\b(return\s+)/g, "\n    $1")
      .replace(/\n{3,}/g, "\n\n")
      .trim()

    return text
  }

  const codeFenceMatch = responseContent.match(/```(?:\w+)?\s*([\s\S]*?)```/)
  const codeSection = extractSection(responseContent, ["Code"], [
    "Your Thoughts",
    "Thoughts",
    "Approach",
    "Time complexity",
    "Space complexity"
  ])

  const thoughtsSection = extractSection(
    responseContent,
    ["Your Thoughts", "Thoughts", "Approach", "Key Points"],
    ["Time complexity", "Space complexity"]
  )

  const thoughts =
    thoughtsSection
      ?.split("\n")
      .map((line) => line.replace(/^\s*(?:[-*•]|\d+\.)\s*/, "").trim())
      .filter(Boolean) || []

  return {
    code:
      normalizeMalformedCode(
        codeFenceMatch?.[1]?.trim() ||
          codeSection?.replace(/^```(?:\w+)?\s*|\s*```$/g, "").trim() ||
          responseContent.trim()
      ),
    thoughts:
      thoughts.length > 0
        ? thoughts
        : ["Generated for correctness, clarity, and interview readiness."],
    time_complexity:
      extractSection(responseContent, ["Time complexity"], [
        "Space complexity"
      ]) || "O(n) depending on the task structure.",
    space_complexity:
      extractSection(responseContent, ["Space complexity"], []) ||
      "O(n) depending on the task structure.",
    raw: responseContent,
    model
  }
}

function isLikelyFragmentedCode(code: string): boolean {
  if (!code.trim()) {
    return true
  }

  const lines = code.split("\n").map((line) => line.trim()).filter(Boolean)
  if (lines.length < 6) {
    return false
  }

  const tokenLikeLines = lines.filter(
    (line) =>
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(line) ||
      /^[()[\]{}:.,=+\-*/<>]+$/.test(line) ||
      /^'.*'$|^".*"$/.test(line)
  ).length

  return tokenLikeLines / lines.length > 0.45
}

function hasObviousSyntaxBreaks(code: string, preferredLanguage: string): boolean {
  const lang = preferredLanguage.toLowerCase()
  const compact = code.replace(/\s+/g, " ")

  if (lang === "python") {
    // Common concatenation breakages from malformed model output.
    if (
      /\)\s*for\s+\w+\s+in\s+range/.test(compact) ||
      /\]\s*if\s+/.test(compact) ||
      /:\s*return\s+\w+\s+#\s*example/i.test(compact)
    ) {
      return true
    }
  }

  // Generic broken outputs: tiny snippets pretending to be full solutions.
  const nonEmptyLines = code.split("\n").map((line) => line.trim()).filter(Boolean)
  if (nonEmptyLines.length <= 2 && code.length < 60) {
    return true
  }

  return false
}

function violatesProblemConstraints(options: {
  problem: OllamaProblemExtraction
  code: string
  preferredLanguage: string
}): string | null {
  const problemText = `${options.problem.problem_statement}\n${options.problem.constraints}`
    .toLowerCase()
    .replace(/\s+/g, " ")
  const codeText = options.code.toLowerCase()

  const requiresInPlace =
    problemText.includes("in-place") ||
    problemText.includes("in place") ||
    problemText.includes("without returning new array") ||
    problemText.includes("modify the given array")

  // Common "new-array" anti-pattern for Python tasks.
  if (
    requiresInPlace &&
    options.preferredLanguage.toLowerCase() === "python" &&
    /return\s+sorted\s*\(/.test(codeText)
  ) {
    return "Uses sorted() and returns a new array despite in-place requirement."
  }

  const isWaveTask =
    problemText.includes("wave") &&
    (problemText.includes("arr[0]") || problemText.includes("arr[]")) &&
    problemText.includes(">=") &&
    problemText.includes("<=")

  if (isWaveTask) {
    const hasSortingOnlyApproach =
      /return\s+sorted\s*\(/.test(codeText) ||
      /\bsort_array\s*\(/.test(codeText)
    const hasSwapSignal =
      /\bfor\b/.test(codeText) &&
      (/\[i\]\s*,\s*.*\[i\s*\+\s*1\]/.test(codeText) ||
        /\barr\[i\+?1?\]\s*=\s*arr\[i\]/.test(codeText))

    if (hasSortingOnlyApproach || !hasSwapSignal) {
      return "Does not implement wave rearrangement logic (adjacent pair swaps)."
    }
  }

  return null
}

function isWaveArrayProblem(problem: OllamaProblemExtraction): boolean {
  const text = `${problem.problem_statement}\n${problem.constraints}`
    .toLowerCase()
    .replace(/\s+/g, " ")

  const hasWaveKeyword = text.includes("wave") || text.includes("wave form")
  const hasSortedSignal =
    text.includes("sorted array") ||
    text.includes("ascending order") ||
    text.includes("given a sorted array")
  const hasPatternSignal =
    (text.includes("arr[0]") && (text.includes(">=") || text.includes("greater than or equal"))) ||
    text.includes("every even-indexed element should be greater than or equal to")

  return hasWaveKeyword && hasSortedSignal && hasPatternSignal
}

function isReverseArrayProblem(problem: OllamaProblemExtraction): boolean {
  const text = `${problem.problem_statement}\n${problem.constraints}`
    .toLowerCase()
    .replace(/\s+/g, " ")

  return (
    text.includes("reverse an array") ||
    text.includes("reversing an array") ||
    (text.includes("first element becomes the last") &&
      text.includes("second element becomes second last"))
  )
}

function deterministicWaveSolution(preferredLanguage: string): OllamaSolutionResult {
  const lang = preferredLanguage.toLowerCase()

  const python = `def wave(arr):
    n = len(arr)
    for i in range(0, n - 1, 2):
        arr[i], arr[i + 1] = arr[i + 1], arr[i]`

  const javascript = `function wave(arr) {
  for (let i = 0; i < arr.length - 1; i += 2) {
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
  }
}`

  const java = `void wave(int[] arr) {
    for (int i = 0; i < arr.length - 1; i += 2) {
        int temp = arr[i];
        arr[i] = arr[i + 1];
        arr[i + 1] = temp;
    }
}`

  const cpp = `void wave(vector<int>& arr) {
    for (int i = 0; i + 1 < (int)arr.size(); i += 2) {
        swap(arr[i], arr[i + 1]);
    }
}`

  const code =
    lang === "python"
      ? python
      : lang === "javascript" || lang === "typescript"
        ? javascript
        : lang === "java"
          ? java
          : lang === "cpp" || lang === "c++"
            ? cpp
            : python

  return {
    code,
    thoughts: [
      "Array is already sorted, so swapping each adjacent pair (0,1), (2,3), ... directly forms wave order in-place."
    ],
    time_complexity: "O(n)",
    space_complexity: "O(1)",
    raw: code,
    model: "deterministic-wave-guard"
  }
}

function deterministicReverseArraySolution(
  preferredLanguage: string
): OllamaSolutionResult {
  const lang = preferredLanguage.toLowerCase()

  const python = `def reverse_array(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        arr[left], arr[right] = arr[right], arr[left]
        left += 1
        right -= 1
    return arr`

  const javascript = `function reverseArray(arr) {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];
    left += 1;
    right -= 1;
  }

  return arr;
}`

  const java = `void reverseArray(int[] arr) {
    int left = 0;
    int right = arr.length - 1;

    while (left < right) {
      int temp = arr[left];
      arr[left] = arr[right];
      arr[right] = temp;
      left++;
      right--;
    }
}`

  const cpp = `void reverseArray(vector<int>& arr) {
    int left = 0;
    int right = (int)arr.size() - 1;

    while (left < right) {
      swap(arr[left], arr[right]);
      left++;
      right--;
    }
}`

  const code =
    lang === "python"
      ? python
      : lang === "javascript" || lang === "typescript"
        ? javascript
        : lang === "java"
          ? java
          : lang === "cpp" || lang === "c++"
            ? cpp
            : python

  return {
    code,
    thoughts: [
      "Use two pointers from both ends and swap until they meet.",
      "This reverses the array in-place without extra storage."
    ],
    time_complexity: "O(n)",
    space_complexity: "O(1)",
    raw: code,
    model: "deterministic-reverse-array-guard"
  }
}

function isModelUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes("status 404") ||
    message.includes("model") && message.includes("not found")
  )
}

function safeJsonParse<T>(input: string): T | null {
  const cleaned = input.replace(/```json|```/g, "").trim()

  try {
    return JSON.parse(cleaned) as T
  } catch {
    const objectMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!objectMatch) {
      return null
    }

    try {
      return JSON.parse(objectMatch[0]) as T
    } catch {
      return null
    }
  }
}

function normalizeExtractionFallback(content: string): OllamaProblemExtraction {
  const cleaned = content
    .replace(/```json|```/gi, "")
    .trim()

  // Try to recover common sectioned outputs if model did not return strict JSON.
  const problemStatement =
    extractSection(
      cleaned,
      ["Problem Statement", "Problem", "Question"],
      ["Input format", "Output format", "Constraints", "Example input", "Example output"]
    ) ||
    cleaned ||
    "Unable to extract the problem statement from the screenshots."

  return {
    problem_statement: problemStatement,
    input_format:
      extractSection(
        cleaned,
        ["Input format", "Input"],
        ["Output format", "Constraints", "Example input", "Example output"]
      ) || "",
    output_format:
      extractSection(
        cleaned,
        ["Output format", "Output"],
        ["Constraints", "Example input", "Example output"]
      ) || "",
    constraints:
      extractSection(
        cleaned,
        ["Constraints"],
        ["Example input", "Example output"]
      ) || "",
    example_input:
      extractSection(cleaned, ["Example input", "Sample input"], ["Example output", "Sample output"]) || "",
    example_output:
      extractSection(cleaned, ["Example output", "Sample output"], []) || ""
  }
}

export class OllamaService {
  private async repairCodeFormatting(options: {
    code: string
    preferredLanguage: string
    model: string
    signal?: AbortSignal
  }): Promise<string> {
    const repairPrompt = `Reformat the following ${options.preferredLanguage} code into clean, runnable code.
Do not change the algorithm or variable names unless syntax is broken.
Return ONLY one fenced code block.

\`\`\`
${options.code}
\`\`\``

    const { content } = await this.chat({
      model: options.model,
      prompt: repairPrompt,
      signal: options.signal
    })

    const repairedMatch = content.match(/```(?:\w+)?\s*([\s\S]*?)```/)
    return repairedMatch?.[1]?.trim() || content.trim()
  }

  private async repairConstraintViolation(options: {
    problem: OllamaProblemExtraction
    invalidCode: string
    preferredLanguage: string
    model: string
    violationReason: string
    signal?: AbortSignal
  }): Promise<string> {
    const repairPrompt = `The candidate code violates the problem requirements.
Violation: ${options.violationReason}

Problem statement:
${options.problem.problem_statement}

Constraints:
${options.problem.constraints || "Not provided."}

Rewrite the solution in ${options.preferredLanguage} so it exactly satisfies the problem and constraints.
Return ONLY one fenced code block with runnable code.

Candidate code:
\`\`\`${options.preferredLanguage}
${options.invalidCode}
\`\`\``

    const { content } = await this.chat({
      model: options.model,
      prompt: repairPrompt,
      signal: options.signal
    })

    const repairedMatch = content.match(/```(?:\w+)?\s*([\s\S]*?)```/)
    return repairedMatch?.[1]?.trim() || content.trim()
  }

  private async request(
    options: OllamaChatOptions,
    attempt = 0
  ): Promise<string> {
    const timeoutSignal = AbortSignal.timeout(OLLAMA_REQUEST_TIMEOUT_MS)
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal

    try {
      const response = await fetch(OLLAMA_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: options.model,
          stream: false,
          keep_alive: options.keepAlive ?? "10m",
          options: {
            temperature: 0,
            seed: OLLAMA_DEFAULT_SEED
          },
          messages: [
            {
              role: "system",
              content: CODING_ONLY_SYSTEM_PROMPT
            },
            {
              role: "user",
              content: options.prompt,
              images: options.images
            }
          ]
        }),
        signal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Ollama request failed with status ${response.status} for model "${options.model}": ${errorText || "Unknown error"}`
        )
      }

      const data = await response.json()
      const content =
        data?.message?.content ?? data?.response ?? data?.output ?? ""

      return typeof content === "string" ? content : JSON.stringify(content)
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError"
      if (!isAbort && attempt < 1) {
        await delay(OLLAMA_RETRY_DELAY_MS)
        return this.request(options, attempt + 1)
      }

      throw error
    }
  }

  public async chat(options: OllamaChatOptions): Promise<{
    model: string
    content: string
  }> {
    const content = await this.request(options)
    return {
      model: options.model,
      content
    }
  }

  public classifyInput(input: string): {
    isCoding: boolean
    reason: string
  } {
    const normalized = input.trim().toLowerCase()

    if (!normalized) {
      return { isCoding: false, reason: "Empty input" }
    }

    const codingSignals = [
      "code",
      "coding",
      "bug",
      "debug",
      "algorithm",
      "leetcode",
      "hackerrank",
      "function",
      "class",
      "typescript",
      "javascript",
      "python",
      "java",
      "cpp",
      "c++",
      "golang",
      "sql",
      "react",
      "electron",
      "api",
      "compile",
      "runtime",
      "test case",
      "refactor",
      "optimize"
    ]

    const hasSignal =
      codingSignals.some((signal) => normalized.includes(signal)) ||
      /[{}()[\];<>`]/.test(input)

    return {
      isCoding: hasSignal,
      reason: hasSignal ? "Coding query detected" : "Non-coding query detected"
    }
  }

  public async extractProblem(options: {
    images: string[]
    preferredLanguage: string
    model?: string
    signal?: AbortSignal
  }): Promise<OllamaProblemExtraction> {
    const model =
      options.model && configHelper.isVisionModel(options.model)
        ? options.model
        : "llava"

    const prompt = `Analyze the attached screenshots and extract only the coding problem statement.

Important extraction rules:
- Prioritize the main question text block/instructions.
- Ignore desktop/file explorer/background text, app chrome, folder/file names, and unrelated code snippets not part of the problem statement.
- If multiple blocks exist, choose the one that clearly describes a programming task with constraints/examples.
- Do not hallucinate details not visible in the screenshot.

Return strict JSON with exactly these keys:
problem_statement
input_format
output_format
constraints
example_input
example_output

If screenshots are unreadable or not a programming task, still return valid JSON and explain that in problem_statement.
Preferred coding language: ${options.preferredLanguage}`

    const { content } = await this.chat({
      model,
      prompt,
      images: options.images,
      signal: options.signal,
      keepAlive: "0"
    })

    const parsed = safeJsonParse<Partial<OllamaProblemExtraction>>(content)

    if (!parsed) {
      return normalizeExtractionFallback(content)
    }

    return {
      problem_statement: parsed.problem_statement || "Unable to extract the problem statement from the screenshots.",
      input_format: parsed.input_format || "",
      output_format: parsed.output_format || "",
      constraints: parsed.constraints || "",
      example_input: parsed.example_input || "",
      example_output: parsed.example_output || ""
    }
  }

  public async generateCode(options: {
    problem: OllamaProblemExtraction
    userRequest?: string
    preferredLanguage: string
    primaryModel: string
    fallbackModel?: string
    signal?: AbortSignal
  }): Promise<OllamaSolutionResult> {
    if (isWaveArrayProblem(options.problem)) {
      return deterministicWaveSolution(options.preferredLanguage)
    }

    if (isReverseArrayProblem(options.problem)) {
      return deterministicReverseArraySolution(options.preferredLanguage)
    }

    const prompt = `You are a role-based coding committee working internally with 4 roles:
1) Problem Analyst: extract exact requirements/constraints.
2) Algorithm Designer: choose the correct approach for those constraints.
3) ${options.preferredLanguage} Implementer: write complete runnable code.
4) Syntax Reviewer: verify syntax/format and ensure no token-joining artifacts.

Produce the final answer for the exact problem below in ${options.preferredLanguage}.

Hard requirements:
- Solve ONLY the given problem statement. Do not substitute with a different problem.
- Respect all constraints and wording such as "in-place", "without extra array", "sorted input", etc.
- Use idiomatic ${options.preferredLanguage} syntax.
- Return runnable code only for the final solution block (no pseudocode).
- If multiple approaches exist, choose the most correct and efficient one under given constraints.
- Do not invent missing requirements; if something is ambiguous, make the safest assumption and state it briefly in thoughts.

Return the response in this exact structure:
Code:
\`\`\`${options.preferredLanguage}
// solution
\`\`\`
Your Thoughts:
- 2-5 concise bullets focused on why this is correct
Time complexity:
Space complexity:

Problem statement:
${options.problem.problem_statement}

Input format:
${options.problem.input_format || "Not provided."}

Output format:
${options.problem.output_format || "Not provided."}

Constraints:
${options.problem.constraints || "Not provided."}

Example input:
${options.problem.example_input || "Not provided."}

Example output:
${options.problem.example_output || "Not provided."}

Additional user request:
${options.userRequest || "None."}

Strict output rules:
- Include exactly one fenced code block under "Code:" and nothing else inside that block.
- Do not split code tokens across lines.
- Do not wrap code identifiers with markdown emphasis.`

    const candidateModels = uniqueModels([
      options.primaryModel,
      options.fallbackModel,
      DEFAULT_CODING_MODEL
    ])

    let lastError: unknown
    for (const model of candidateModels) {
      try {
        const { content } = await this.chat({
          model,
          prompt,
          signal: options.signal
        })

        const parsed = parseSolutionResponse(content, model)
        const isUsable =
          !isLikelyFragmentedCode(parsed.code) &&
          !hasObviousSyntaxBreaks(parsed.code, options.preferredLanguage) &&
          parsed.code.trim()
        if (isUsable) {
          const violation = violatesProblemConstraints({
            problem: options.problem,
            code: parsed.code,
            preferredLanguage: options.preferredLanguage
          })
          if (!violation) return parsed

          try {
            const repairedConstraintCode = await this.repairConstraintViolation({
              problem: options.problem,
              invalidCode: parsed.code,
              preferredLanguage: options.preferredLanguage,
              model,
              violationReason: violation,
              signal: options.signal
            })
            if (
              repairedConstraintCode.trim() &&
              !isLikelyFragmentedCode(repairedConstraintCode) &&
              !hasObviousSyntaxBreaks(repairedConstraintCode, options.preferredLanguage) &&
              !violatesProblemConstraints({
                problem: options.problem,
                code: repairedConstraintCode,
                preferredLanguage: options.preferredLanguage
              })
            ) {
              return {
                ...parsed,
                code: repairedConstraintCode
              }
            }
          } catch {
            // Fall through to fallback paths.
          }
        }

        if (parsed.code.trim()) {
          try {
            const repairedCode = await this.repairCodeFormatting({
              code: parsed.code,
              preferredLanguage: options.preferredLanguage,
              model,
              signal: options.signal
            })
            if (
              repairedCode.trim() &&
              !isLikelyFragmentedCode(repairedCode) &&
              !hasObviousSyntaxBreaks(repairedCode, options.preferredLanguage)
            ) {
              const repairedViolation = violatesProblemConstraints({
                problem: options.problem,
                code: repairedCode,
                preferredLanguage: options.preferredLanguage
              })
              if (repairedViolation) {
                continue
              }
              return {
                ...parsed,
                code: repairedCode
              }
            }
          } catch {
            // Fall through to next model attempt.
          }
        }
      } catch (error) {
        lastError = error
        if (isModelUnavailableError(error)) {
          continue
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Failed to generate code with the configured Ollama models.")
  }

  public async validateCode(options: {
    problem: OllamaProblemExtraction
    candidate: OllamaSolutionResult
    preferredLanguage: string
    validationModel: string
    signal?: AbortSignal
  }): Promise<OllamaSolutionResult> {
    if (isWaveArrayProblem(options.problem)) {
      return deterministicWaveSolution(options.preferredLanguage)
    }

    if (isReverseArrayProblem(options.problem)) {
      return deterministicReverseArraySolution(options.preferredLanguage)
    }

    const prompt = `You are a role-based validation team:
1) Correctness Reviewer
2) Edge-case Reviewer
3) Language/Syntax Reviewer (${options.preferredLanguage})
4) Constraint Compliance Reviewer

You must agree on one final corrected solution.
You are a strict code reviewer for interview-style coding tasks.
Review and correct the candidate solution for the exact problem below.

Validation checklist:
- Problem match: code must solve this exact problem statement (no problem drift).
- Correctness: handle normal and edge cases.
- Constraint compliance: respect in-place/space/time constraints when stated.
- Language correctness: valid ${options.preferredLanguage} code with proper syntax.
- Keep output concise and interview-ready.
- Do not keep any logic that solves a different problem.

If candidate is wrong, replace it with a correct implementation.
If candidate is correct, keep it and only improve clarity minimally.

Return the same structure:
Code:
Your Thoughts:
Time complexity:
Space complexity:

Problem statement:
${options.problem.problem_statement}

Constraints:
${options.problem.constraints || "Not provided."}

Example input:
${options.problem.example_input || "Not provided."}

Example output:
${options.problem.example_output || "Not provided."}

Candidate solution:
\`\`\`${options.preferredLanguage}
${options.candidate.code}
\`\`\`

Candidate notes:
${options.candidate.thoughts.join("\n")}`

    const candidateModels = uniqueModels([
      options.validationModel,
      options.candidate.model,
      configHelper.loadConfig().solutionModel,
      DEFAULT_CODING_MODEL
    ])

    let lastError: unknown
    for (const model of candidateModels) {
      try {
        const { content } = await this.chat({
          model,
          prompt,
          signal: options.signal
        })

        const parsed = parseSolutionResponse(content, model)
        const violation = violatesProblemConstraints({
          problem: options.problem,
          code: parsed.code,
          preferredLanguage: options.preferredLanguage
        })
        if (
          violation ||
          hasObviousSyntaxBreaks(parsed.code, options.preferredLanguage)
        ) {
          const repaired = await this.repairConstraintViolation({
            problem: options.problem,
            invalidCode: parsed.code,
            preferredLanguage: options.preferredLanguage,
            model,
            violationReason:
              violation ||
              `Code has obvious ${options.preferredLanguage} syntax/format corruption.`,
            signal: options.signal
          })
          return {
            ...parsed,
            code: repaired
          }
        }

        return parsed
      } catch (error) {
        lastError = error
        if (isModelUnavailableError(error)) {
          continue
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Failed to validate code with the configured Ollama models.")
  }
}

export const ollamaService = new OllamaService()
