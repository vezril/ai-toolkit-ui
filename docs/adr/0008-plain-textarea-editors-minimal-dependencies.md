# ADR-0008: Plain-textarea file editors; no CodeMirror/Monaco; minimal dependency footprint

**Status:** Accepted (retroactive)

## Context

The config page needs to let Calvin edit YAML, Markdown, and JS files in the browser (FR-7). Rich code editors (CodeMirror, Monaco) offer syntax highlighting, linting, and better editing ergonomics for structured text, at the cost of meaningful bundle size, configuration surface, and dependency maintenance.

## Decision

`FileEditor` (`app/components/FileEditor.tsx`) is a plain HTML `<textarea>` with manual dirty-state tracking, an explicit Save button (disabled until dirty), and a transient "Saved ✓" confirmation — no editor library is used. The project's entire runtime dependency list stays at four packages: `next`, `react`, `react-dom`, `yaml`.

## Consequences

- Runtime dependency surface stays minimal (AC-1) — no editor-library version treadmill, no bundle-size cost, no accessibility/keybinding surface to maintain beyond what a native `<textarea>` provides for free.
- Directly supports NFR-2 (no telemetry): a smaller, better-understood dependency tree is easier to audit for "does anything here phone home" than a full code-editor component (which often pulls in language-server-style tooling and its own dependency tree).
- The cost is real editing ergonomics: no syntax highlighting, no YAML-aware validation-as-you-type, no line numbers, no bracket matching — a malformed YAML edit is only caught when the config is next parsed by `lib/configs.ts` or promptfoo itself, not at edit time. For a tool whose whole value proposition is "avoid hand-writing YAML," raw-tab editing of suite files, non-generated configs, and prompt files still requires exactly the hand-editing care the builder exists to reduce.
- Because the textarea has no undo-beyond-browser-native and no versioning of its own, a bad edit that gets saved is recoverable only via the target project's git history (consistent with the PRD's non-goal on in-app version history) — the editor intentionally defers that responsibility to git rather than reimplementing it.
