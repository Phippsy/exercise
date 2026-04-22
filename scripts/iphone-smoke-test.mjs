// Headless iPhone-viewport smoke test. Loads the app, seeds some state, opens a
// bodyweight exercise (Pull Ups), and asserts that the set row renders as a
// single horizontal row with reps + weight inputs visible and non-overlapping.
//
// Run: node scripts/iphone-smoke-test.mjs
// Assumes a local http server at http://localhost:5173

import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", ".screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = "http://localhost:5173/";

const seedWorkouts = [
  {
    id: 999,
    name: "Smoke Test Workout",
    notes: null,
    date: null,
    favorite: false,
    exercises: [
      {
        name: "Pull Ups",
        muscle_group: "Back",
        sets: 3,
        reps: 8,
        weight_kg: null,
        notes: null,
        form_notes: null,
        form_video: null,
      },
      {
        name: "Bench Press",
        muscle_group: "Chest",
        sets: 3,
        reps: 8,
        weight_kg: 60,
        notes: null,
        form_notes: null,
        form_video: null,
      },
    ],
  },
];

const failures = [];
function assert(cond, message) {
  if (!cond) failures.push(message);
}

async function run() {
  const iPhone = devices["iPhone 14 Pro"];
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...iPhone });
  const page = await context.newPage();

  // Seed localStorage BEFORE the app's boot script runs.
  await page.addInitScript((workouts) => {
    localStorage.setItem("workouts", JSON.stringify(workouts));
    localStorage.setItem("userName", "Tester");
    localStorage.setItem("onboardingSeen", "true");
  }, seedWorkouts);

  await page.goto(BASE_URL, { waitUntil: "networkidle" });

  // Launch workout → exercise
  await page.getByText("Smoke Test Workout", { exact: false }).first().click();
  await page.waitForSelector("#exerciseListView:not(.hidden)");

  // Case 1: Bodyweight exercise (Pull Ups) — weight field should not collapse row
  await page.getByText("Pull Ups", { exact: false }).first().click();
  await page.waitForSelector("#exerciseDetailView:not(.hidden)");
  await page.waitForSelector(".set-row");

  await page.screenshot({
    path: resolve(OUT_DIR, "iphone-pull-ups.png"),
    fullPage: false,
  });

  const firstRow = page.locator(".set-row").first();
  const box = await firstRow.boundingBox();
  const viewportW = 390;
  assert(box, "set-row has a bounding box");
  assert(box && box.height < 120, `set-row should be a single line (height ~60px), got ${box?.height}`);
  assert(box && box.width <= viewportW, `set-row width ${box?.width} exceeds viewport`);

  const rowMetrics = await firstRow.evaluate((row) => {
    const label = row.querySelector(".set-label");
    const groups = row.querySelectorAll(".input-group");
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    return {
      label: rect(label),
      reps: rect(groups[0]),
      weight: rect(groups[1]),
      remove: rect(groups[2]),
      inputs: Array.from(row.querySelectorAll("input")).map((i) => ({
        id: i.id,
        rect: rect(i),
        display: getComputedStyle(i).display,
        visible: i.offsetWidth > 10,
      })),
    };
  });

  assert(rowMetrics.label, "label present");
  assert(rowMetrics.reps, "reps group present");
  assert(rowMetrics.weight, "weight group present");
  assert(rowMetrics.remove, "remove group present");

  if (rowMetrics.label && rowMetrics.reps && rowMetrics.weight && rowMetrics.remove) {
    const order = ["label", "reps", "weight", "remove"];
    for (let i = 0; i < order.length - 1; i++) {
      const a = rowMetrics[order[i]];
      const b = rowMetrics[order[i + 1]];
      assert(
        a.right <= b.left + 2,
        `${order[i]} (right=${a.right}) should be left of ${order[i + 1]} (left=${b.left})`,
      );
      assert(
        Math.abs(a.top - b.top) < 20,
        `${order[i]} and ${order[i + 1]} should be on the same horizontal row (top ${a.top} vs ${b.top})`,
      );
    }
  }

  rowMetrics.inputs.forEach((inp) => {
    assert(
      inp.visible && inp.rect.width > 40,
      `input ${inp.id} should be visible and >40px wide, got width=${inp.rect.width}`,
    );
  });

  await browser.close();

  if (failures.length) {
    console.error("\n❌ iPhone smoke test failures:");
    failures.forEach((f) => console.error("  -", f));
    process.exit(1);
  }

  console.log("✅ iPhone smoke test passed");
  console.log(`   Screenshot: ${resolve(OUT_DIR, "iphone-pull-ups.png")}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
