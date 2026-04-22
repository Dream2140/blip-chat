import { chromium } from "@playwright/test";

const BASE = "https://blip-chat-web.fly.dev";
const TS = Date.now();
const USER_A = { email: `demo-a-${TS}@test.com`, password: "testtest123", nickname: `demoA${TS}` };
const USER_B = { email: `demo-b-${TS}@test.com`, password: "testtest123", nickname: `demoB${TS}` };
const DIR = "docs/screenshots";

async function registerAndLogin(page: any, user: typeof USER_A) {
  await page.goto(`${BASE}/register`);
  await page.waitForSelector('input[type="text"]', { timeout: 15000 });
  await page.locator('input[type="text"]').fill(user.nickname);
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/$/, { timeout: 15000 });
  await page.waitForSelector(".sidebar", { timeout: 10000 });
  await page.waitForTimeout(1500);
}

async function login(page: any, user: typeof USER_A) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/$/, { timeout: 15000 });
  await page.waitForSelector(".sidebar", { timeout: 10000 });
  await page.waitForTimeout(1500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // === Screenshot 1: Login page (clean) ===
  const loginCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginPage = await loginCtx.newPage();
  await loginPage.goto(`${BASE}/login`);
  await loginPage.waitForSelector('button[type="submit"]', { timeout: 15000 });
  await loginPage.waitForTimeout(500);
  await loginPage.screenshot({ path: `${DIR}/login.png` });
  console.log("1/7 Login page");
  await loginCtx.close();

  // === Register both users ===
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  await registerAndLogin(pageA, USER_A);

  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageB = await ctxB.newPage();
  await registerAndLogin(pageB, USER_B);

  // === Create conversation: A starts chat with B ===
  await pageA.locator("text=people").first().click();
  await pageA.waitForTimeout(1000);
  await pageA.locator(`text=${USER_B.nickname}`).first().click();
  await pageA.waitForURL(/\/c\//, { timeout: 15000 });
  await pageA.waitForSelector("textarea", { timeout: 5000 });
  await pageA.waitForTimeout(500);

  // Send some messages for a realistic screenshot
  const messages = [
    "Hey! Welcome to blip",
    "This is a *real-time* chat app built with Next.js + Socket.IO",
    "Check out these features: `code blocks`, *bold text*, _italic_",
    "https://github.com/Dream2140/blip-chat",
  ];
  for (const msg of messages) {
    await pageA.locator("textarea").fill(msg);
    await pageA.keyboard.press("Enter");
    await pageA.waitForTimeout(800);
  }

  // B replies
  await login(pageB, USER_B);
  // Find A's chat
  const convoLink = pageA.url().split("/c/")[1];
  await pageB.goto(`${BASE}/c/${convoLink}`);
  await pageB.waitForSelector("textarea", { timeout: 10000 });
  await pageB.waitForTimeout(1000);

  const replies = [
    "This looks amazing!",
    "Love the rich text formatting",
  ];
  for (const msg of replies) {
    await pageB.locator("textarea").fill(msg);
    await pageB.keyboard.press("Enter");
    await pageB.waitForTimeout(800);
  }

  // Refresh A to see replies
  await pageA.reload();
  await pageA.waitForSelector(".bubble", { timeout: 10000 });
  await pageA.waitForTimeout(1500);

  // === Screenshot 2: Chat conversation (light) ===
  await pageA.screenshot({ path: `${DIR}/chat-light.png` });
  console.log("2/7 Chat light");

  // === Screenshot 3: Dark mode ===
  await pageA.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await pageA.waitForTimeout(500);
  await pageA.screenshot({ path: `${DIR}/chat-dark.png` });
  console.log("3/7 Chat dark");

  // === Screenshot 4: Sidebar with chats ===
  await pageA.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await pageA.goto(`${BASE}/`);
  await pageA.waitForSelector(".sidebar", { timeout: 10000 });
  await pageA.waitForTimeout(1500);
  await pageA.screenshot({ path: `${DIR}/sidebar.png` });
  console.log("4/7 Sidebar");

  // === Screenshot 5: Settings ===
  await pageA.goto(`${BASE}/settings`);
  await pageA.waitForTimeout(2000);
  await pageA.screenshot({ path: `${DIR}/settings.png` });
  console.log("5/7 Settings");

  // === Screenshot 6: Mobile ===
  await pageA.setViewportSize({ width: 390, height: 844 });
  await pageA.goto(`${BASE}/c/${convoLink}`);
  await pageA.waitForSelector(".bubble", { timeout: 10000 });
  await pageA.waitForTimeout(1500);
  await pageA.screenshot({ path: `${DIR}/mobile.png` });
  console.log("6/7 Mobile");

  // === Screenshot 7: Dark mode mobile ===
  await pageA.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await pageA.waitForTimeout(500);
  await pageA.screenshot({ path: `${DIR}/mobile-dark.png` });
  console.log("7/7 Mobile dark");

  await browser.close();
  console.log("Done!");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
