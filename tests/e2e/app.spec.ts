// The store as an app, and shortcuts for shoppers: each store installs with its own name,
// colours and icons and shows its own page when the shopper is offline; a product goes into the
// bag straight from a list (Quick add); a shopper asks a friend about a piece on WhatsApp; and a
// customer prints or saves their order's invoice.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { expectAccessible, orderLink, placeOrder } from "./support/helpers";

const run = randomUUID().slice(0, 6);

test("each store installs as its own app, and shows its own page when the shopper is offline", async ({ page, context, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ display: "standalone", start_url: "/", scope: "/" });
  expect(manifest.name).toBeTruthy();
  expect(manifest.icons.map((i: { purpose: string }) => i.purpose)).toEqual(["any", "any", "maskable"]);
  for (const icon of [...manifest.icons, { src: "/app-icon/apple" }]) {
    const res = await request.get(icon.src);
    expect(res.headers()["content-type"], icon.src).toBe("image/png");
  }
  expect((await request.get("/app-icon/huge")).status()).toBe(404);

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /^\/app-icon\/apple\?v=/);

  // The page shown when the store can't be reached: the store's own, ready to try again.
  const offline = await context.newPage();
  await offline.goto("/offline");
  await expect(offline.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await expect(offline.getByText(`${manifest.name} needs an internet connection`)).toBeVisible();
  await expect(offline.getByRole("button", { name: "Try again" })).toBeVisible();
  await offline.close();

  // The service worker (production builds only) takes the pages over and keeps a copy of that page
  // for when the network is gone. (Browsers' simulated offline mode doesn't reach service workers,
  // so the switch itself isn't simulated here.)
  const ready = await page.evaluate(() =>
    Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000))]),
  );
  test.skip(!ready, "The service worker registers in production builds only (next build && next start).");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const kept = await page.evaluate(async () => (await (await caches.match("/offline"))?.text()) ?? "");
  expect(kept).toContain("You're offline");
  expect(kept).toContain(manifest.name);
});

test("Quick add puts a product in the bag without leaving the list", async ({ page }) => {
  await page.goto("/shop?q=satin");
  const card = page.locator("article.pc").filter({ hasText: "Bias-Cut Satin Slip Dress" }).first();
  await card.hover();
  await card.getByRole("button", { name: "Quick add: Bias-Cut Satin Slip Dress" }).click();

  const sheet = page.getByRole("dialog", { name: "Bias-Cut Satin Slip Dress" });
  await expect(sheet.getByRole("link", { name: "See all details" })).toHaveAttribute("href", "/products/bias-cut-satin-slip-dress");
  // A size has to be chosen first.
  await sheet.getByRole("button", { name: "Add to bag" }).click();
  await expect(sheet.getByRole("alert")).toHaveText("Please choose a size.");
  await sheet.locator("button[aria-label^='Size ']:not([disabled])").first().click();
  await expectAccessible(page, "quick add");
  await sheet.getByRole("button", { name: "Add to bag" }).click();

  await expect(sheet).toBeHidden();
  const bag = page.getByRole("dialog", { name: /^Your bag \(\d+\)$/ });
  await expect(bag).toBeVisible();
  await expect(bag.getByRole("link", { name: "Bias-Cut Satin Slip Dress" }).first()).toBeVisible();
  await expect(page).toHaveURL(/\/shop\?q=satin$/);
});

test("Ask your bestie sends the piece, as chosen, to a friend on WhatsApp", async ({ page }) => {
  await page.goto("/products/bias-cut-satin-slip-dress");
  const ask = page.getByRole("link", { name: /Ask your bestie/ });
  await expect(ask).toHaveAttribute("target", "_blank");
  const size = page.locator("button[aria-label^='Size ']:not([disabled])").first();
  const label = (await size.getAttribute("aria-label"))!.replace(/^Size /, "");
  await size.click();

  // WhatsApp asks whom to send it to; the message has the piece, its price and a link to it in
  // the size chosen.
  await expect.poll(async () => new URL((await ask.getAttribute("href"))!).searchParams.get("text")).toContain(`size=${encodeURIComponent(label)}`);
  const href = new URL((await ask.getAttribute("href"))!);
  expect(`${href.origin}${href.pathname}`).toBe("https://wa.me/");
  const text = href.searchParams.get("text")!;
  expect(text).toMatch(/^Should I get this\?/);
  // It comes in two colours; the first is chosen to begin with.
  expect(text).toContain(`Bias-Cut Satin Slip Dress (Champagne, ${label})`);
  expect(text).toMatch(/₹[\d,]+/);
  expect(text).toContain(`http://localhost:3000/products/bias-cut-satin-slip-dress?color=Champagne&size=${encodeURIComponent(label)}`);
});

test("a customer prints or saves their order's invoice, without the store's header and footer", async ({ page }) => {
  const order = await placeOrder("cod", `invoice-${run}@example.com`);
  await page.goto(orderLink(order.number, order.id));
  await page.getByRole("link", { name: "Invoice: view, print or save as PDF" }).click();

  await expect(page.getByRole("heading", { level: 1, name: /invoice/i })).toBeVisible();
  await expect(page.getByText(`No. ${order.number}`)).toBeVisible();
  await expect(page.getByText("Ravi Kumar").first()).toBeVisible();
  await expectAccessible(page, "invoice");

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeHidden();
  await expect(page.getByRole("contentinfo").filter({ hasText: "©" })).toBeHidden();
  await expect(page.getByText(`No. ${order.number}`)).toBeVisible();
  await page.emulateMedia({ media: "screen" });

  await page.getByRole("link", { name: "Back to your order" }).click();
  await expect(page.getByRole("heading", { name: order.number })).toBeVisible();

  // Without the order's link (or the customer's account), there's no invoice to see.
  const res = await page.goto(`/orders/${order.number}/invoice`);
  expect(res?.status()).toBe(404);
});
