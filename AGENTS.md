# ColonyDoc Agent Guidelines

## Project Overview

ColonyDoc is a **mobile-first** Markdown online editor with real-time preview, LaTeX support, and Mermaid diagram rendering. The frontend is built with React + Vite + Tailwind CSS v4, and the backend uses Hono.js with WebSocket support.

## Build Commands

```bash
# Development (full stack - backend + frontend with HMR)
npm run dev

# Frontend only (Vite dev server on port 5787)
npm run dev:frontend

# Backend only (Hono server on port 5788)
npm run dev:backend

# Production build (frontend + backend TypeScript compilation)
npm run build

# Preview production build
npm run preview

# Run production server
npm run start

# TypeScript type checking (strict mode)
npm run typecheck
```

**Note:** There is no testing framework or linting configured. Run `npm run typecheck` before committing to catch type errors.

## Completing Work

After completing a feature or bug fix:
1. Run `npm run typecheck` to verify there are no type errors
2. Ask the user if the work is complete and acceptable
3. If the user confirms acceptance, commit the changes and push to remote
4. If the user requests changes, make the requested modifications

## Mobile-First Design (Critical)

This project is **mobile-first**. All UI must be designed for mobile screens first, then enhanced for desktop.

### Breakpoint
- Mobile: `window.innerWidth < 768`
- Desktop: `window.innerWidth >= 768`

### Mobile Patterns
- Use `isMobile` state to conditionally render mobile/desktop UI
- Mobile: Drawer-based sidebar navigation (Sheet component)
- Desktop: Fixed sidebar
- Touch-friendly tap targets (minimum 44px)
- Mobile header with hamburger menu, search, and editor mode toggle

### Example Mobile Conditional Rendering
```tsx
const [isMobile, setIsMobile] = useState(() => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
})

useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth < 768)
  checkMobile()
  window.addEventListener('resize', checkMobile)
  return () => window.removeEventListener('resize', checkMobile)
}, [])
```

## Code Style Guidelines

### TypeScript
- **Strict mode enabled** - no implicit any, strict null checks
- Use explicit types for all function parameters and return values
- Define interfaces for all component props
- Use `type` for simple type aliases, `interface` for complex object shapes

### React Patterns
- Use `memo()` for pure components that re-render frequently
- Use `useCallback()` for event handlers passed as props
- Use `useRef()` for values that persist across renders without causing re-renders
- Always specify dependency arrays in `useEffect` hooks
- Default export for page components, named export for UI components

### Imports
- React hooks: `import { useState, useCallback, useEffect, useRef, memo } from 'react'`
- Icons: `import { IconName } from 'lucide-react'`
- UI components: `import { Button } from './components/ui/button'`
- Utilities: `import { cn } from './lib/utils'`
- Path aliases: Use `@/*` for imports from `src/*` (e.g., `import { cn } from '@/client/lib/utils'`)

### ClassName / Styling
- Use Tailwind CSS classes exclusively
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Use shadcn/ui components as base (Button, Sheet, Dialog, etc.)
- Use `class-variance-authority` (CVA) for component variants
- Mobile classes first: `className="flex flex-col md:flex-row"`

### Component Structure
```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/client/lib/utils"

const componentVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", outline: "..." },
    size: { default: "...", sm: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
})

export interface ComponentProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof componentVariants> {}

const Component = memo(function Component({ className, variant, size, ...props }: ComponentProps) {
  return <div className={cn(componentVariants({ variant, size, className }))} {...props} />
})

export { Component, componentVariants }
```

### Error Handling
- Wrap async operations in try/catch blocks
- Log errors with descriptive messages: `console.error('Failed to fetch files:', e)`
- Handle loading and error states explicitly in UI

### Naming Conventions
- Components: PascalCase (`FileTree`, `TipTapEditor`)
- Hooks: camelCase with `use` prefix (`useFile`, `useWebSocket`)
- Files: kebab-case for utilities (`utils.ts`, `api-helpers.ts`)
- CSS classes: kebab-case (`text-muted-foreground`, `bg-sidebar`)
- Interfaces: PascalCase with descriptive names (`FileNode`, `SidebarContentProps`)

## Project Structure

```
src/
├── client/              # React frontend
│   ├── components/      # UI components
│   │   ├── ui/          # shadcn/ui base components
│   │   └── *.tsx        # Feature components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities (cn, api client)
│   └── pages/           # Page components
├── server/              # Hono.js backend
│   ├── api.ts           # File routing API
│   ├── app.ts           # Hono app setup
│   ├── index.ts         # Server entry
│   └── watcher.ts       # File system watcher
└── dev.ts               # Dev server launcher
```

## Key Dependencies

- **UI**: React 18, Tailwind CSS v4, shadcn/ui (Radix UI primitives), lucide-react
- **Editor**: TipTap 3, Milkdown, Mermaid, KaTeX
- **Backend**: Hono, @hono/node-server, ws (WebSocket)
- **Dev**: TypeScript 5, Vite 6, tsx

## Path Aliases

The `@/*` alias maps to `src/*`:
- `@/client/*` → `src/client/*`
- `@/server/*` → `src/server/*` (backend only)

## Available Skills

The `.agents/skills/` directory contains specialized guidance:
- `vercel-react-best-practices/` - React performance optimization
- `shadcn-ui/` - shadcn/ui component patterns
- `tailwind-design-system/` - Tailwind CSS v4 design tokens
