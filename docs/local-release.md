# Local Release Candidate

Stage 14 produces a static, serverless Vite artifact in `dist/`. It does not
upload content or require redistribution rights.

## Verify and build

```text
npm run release:local
```

The command runs lint, type checking, content validation, all Vitest tests, the
production bundle, the final 35 MiB/allowlist check, and Gate B evidence
validation. It then writes `release-evidence/local-rc-v1.json`.

## Run locally

```text
npm run preview
```

Open the URL printed by Vite. Audio starts only after selecting a difficulty
and pressing **Standard 플레이 시작**, as required by browser autoplay policy.

Use `npm run dev` only for development. Do not serve the original content
folders directly; the app loads only the generated versioned assets under
`public/` or `dist/`.

Vercel Preview and Production remain outside Stage 14 and must not be used
until the separate redistribution-rights gate permits an upload.
