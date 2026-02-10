# Sendnote Frontend - Agent Guidelines

## 1. Project Goal & Context

**App:** "Sendnote" - A private, single-user messaging app for note-taking.
**UX:** WhatsApp/Telegram style (chronological, fast capture).
**Core Features:**

- **Channels:** Topic-based threads.
- **Messages:** Text + Attachments (Images/Files).
- **Search:** Client-side only.

## 2. Architecture Constraints

- **Client-Side Only:** No middleware API. The React frontend talks directly to Supabase.
- **Security:** Rely on Postgres RLS (Row Level Security).
- **Runtime:** Bun (v1.x).

## 3. Operational Commands

- **Dev Server:** `bun run dev`
- **Build:** `bun run build`
- **Test:** `bun test` (Run frequently)
- **Type Check:** `bun x tsc --noEmit` (Run before finishing tasks)

## 4. Code Style & Patterns

### Error Handling: Errors as Values

We **avoid try/catch** for control flow. We use the "Errors as Values" pattern to match Supabase.

- **Supabase Calls:** Native SDK returns `{ data, error }`. Handle them immediately.
- **Custom Async Functions:** Must return a `Result` type, not throw.

  ```typescript
  type Result<T, E = Error> =
    | { data: T; error: null }
    | { data: null; error: E };

  // ✅ Correct
  async function getUser(id: string): Promise<Result<User>> {
    if (!id) return { data: null, error: new Error("Missing ID") };
    return { data: { id, name: "Alice" }, error: null };
  }
  ```

### UI Components (Shadcn/Radix)

- **Library:** Shadcn UI is installed in `src/components/ui`.
- **Usage:** Check `src/components/ui` BEFORE creating new primitives.
- **Imports:** `import { Button } from "@/components/ui/button"`.
- **Styling:** Use Tailwind v4 classes and semantic CSS variables (`bg-primary`, `text-muted-foreground`).
- **Merging:** ALWAYS use `cn()` for class props: `className={cn("base-class", className)}`.

### React & State

- **Functional Components:** Named exports only.
- **Hooks:** Prefer custom hooks for logic (`useMessages`, `useAuth`).
- **State:** Simple `useState`/`useContext`. No Redux/Zustand unless complexity explodes.

### Imports

- Use `@/` alias for all local source imports.

## 5. Data Model (Supabase)

Refer to `supabase.ts` for types.

- **`channels`**: Group messages.
- **`messages`**: Must have `body` OR `attachments`.
- **`attachments`**: Metadata stored in DB; actual file in Supabase Storage.

## 6. Testing Strategy

- **Runner:** `bun test`.
- **Location:** Co-located files (e.g., `utils.ts` -> `utils.test.ts`).
- **Focus:** Unit test helpers and hooks. Mock Supabase for integration tests.

## 7. Environment

- `BUN_PUBLIC_SUPABASE_URL`: Project URL.
- `BUN_PUBLIC_SUPABASE_ANON_KEY`: Public API Key.
