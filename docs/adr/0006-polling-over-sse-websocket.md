# ADR-0006: Polling (1.5s) for live run logs, not SSE or WebSocket

**Status:** Accepted (retroactive)

## Context

The run page needs to show a live-updating log and status while a `promptfoo eval` child process runs, potentially for minutes. Options considered implicitly by the shipped code: Server-Sent Events, a WebSocket connection, or simple HTTP polling.

## Decision

The run page (`app/runs/[id]/page.tsx`) polls `GET /api/runs/[id]` every 1,500ms via `setTimeout` while `status === 'running'`, replacing its local run-state on each response and appending to an auto-scrolled log pane; once status leaves `running`, polling stops and (if `completed`) a single follow-up fetch retrieves normalized results.

## Consequences

- Trivially simple to implement and reason about: no persistent-connection lifecycle management, no reconnect/backoff logic, no server-side streaming plumbing (SSE) or upgrade handshake (WebSocket) — consistent with the project's minimal-dependency stance (ADR-0008).
- Works transparently through Next.js dev-mode HMR and any reverse proxy/dev tooling without special configuration, unlike long-lived SSE/WebSocket connections which are more sensitive to Next.js dev-server module reloads.
- The cost: up to ~1.5 seconds of staleness between an actual log/status change and the UI reflecting it — acceptable for a human watching a multi-second-to-minutes-long eval run, not acceptable if this were ever repurposed for sub-second-latency needs.
- Each poll re-sends the *entire* accumulated log text (not a delta) — for a long-running, verbose eval approaching the 2,000,000-character cap, this means increasingly large repeated HTTP responses every 1.5 seconds; no delta/cursor mechanism exists.
- Polling continues at a fixed interval regardless of how close to completion a run is — no backoff or adaptive interval.
