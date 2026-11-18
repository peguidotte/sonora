import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390, 1440]) {
  test(`architecture journey at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width < 600)
      await page.getByRole("button", { name: "Abrir menu" }).click();
    await page
      .getByRole("link", { name: "Arquitetura", exact: true })
      .filter({ visible: true })
      .click();
    await expect(page.locator("#origin")).toHaveText("simulated");
    await page.locator("#next").click();
    await expect(page.locator("#stage-title")).toContainText("valida");
    await page.locator("[data-source=archive]").click();
    await expect(page.locator("#origin")).toHaveText("public_dataset");
    await expect(page.locator("#prev")).toBeDisabled();
    await page.clock.install();
    await page.locator("#play").click();
    await page.clock.runFor(5000);
    await expect(page.locator("#stage-title")).toContainText("arquivo");
    await page.locator("#play").click();
    await page.clock.fastForward(6000);
    await expect(page.locator("#phase")).toHaveText("ETAPA 2 DE 5");
    await page.locator("#play").click();
    await page.clock.runFor(15000);
    await expect(page.locator("#next")).toBeDisabled();
    await expect(page.locator("#stage-title")).toContainText("pessoa");
    await expect(page.locator("#play")).toContainText("Repetir");
    await page.locator(".station").nth(2).click();
    await page.getByText("Linux", { exact: true }).click();
    await page.getByText("Testing", { exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath("arquitetura.png"),
      fullPage: true,
    });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}
