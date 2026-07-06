// Tour every screen for a design-consistency review.
// Writes screenshots to .screenshots/tour-*.png at iPhone 14 Pro viewport.

import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = ".screenshots";
mkdirSync(OUT, { recursive: true });

const seed = {
  workouts: [
    {
      id: 999,
      name: "Smoke Test Workout",
      exercises: [
        {
          name: "Pull Ups",
          muscle_group: "Back",
          sets: 3,
          reps: 8,
          weight_kg: null,
          form_video: null,
        },
        {
          name: "Bench Press",
          muscle_group: "Chest",
          sets: 3,
          reps: 8,
          weight_kg: 60,
          form_video: null,
        },
      ],
      favorite: true,
    },
  ],
  sessions: [
    {
      workoutId: 999,
      exerciseName: "Pull Ups",
      setNumber: 1,
      reps: 8,
      weight: null,
      date: new Date().toISOString(),
    },
  ],
};

async function main() {
  const iPhone = devices["iPhone 14 Pro"];
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...iPhone });
  const page = await context.newPage();

  await page.addInitScript((s) => {
    localStorage.clear();
    localStorage.setItem("userName", "Donal");
    localStorage.setItem("onboardingSeen", "true");
    // Do NOT preload workouts: let seed data from exercises.json apply so we
    // see the phase-grouped view.
  }, seed);

  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // 1. Workout list, top of page (grouped view with phase headers)
  await page.screenshot({
    path: `${OUT}/tour-01-list-top.png`,
    fullPage: false,
  });

  // 2. Full page (all phase sections + Other workouts)
  await page.screenshot({
    path: `${OUT}/tour-02-list-full.png`,
    fullPage: true,
  });

  // 3. Tap the first Phase 1 workout card to open exercise list
  const phase1Card = await page
    .locator(".workout-card", { hasText: "Phase 1A" })
    .first();
  await phase1Card.click();
  await page.waitForSelector("#exerciseListView:not(.hidden)");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${OUT}/tour-03-exercise-list.png`,
    fullPage: false,
  });

  // 4. Tap first exercise
  await page.locator(".exercise-item").first().click();
  await page.waitForSelector("#exerciseDetailView:not(.hidden)");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${OUT}/tour-04-set-logging.png`,
    fullPage: false,
  });

  // 5. Back to workouts, open Manage panel
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.click("#mobileManageBtn");
  await page.waitForTimeout(300);
  // Manage > Exercises (default active tab)
  await page.screenshot({
    path: `${OUT}/tour-05-manage-exercises.png`,
    fullPage: false,
  });

  // 6. Manage > Workouts
  await page.click('.management-tab[data-tab="workouts"]');
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${OUT}/tour-06-manage-workouts.png`,
    fullPage: false,
  });
  await page.screenshot({
    path: `${OUT}/tour-06b-manage-workouts-full.png`,
    fullPage: true,
  });

  // 7. Manage > Coach
  await page.click('.management-tab[data-tab="coach"]');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${OUT}/tour-07-manage-coach.png`,
    fullPage: false,
  });

  // 8. Manage > Sync
  await page.click('.management-tab[data-tab="sync"]');
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${OUT}/tour-08-manage-sync.png`,
    fullPage: false,
  });

  await browser.close();
  console.log("Tour complete. See .screenshots/tour-*.png");
}

await main();
