# Qrious Agent Instructions

This document outlines the architectural boundaries, tech stack rules, and coding standards for any AI Agents working on the Qrious repository.

## 1. Tech Stack Rules
When implementing new features or making modifications, strictly adhere to the following stack:
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Magic UI, React Bits. (Avoid adding new styling frameworks). Use React Three Fiber for 3D elements.
- **Backend**: FastAPI (Python). All API routes should be asynchronous where appropriate.
- **Quantum Processing**: Use Qiskit and Qiskit Aer for simulations. Support OpenQASM for import/export capabilities.
- **AI Integration**: Use LangChain with Groq for LLM interactions. Use ChromaDB for vector storage and BAAI/bge-small-en-v1.5 for embeddings.
- **Database**: MongoDB Atlas for all application data (Notes, Quizzes, Progress).
- **Auth & Blob Storage**: Firebase Authentication for auth state. Backblaze B2 for resource blob storage (handling videos and PDFs natively via presigned URLs).

## 2. Architecture Principles
- **Separation of Concerns**: The frontend must remain completely decoupled from the AI and Quantum logic. All heavy processing (Simulations via Qiskit, RAG via LangChain, Animations via Manim) must be routed through the FastAPI backend.
- **Browser-Based Portability**: Do not introduce dependencies that require the end-user to install local software. Everything must run in the browser or via API calls.
- **Gamification First**: When designing learning modules, integrate them tightly with the pre/post assessment loops, badge rewards, and learning streaks.

## 3. Aesthetic Guidelines
- **UI/UX**: Qrious maintains a premium, dynamic, and modern aesthetic (e.g., deep space colors, glowing purples, glassmorphism, sleek typography using JetBrains Mono). Ensure all new frontend components respect `data-theme` for seamless light and dark modes.
- **Typography**: Do NOT use Instrument Serif (`font-serif`) anywhere in the project, including post-login dashboards and courses. Use Geist Sans (`font-sans`) instead.

## 4. Documentation & Outputs
- Ensure all quantum code snippets support OpenQASM standard.
- AI Tutor responses must remain grounded in verified quantum resources using the configured RAG pipeline to prevent hallucinations in educational content.

## 5. Development Gotchas & Operational Constraints
- **TypeScript Imports**: `verbatimModuleSyntax` is enabled in `tsconfig.json`. You MUST use `import type { ... }` for all type imports. Standard imports for types will cause Vite/esbuild to drop them as values, resulting in runtime crashes (blank white pages) during local development.
- **Dependency Management**: Use `npm install --legacy-peer-deps` when installing new frontend packages due to React 19 versioning conflicts in the environment.
- **Document Processing**: To simplify architecture and avoid server-side conversion pipelines (like Gotenberg), strictly enforce PDF-only uploads for documents (PPTs, Notes, Cheatsheets) on both the client and backend.
- **Routing Deployments**: When deploying React SPAs with dynamic nested routes (e.g., `/resources/document/:id`) to Vercel, ensure a `vercel.json` file is present to handle rewrite rules. Otherwise, users will hit 404 errors on page refresh.
- **Backblaze B2 CORS**: B2 CORS policies for presigned URLs must be configured natively via the API or B2 CLI, not just the S3-compatible endpoints, to ensure cross-origin access works properly for the frontend.
