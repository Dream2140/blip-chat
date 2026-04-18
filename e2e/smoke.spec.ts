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
const USER_C = {
  email: `c-${TS}@test.com`,
  password: "testtest123",
  nickname: `userC${TS}`,
};

// Helper: register a user via API
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

// Helper: login via UI
async function loginAs(
  page: import("@playwright/test").Page,
  user: { email: string; password: string }
) {
  // Clear cookies to avoid stale session redirecting away from /login
  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();

  await Promise.race([
    page.waitForURL(/\/$/, { timeout: 15000 }),
    page
      .locator("text=Invalid")
      .waitFor({ timeout: 15000 })
      .then(() => {
        throw new Error("Login returned 'Invalid email or password'");
      }),
  ]);

  await expect(page.locator(".sidebar")).toBeVisible({ timeout: 5000 });
}

// Helper: login as A, open chat with B, return conversation URL
async function openChatAtoB(page: import("@playwright/test").Page) {
  await loginAs(page, USER_A);
  await page.locator("text=people").first().click();
  await page.locator(`text=${USER_B.nickname}`).first().click();
  await page.waitForURL(/\/c\//, { timeout: 15000 });
  await expect(page.locator("textarea")).toBeVisible({ timeout: 5000 });
  return page.url();
}

// ─── Setup ───
test.beforeAll(async ({}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL!;
  await registerViaAPI(baseURL, USER_A);
  await registerViaAPI(baseURL, USER_B);
  await registerViaAPI(baseURL, USER_C);
});

// ═══════════════════════════════════════════
// AUTH — pages, register, login, validation
// ═══════════════════════════════════════════

test.describe("Auth", () => {
  test("register page renders inputs and submit", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login page renders inputs and submit", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("register via UI works and redirects to chat", async ({ page }) => {
    const user = {
      email: `ui-reg-${TS}@test.com`,
      password: "uiregister123",
      nickname: `uiReg${TS}`,
    };
    await page.goto("/register");
    await page.locator('input[type="text"]').fill(user.nickname);
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/$/, { timeout: 15000 });
    await expect(page.locator(".sidebar")).toBeVisible({ timeout: 5000 });
  });

  test("login redirects to chat home with tabs", async ({ page }) => {
    await loginAs(page, USER_A);
    await expect(page.locator("text=chats").first()).toBeVisible();
    await expect(page.locator("text=people").first()).toBeVisible();
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(USER_A.email);
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();

    await expect(
      page.locator("text=Invalid email or password")
    ).toBeVisible({ timeout: 5000 });
  });

  test("login with nonexistent email shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("noone@nowhere.com");
    await page.locator('input[type="password"]').fill("testtest123");
    await page.locator('button[type="submit"]').click();

    await expect(
      page.locator("text=Invalid email or password")
    ).toBeVisible({ timeout: 5000 });
  });

  test("register with duplicate email shows error", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[type="text"]').fill(`dup${TS}`);
    await page.locator('input[type="email"]').fill(USER_A.email);
    await page.locator('input[type="password"]').fill("testtest123");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator("text=already taken")).toBeVisible({
      timeout: 5000,
    });
  });

  test("register with duplicate nickname shows error", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[type="text"]').fill(USER_A.nickname);
    await page.locator('input[type="email"]').fill(`dup-nick-${TS}@test.com`);
    await page.locator('input[type="password"]').fill("testtest123");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator("text=already taken")).toBeVisible({
      timeout: 5000,
    });
  });

  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("logout redirects to login", async ({ page }) => {
    await loginAs(page, USER_A);
    await page.locator(".me-chip .icon-btn").click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });
});

// ═══════════════════════════════════════════
// SIDEBAR — people tab, empty state, search
// ═══════════════════════════════════════════

test.describe("Sidebar", () => {
  test("new user sees empty chats with prompt", async ({ page, baseURL }) => {
    const fresh = {
      email: `fresh-${TS}@test.com`,
      password: "testtest123",
      nickname: `fresh${TS}`,
    };
    await registerViaAPI(baseURL!, fresh);
    await loginAs(page, fresh);

    await expect(page.locator("text=no chats yet")).toBeVisible({
      timeout: 5000,
    });
  });

  test("people tab shows other users", async ({ page }) => {
    await loginAs(page, USER_A);
    await page.locator("text=people").first().click();

    await expect(
      page.locator(`text=${USER_B.nickname}`).first()
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator(`text=${USER_C.nickname}`).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("people tab search filters users", async ({ page }) => {
    await loginAs(page, USER_A);
    await page.locator("text=people").first().click();

    // Both users visible initially
    await expect(
      page.locator(`text=${USER_B.nickname}`).first()
    ).toBeVisible({ timeout: 10000 });

    // Type in search to filter
    await page.locator(".search-input").fill(USER_B.nickname);

    // B should still be visible
    await expect(
      page.locator(`text=${USER_B.nickname}`).first()
    ).toBeVisible();

    // C should be hidden
    await expect(
      page.locator(`text=${USER_C.nickname}`)
    ).not.toBeVisible({ timeout: 3000 });
  });
});

// ═══════════════════════════════════════════
// 1:1 CHAT — open, send, receive, navigate
// ═══════════════════════════════════════════

test.describe("1:1 Chat", () => {
  test("clicking a user opens chat without crash", async ({ page }) => {
    await openChatAtoB(page);

    await expect(
      page.locator("text=This page couldn't load")
    ).not.toBeVisible({ timeout: 3000 });

    await expect(page.locator("textarea")).toBeVisible();
  });

  test("chat shows empty state for new conversation", async ({ page }) => {
    await loginAs(page, USER_A);
    await page.locator("text=people").first().click();
    await page.locator(`text=${USER_C.nickname}`).first().click();
    await page.waitForURL(/\/c\//, { timeout: 15000 });

    await expect(
      page.locator("text=say something").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("send a message — appears in chat", async ({ page }) => {
    const chatUrl = await openChatAtoB(page);
    const msg = `msg1-${TS}`;

    await page.locator("textarea").fill(msg);
    await page.keyboard.press("Enter");

    await expect(page.locator(`text=${msg}`).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("empty message is not sent", async ({ page }) => {
    await openChatAtoB(page);

    // Send button should be disabled when textarea is empty
    const sendBtn = page.locator(".send-btn");
    await expect(sendBtn).toBeDisabled();

    // Type spaces only
    await page.locator("textarea").fill("   ");
    await expect(sendBtn).toBeDisabled();
  });

  test("other user receives the message via polling", async ({ page }) => {
    // First send a unique message as A
    const msg = `cross-${TS}`;

    const pageA = page;
    await openChatAtoB(pageA);
    await pageA.locator("textarea").fill(msg);
    await pageA.keyboard.press("Enter");
    await expect(pageA.locator(`text=${msg}`).first()).toBeVisible({
      timeout: 5000,
    });

    // Now login as B and check
    await loginAs(pageA, USER_B);

    await expect(
      pageA.locator(`text=${USER_A.nickname}`).first()
    ).toBeVisible({ timeout: 15000 });

    await pageA.locator(`text=${USER_A.nickname}`).first().click();
    await pageA.waitForURL(/\/c\//, { timeout: 15000 });

    await expect(pageA.locator(`text=${msg}`).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("direct URL /c/[id] loads without crash", async ({ page }) => {
    // First create a chat to get a conversation URL
    const chatUrl = await openChatAtoB(page);

    // Navigate away
    await page.goto("/");
    await expect(page.locator(".sidebar")).toBeVisible({ timeout: 5000 });

    // Navigate directly to the conversation URL
    await page.goto(chatUrl.replace(page.url().split("/").slice(0, 3).join("/"), ""));
    await page.waitForURL(/\/c\//, { timeout: 15000 });

    await expect(
      page.locator("text=This page couldn't load")
    ).not.toBeVisible({ timeout: 3000 });

    await expect(page.locator("textarea")).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════
// GROUP CHAT — create, send, receive
// ═══════════════════════════════════════════

test.describe("Group Chat", () => {
  test("create group via API and open it", async ({ page, baseURL }) => {
    // Login as A to get cookies
    await loginAs(page, USER_A);

    // Create group via API using page context (cookies auto-sent)
    const res = await page.evaluate(
      async ([bNick, cNick]) => {
        // First get user IDs
        const allRes = await fetch("/api/users/all");
        const allData = await allRes.json();
        const userB = allData.users.find(
          (u: { nickname: string }) => u.nickname === bNick
        );
        const userC = allData.users.find(
          (u: { nickname: string }) => u.nickname === cNick
        );
        if (!userB || !userC) return { error: "users not found" };

        const createRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "GROUP",
            participantIds: [userB.id, userC.id],
            name: "Test Group",
          }),
        });
        return createRes.json();
      },
      [USER_B.nickname, USER_C.nickname]
    );

    expect(res.conversation).toBeTruthy();
    expect(res.conversation.type).toBe("GROUP");

    // Navigate to the group
    await page.goto(`/c/${res.conversation.id}`);
    await page.waitForURL(/\/c\//, { timeout: 15000 });

    await expect(page.locator("textarea")).toBeVisible({ timeout: 5000 });
  });

  test("send message in group — other member sees it", async ({
    page,
    baseURL,
  }) => {
    await loginAs(page, USER_A);

    // Create group
    const res = await page.evaluate(
      async ([bNick, cNick]) => {
        const allRes = await fetch("/api/users/all");
        const allData = await allRes.json();
        const userB = allData.users.find(
          (u: { nickname: string }) => u.nickname === bNick
        );
        const userC = allData.users.find(
          (u: { nickname: string }) => u.nickname === cNick
        );
        if (!userB || !userC) return { error: "users not found" };

        const createRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "GROUP",
            participantIds: [userB.id, userC.id],
            name: "Msg Group",
          }),
        });
        return createRes.json();
      },
      [USER_B.nickname, USER_C.nickname]
    );

    const groupId = res.conversation.id;

    // Send message as A
    await page.goto(`/c/${groupId}`);
    await expect(page.locator("textarea")).toBeVisible({ timeout: 5000 });

    const msg = `group-${TS}`;
    await page.locator("textarea").fill(msg);
    await page.keyboard.press("Enter");
    await expect(page.locator(`text=${msg}`).first()).toBeVisible({
      timeout: 5000,
    });

    // Login as B, check group message
    await loginAs(page, USER_B);
    await page.goto(`/c/${groupId}`);
    await expect(page.locator(`text=${msg}`).first()).toBeVisible({
      timeout: 10000,
    });
  });
});

// ═══════════════════════════════════════════
// API VALIDATION — edge cases
// ═══════════════════════════════════════════

test.describe("API Validation", () => {
  test("register with short password returns error", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `short-${TS}@test.com`,
        password: "123",
        nickname: `short${TS}`,
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("8 characters");
  });

  test("register with invalid email returns error", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        password: "testtest123",
        nickname: `bad${TS}`,
      }),
    });
    expect(res.status).toBe(400);
  });

  test("protected API returns 401 without token", async ({ baseURL }) => {
    const res = await fetch(`${baseURL}/api/users/me`);
    expect(res.status).toBe(401);
  });

  test("send empty message returns 400", async ({ baseURL }) => {
    // This tests the API directly — need auth cookie
    // We'll just verify the validation schema works
    const res = await fetch(`${baseURL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `val-${TS}@test.com`,
        password: "testtest123",
        nickname: `val${TS}`,
      }),
    });
    const cookies = res.headers.get("set-cookie");

    const msgRes = await fetch(
      `${baseURL}/api/conversations/fake-id/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies || "",
        },
        body: JSON.stringify({ text: "" }),
      }
    );
    expect(msgRes.status).toBe(400);
  });
});
