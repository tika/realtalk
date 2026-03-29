# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `pnpm dlx ultracite fix` before committing to ensure compliance.

# Pattern Matching (via ts-pattern)

We use [ts-pattern](https://github.com/gvergnaud/ts-pattern) for pattern matching. It replaces `if/else` and `switch` chains with exhaustive, type-safe branching.

## When to use ts-pattern

**Use it for:** matching on `Result` types, discriminated unions, and any branching where exhaustiveness matters.

**Don't use it for:** simple boolean checks or single-condition `if` statements. A plain `if` is fine when there's only one branch.

## The Result type

We define a `Result` type for all operations that can fail:

```ts
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

Every function that talks to an external service (database, API, AI) returns a `Result`. We never throw from these functions.

## Matching on Result

Always use `match` with `.exhaustive()` so the compiler forces you to handle both cases:

```ts
import { match } from "ts-pattern";

const result = await transcribeAudio(audioUrl);

const transcript = match(result)
  .with({ success: true }, ({ data }) => data)
  .with({ success: false }, ({ error }) => {
    console.error("Transcription failed:", error);
    throw new AppError("TRANSCRIPTION_FAILED", error.message);
  })
  .exhaustive();
```

## Matching on discriminated unions

For types with a `type` or `status` field, use `match` instead of `switch`:

```ts
import { match } from "ts-pattern";

type ErrorType = "not_found" | "unauthorized" | "rate_limited" | "unknown";

const message = match(error.type)
  .with("not_found", () => "Resource not found")
  .with("unauthorized", () => "You don't have access")
  .with("rate_limited", () => "Too many requests, try again later")
  .with("unknown", () => "Something went wrong")
  .exhaustive();
```

## Nested matching

When you need to match on multiple fields at once, pass a tuple:

```ts
const action = match([story.status, result])
  .with(["processing", { success: true }], ([_, { data }]) => {
    return updateStory(story.id, { transcript: data, status: "ready" });
  })
  .with(["processing", { success: false }], ([_, { error }]) => {
    return updateStory(story.id, { status: "failed" });
  })
  .with(["ready", P._], () => {
    // already processed, skip
  })
  .otherwise(() => {
    // ignore other states
  });
```

## Rules

1. **Always use `.exhaustive()`** unless you genuinely need a default fallback, in which case use `.otherwise()`.
2. **Never use `.run()`** — it skips exhaustiveness checking.
3. **Result types are always matched, never unwrapped with `if`.** This keeps error handling consistent across the codebase.
4. **Import `P` for wildcards and predicates** when needed: `import { match, P } from "ts-pattern"`.
