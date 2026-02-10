# Sendnote

A private, single-user messaging app designed for fast, organized note-taking. Think WhatsApp/Telegram UX, but for capturing your thoughts.

## What It Does

Sendnote gives you a chat-like interface for personal note-taking:

- **📝 Channel Organization** - Group notes by topic or project
- **🔍 Full-Text Search** - Find anything instantly with advanced query syntax
- **🔗 Message References** - Link related notes together, see back-references
- **✨ Markdown Support** - Rich formatting with code syntax highlighting
- **📎 Attachments** - Upload images and files
- **⚡ Real-time Sync** - Changes appear instantly across sessions

## 🏗 Architecture

**Client-Side First**: React app that talks directly to Supabase—no middleware API.

**Backend**: Supabase provides:
- PostgreSQL database (with Row Level Security)
- Authentication (email/password)
- Storage (file attachments)
- Real-time subscriptions

**Database Schema**: Requires Supabase project with schema configured (see `supabase.ts` for table definitions).

### Tech Stack

- **Runtime**: Bun (v1.x)
- **Frontend**: React 19, React Router, Tailwind v4
- **UI Components**: Shadcn UI (Radix primitives)
- **Markdown**: Marked + Highlight.js + DOMPurify
- **Icons**: Lucide React
- **Testing**: Bun test + Happy DOM

### Error Handling Pattern

We use **"Errors as Values"** to match Supabase's SDK—no try/catch for control flow:

```typescript
// ✅ Functions return { data, error }
const { data, error } = await supabase.from('messages').select();
if (error) {
  console.error(error);
  return;
}
// Use data safely here
```

## 🚀 Quick Start

### Prerequisites

- **Bun** v1.x ([install](https://bun.sh))
- **Supabase Project** with database schema configured

### Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Configure environment:**
   
   Create `.env` in the project root:
   ```env
   BUN_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   BUN_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. **Start development server:**
   ```bash
   bun dev
   ```

The app will be available at `http://localhost:3000` (or the port shown in console).

## 💻 Development

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun dev` | Start dev server with hot reload |
| `bun build` | Build production bundle |
| `bun test` | Run test suite |
| `bun x tsc --noEmit` | Type check (run before commits) |

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn UI primitives (Button, Input, etc.)
│   │   ├── ChatWindow.tsx   # Main chat interface
│   │   ├── SearchOverlay.tsx # Full-text search UI
│   │   └── ...              # Other feature components
│   ├── contexts/
│   │   └── ChatCacheContext.tsx  # Message caching & real-time updates
│   ├── hooks/               # Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   ├── markdown.ts      # Markdown rendering
│   │   └── messageReferences.ts # Cross-reference logic
│   ├── types.ts             # TypeScript type definitions
│   └── App.tsx              # Router & providers
├── supabase.ts              # Database type definitions
└── AGENTS.md                # Code style & contribution guidelines
```

## 🛡️ Code Style

- **Components**: Functional, named exports only
- **Imports**: Use `@/` alias (`import { foo } from "@/lib/utils"`)
- **Error Handling**: Return `{ data, error }` objects (see pattern above)
- **Testing**: Co-located `.test.ts` files next to source
- **UI Styling**: Tailwind v4 classes, always use `cn()` utility for merging

See **[AGENTS.md](./AGENTS.md)** for comprehensive guidelines.
