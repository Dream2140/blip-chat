import { test, expect } from "@playwright/test";

const TIMESTAMP = Date.now();
const USER_A = {
  email: `smoke-a-${TIMESTAMP}@test.com`,
  password: "testtest123",
  nickname: `smokeA${TIMESTAMP}`,
};
const USER_B = {
  email: `smoke-b-${TIMESTAMP}@test.com`,
  password: "testtest123",
  nickname: `smokeB${TIMESTAMP}`,
};

// ─── 1. Registration ───
test("1. Register user A", async ({ page }) => {
  await page.goto("/register");
  await expect(page.locator("text=blip")).toBeVisible();
  await expect(page.locator("text=Create account")).toBeVisible();

  await page.fill('input[type="text"]', USER_A.nickname);
  await page.fill('input[type="email"]', USER_A.email);
  await page.fill('input[type="password"]', USER_A.password);
  await page.click('button[type="submit"]');

  // Should redirect to chat after registration
  await page.waitForURL("**/", { timeout: 10000 });

  // Should see the blip logo in sidebar
  await expect(page.locator("text=blip").first()).toBeVisible();
});

test("2. Register user B", async ({ page }) => {
  await page.goto("/register");

  await page.fill('input[type="text"]', USER_B.nickname);
  await page.fill('input[type="email"]', USER_B.email);
  await page.fill('input[type="password"]', USER_B.password);
  await page.click('button[type="submit"]');

  await page.waitForURL("**/", { timeout: 10000 });
  await expect(page.locator("text=blip").first()).toBeVisible();
});

// ─── 2. Login ───
test("3. Login with user A", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("text=blip")).toBeVisible();

  await page.fill('input[type="email"]', USER_A.email);
  await page.fill('input[type="password"]', USER_A.password);
  await page.click('button[type="submit"]');

  await page.waitForURL("**/", { timeout: 10000 });

  // Should see sidebar with chats/people tabs
  await expect(page.locator("text=chats").first()).toBeVisible();
  await expect(page.locator("text=people").first()).toBeVisible();
});

// ─── 3. People tab — find users ───
test("4. People tab shows other users", async ({ page }) => {
  // Login first
  await page.goto("/login");
  await page.fill('input[type="email"]', USER_A.email);
  await page.fill('input[type="password"]', USER_A.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 });

  // Click people tab
  await page.click("text=people");

  // Should see user B in the list (wait for API)
  await expect(page.locator(`text=${USER_B.nickname}`).first()).toBeVisible({
    timeout: 10000,
  });
});

// ─── 4. Start a chat ───
test("5. Click user B to start a chat — page does NOT crash", async ({
  page,
}) => {
  // Login as A
  await page.goto("/login");
  await page.fill('input[type="email"]', USER_A.email);
  await page.fill('input[type="password"]', USER_A.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 });

  // Go to people, click user B
  await page.click("text=people");
  await page.locator(`text=${USER_B.nickname}`).first().click();

  // Should navigate to /c/... without crashing
  await page.waitForURL("**/c/**", { timeout: 10000 });

  // Page should NOT show error
  await expect(page.locator("text=This page couldn't load")).not.toBeVisible({
    timeout: 5000,
  });

  // Should see the message input (composer)
  await expect(page.locator("textarea")).toBeVisible({ timeout: 5000 });
});

// ─── 5. Send a message ───
test("6. Send a message in the chat", async ({ page }) => {
  // Login as A
  await page.goto("/login");
  await page.fill('input[type="email"]', USER_A.email);
  await page.fill('input[type="password"]', USER_A.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 });

  // Open people tab and start chat with B
  await page.click("text=people");
  await page.locator(`text=${USER_B.nickname}`).first().click();
  await page.waitForURL("**/c/**", { timeout: 10000 });

  // Type and send a message
  const messageText = `Hello from smoke test ${TIMESTAMP}`;
  await page.fill("textarea", messageText);
  await page.keyboard.press("Enter");

  // Message should appear in the chat
  await expect(page.locator(`text=${messageText}`).first()).toBeVisible({
    timeout: 5000,
  });
});

// ─── 6. Message appears for other user ───
test("7. User B sees the message from A", async ({ page }) => {
  // Login as B
  await page.goto("/login");
  await page.fill('input[type="email"]', USER_B.email);
  await page.fill('input[type="password"]', USER_B.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 });

  // Should see conversation with A in chats tab (wait for poll)
  await expect(
    page.locator(`text=${USER_A.nickname}`).first()
  ).toBeVisible({ timeout: 15000 });

  // Click on the conversation
  await page.locator(`text=${USER_A.nickname}`).first().click();
  await page.waitForURL("**/c/**", { timeout: 10000 });

  // Should see A's message
  const messageText = `Hello from smoke test ${TIMESTAMP}`;
  await expect(page.locator(`text=${messageText}`).first()).toBeVisible({
    timeout: 10000,
  });
});

// ─── 7. Logout ───
test("8. Logout works", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', USER_A.email);
  await page.fill('input[type="password"]', USER_A.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 });

  // Click logout (X button in me-chip)
  await page.locator(".me-chip .icon-btn").click();

  // Should redirect to login
  await page.waitForURL("**/login**", { timeout: 10000 });
});
