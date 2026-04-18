import { test, expect } from "@playwright/test";

const TS = Date.now();
const USER_A = {
  email: `a-${TS}@test.com`,
  password: "testtest123",
  nickname: `userA${TS}`,
};
const USER_B = {
  email: `b-${TS}@test.com`,
  password: "testtest123",
  nickname: `userB${TS}`,
};

// Helper: register a user via API (faster, no UI flakiness)
async function registerViaAPI(
  baseURL: string,
  user: { email: string; password: string; nickname: string }
) {
  const res = await fetch(`${baseURL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Register failed: ${err.error}`);
  }
  return res.json();
}

// Helper: login and return to chat home
async function loginAs(
  page: import("@playwright/test").Page,
  user: { email: string; password: string }
) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();

  // Wait for either redirect to / or error message
  await Promise.race([
    page.waitForURL(/\/$/, { timeout: 15000 }),
    page.locator("text=Invalid").waitFor({ timeout: 15000 }).then(() => {
      throw new Error("Login returned 'Invalid email or password'");
    }),
  ]);

  // Verify we're on the chat page
  await expect(page.locator(".sidebar")).toBeVisible({ timeout: 5000 });
}

// ─── Setup: register both users via API ───
test.beforeAll(async ({}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL!;
  await registerViaAPI(baseURL, USER_A);
  await registerViaAPI(baseURL, USER_B);
});

// ─── 1. Register page renders ───
test("1. Register page loads correctly", async ({ page }) => {
  await page.goto("/register");
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="text"]')).toBeVisible();
});

// ─── 2. Login page renders ───
test("2. Login page loads correctly", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

// ─── 3. Login works ───
test("3. Login redirects to chat home", async ({ page }) => {
  await loginAs(page, USER_A);
  await expect(page.locator("text=chats").first()).toBeVisible();
  await expect(page.locator("text=people").first()).toBeVisible();
});

// ─── 4. People tab shows users ───
test("4. People tab shows other users", async ({ page }) => {
  await loginAs(page, USER_A);
  await page.locator("text=people").first().click();

  await expect(
    page.locator(`text=${USER_B.nickname}`).first()
  ).toBeVisible({ timeout: 10000 });
});

// ─── 5. CRITICAL: clicking a user opens chat WITHOUT crash ───
test("5. Open chat with user — no crash", async ({ page }) => {
  await loginAs(page, USER_A);

  // Go to people tab, click user B
  await page.locator("text=people").first().click();
  await page.locator(`text=${USER_B.nickname}`).first().click();

  // Should navigate to /c/...
  await page.waitForURL(/\/c\//, { timeout: 15000 });

  // Page must NOT crash
  await expect(
    page.locator("text=This page couldn't load")
  ).not.toBeVisible({ timeout: 3000 });

  // Should see the message composer textarea
  await expect(page.locator("textarea")).toBeVisible({ timeout: 5000 });
});

// ─── 6. Send a message ───
test("6. Send a message", async ({ page }) => {
  await loginAs(page, USER_A);

  await page.locator("text=people").first().click();
  await page.locator(`text=${USER_B.nickname}`).first().click();
  await page.waitForURL(/\/c\//, { timeout: 15000 });
  await expect(page.locator("textarea")).toBeVisible({ timeout: 5000 });

  const msg = `smoke-${TS}`;
  await page.locator("textarea").fill(msg);
  await page.keyboard.press("Enter");

  // Message should appear as a bubble
  await expect(page.locator(`text=${msg}`).first()).toBeVisible({
    timeout: 5000,
  });
});

// ─── 7. Other user sees the message ───
test("7. User B receives the message", async ({ page }) => {
  await loginAs(page, USER_B);

  // Wait for conversation to appear in sidebar (polling every 5s)
  await expect(
    page.locator(`text=${USER_A.nickname}`).first()
  ).toBeVisible({ timeout: 15000 });

  // Open the conversation
  await page.locator(`text=${USER_A.nickname}`).first().click();
  await page.waitForURL(/\/c\//, { timeout: 15000 });

  // Should see A's message (polling every 3s)
  const msg = `smoke-${TS}`;
  await expect(page.locator(`text=${msg}`).first()).toBeVisible({
    timeout: 10000,
  });
});

// ─── 8. Logout ───
test("8. Logout redirects to login", async ({ page }) => {
  await loginAs(page, USER_A);

  // Click X button in me-chip
  await page.locator(".me-chip .icon-btn").click();
  await page.waitForURL(/\/login/, { timeout: 10000 });
});
