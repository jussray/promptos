export async function enterGuestWorkspace(page) {
  await page.locator('#welcomeScreen').waitFor({state: 'visible'});
  await page.locator('[data-start-onboarding]').click();
  await page.locator('#onboarding').waitFor({state: 'visible'});
  await page.locator('[data-continue-as-guest]').click();
  await page.locator('#appShell').waitFor({state: 'visible'});
}
