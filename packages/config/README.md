# @source-authority/config

Configs compartilhadas entre `apps/web` (dashboard) e `apps/landing` (marketing).

## Tailwind preset

```ts
// apps/X/tailwind.config.ts
import type { Config } from "tailwindcss";
import preset from "@source-authority/config/tailwind";

const config: Config = {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}"],
};

export default config;
```

CSS vars (`--background`, `--primary`, etc.) ficam em `globals.css` de cada app — o preset só gera as classes Tailwind que apontam pra elas.
