# components/

- Each component is a folder: `X/X.tsx`, `X/X.module.css`, `X/index.ts` (re-exports default; add `export type { … }` for any exported types).
- Import siblings as `@components/Y`, never `./Y`.
- Cross-component CSS reuse is a smell — flag it rather than expand it.
- Components render + dispatch only. Anything heavier (data fetching, multi-step coordination) belongs in a hook.
