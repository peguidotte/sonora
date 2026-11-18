import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390, 1440]) {
  test(`architecture diagrams at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width < 600)
      await page.getByRole("button", { name: "Abrir menu" }).click();
    await page
      .getByRole("link", { name: "Arquitetura", exact: true })
      .filter({ visible: true })
      .click();
    for (const [view, count] of [
      ["flow", 7],
      ["infra", 6],
    ] as const) {
      await page.locator(`[data-map="${view}"]`).click();
      await expect(page.locator("[data-node]")).toHaveCount(count);
      await expect(page.locator(".map-lines g")).toHaveCount(6);
      await page.locator("[data-node=db]").click();
      await expect(page.locator(".map-lines .lit")).toHaveCount(2);
      await expect(page.locator("#narration")).toContainText("views");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .locator(".atlas")
        .screenshot({ path: testInfo.outputPath(view + ".png") });
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
    await page.clock.install();
    await page.locator("#play").click();
    await page.clock.runFor(3200);
    await expect(page.locator("[data-node=mobile]")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator("#play").click();
    await page.clock.fastForward(6400);
    await expect(page.locator("[data-node=mobile]")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator("#play").click();
    await page.clock.runFor(16000);
    await expect(page.locator("[data-node=db]")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("#play")).toContainText("Guiar");
    await page.locator("summary").filter({ hasText: "Testing" }).click();
    await expect(page.getByText(/A frente de Testing/)).toBeVisible();
  });
}
