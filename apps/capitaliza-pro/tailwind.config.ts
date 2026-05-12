import type { Config } from "tailwindcss";
import preset from "@source-authority/config/tailwind";

const config: Config = {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}"],
};

export default config;
