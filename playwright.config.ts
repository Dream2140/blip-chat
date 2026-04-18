import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.TEST_URL || "https://blip-chat-web.fly.dev";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  retries: 0,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
