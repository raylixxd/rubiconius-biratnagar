## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Agent Skills Ecosystem (`skills`, ECC & Superpowers)

This workspace integrates the open agent skills ecosystem via Vercel Labs Skills CLI (`npx skills`), with 346 active skills locked in `skills-lock.json` and mirrored in `.agents/skills/`:

### Core Skill Suites Available:
1. **Everything Claude Code (ECC - `affaan-m/ECC`):**
   - High-leverage execution patterns: `verification-loop`, `system-architecture`, `audit-performance`, `security-hardening`, `agent-harness-construction`, `api-design`.
   - Access anytime via: `.agents/skills/<skill-name>/SKILL.md`.
2. **Superpowers (`obra/superpowers`):**
   - Mandatory operational disciplines:
     - `test-driven-development`: Write tests before implementation.
     - `systematic-debugging`: Identify root causes with zero guesswork.
     - `writing-plans` & `executing-plans`: Architectural decomposition.
     - `verification-before-completion`: Evidence over assertions before claiming any task is done.
     - `using-git-worktrees` & `subagent-driven-development`.
3. **Vercel Labs Agent Skills (`vercel-labs/agent-skills` & `vercel-labs/skills`):**
   - `web-design-guidelines`: High-craft UI/UX rules.
   - `agent-browser`: Web and headless browser inspection.

### Agent Directives:
- Before any multi-step refactor or feature implementation, read and execute according to the relevant skill in `.agents/skills/`.
- Never claim a task complete without executing the verification commands defined in `verification-before-completion`.

