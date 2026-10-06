# Security and privacy

Do not upload secrets or private imagery to public search engines. Visitors supply their own keys in Provider settings. Applied provider settings persist unencrypted in browser localStorage. Only use this on a browser profile you trust; clear keys in Settings when finished on a shared device. Exported provider config files contain plaintext keys and must never be included in public issue reports or commits. Cloud keys pass through the request proxy; local/compatible keys go directly to the configured endpoint. The app does not log keys or images. Investigation history is local browser storage and contains no keys.

Report suspected vulnerabilities privately to the repository owner through GitHub's private vulnerability reporting if enabled; otherwise use their published contact information. Include reproduction steps without real credentials or personal images.

The runtime dependency audit passed during initial verification. The full dependency audit currently reports an upstream `braces` denial-of-service advisory through Next.js's development-only ESLint plugin (`fast-glob` / `micromatch`). npm's proposed automated fix downgrades Next's lint configuration to an incompatible major version, so it is not applied. This path is used for trusted local lint patterns, not image requests. Recheck `npm audit` as upstream packages release fixes.
