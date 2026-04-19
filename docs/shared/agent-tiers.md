# Agent Tiers

LHC separates three concepts:

- `role`: what the agent is responsible for
- `tier`: how much depth and cost to spend
- `posture`: how the role behaves

## Tiers

- `LOW`
  - quick repository lookup
  - focused standards checks
  - narrow doc synthesis

- `STANDARD`
  - default for implementation, debugging, and normal verification
  - default for most LHC subagent dispatch

- `THOROUGH`
  - high-impact investigations
  - multi-file architectural review
  - security-sensitive or incident-sensitive analysis

## Postures

- `router`
  - interpret the request and decide lanes
- `worker`
  - execute a bounded lane to completion
- `reviewer`
  - critique, verify, and challenge conclusions
