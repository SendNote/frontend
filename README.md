# Sendnote (MVP)

A "chat with yourself" note-taking application built with Bun, React, and Supabase.

## 🚀 Quick Start

1.  **Install dependencies:**
    ```bash
    bun install
    ```
2.  **Environment Setup:**
    Create a `.env` file in the root:
    ```env
    BUN_PUBLIC_SUPABASE_URL=your_supabase_url
    BUN_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
3.  **Run Development Server:**
    ```bash
    bun dev
    ```

## 🏗 Architecture

- **Frontend:** React (Vite/Bun), Tailwind v4, Shadcn UI.
- **Backend:** Supabase (Auth, Postgres, Storage).
- **Data Access:** Direct client-side calls via `@supabase/supabase-js`.

## 🛡️ Error Handling

This project uses the **Errors as Values** pattern. Async functions return `{ data, error }` objects instead of throwing exceptions.
