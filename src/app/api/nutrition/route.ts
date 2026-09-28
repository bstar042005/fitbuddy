// Meal logging + protein estimate with affordable Indian alternatives.
// Target adapts to the user's weight and their activity over the last 7 days.
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/auth";
import { ok, fail, readJson, startOfDay, daysAgo, parseJson } from "@/lib/api";
import { parseMeal, totals, proteinTarget, activityLevel, suggestAlternatives, MealItem } from "@/lib/nutrition";
import { parseMealWithLLM, llmEnabled } from "@/lib/llm";
import type { User } from "@prisma/client";

export const dynamic = "force-dynamic";

async function dailyPicture(user: User) {
  const [meals, reps, activeDays] = await Promise.all([
    prisma.mealLog.findMany({ where: { userId: user.id, createdAt: { gte: startOfDay() } }, orderBy: { createdAt: "asc" } }),
    prisma.rep.count({ where: { userId: user.id, createdAt: { gte: daysAgo(6) } } }),
    prisma.rep.findMany({ where: { userId: user.id, createdAt: { gte: daysAgo(6) } }, select: { createdAt: true } }),
  ]);
  const days = new Set(activeDays.map((r) => r.createdAt.toDateString())).size;
  const level = activityLevel(days, reps);
  const target = proteinTarget(user.weightKg, level);
  const day = {
    calories: Math.round(meals.reduce((a, m) => a + m.calories, 0)),
    protein: Math.round(meals.reduce((a, m) => a + m.protein, 0) * 10) / 10,
    carbs: Math.round(meals.reduce((a, m) => a + m.carbs, 0) * 10) / 10,
    fats: Math.round(meals.reduce((a, m) => a + m.fats, 0) * 10) / 10,
  };
  const deficit = Math.max(0, Math.round((target.grams - day.protein) * 10) / 10);
  return {
    meals: meals.map((m) => ({ ...m, items: parseJson<MealItem[]>(m.items, []) })),
    day,
    activity: { level, activeDaysLast7: days, repsLast7: reps },
    target,
    deficit,
    alternatives: suggestAlternatives(deficit),
    llm: llmEnabled(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    return ok(await dailyPicture(user));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const b = await readJson(req);
    const text = String(b.meal || "").trim().slice(0, 300);
    if (!text) throw new HttpError(400, "Describe what you ate, e.g. \"2 roti, dal and curd\"");

    let { items, unmatched } = parseMeal(text);
    let source: "rules" | "llm" = "rules";
    if (unmatched) {
      const llmItems = await parseMealWithLLM(text);
      if (llmItems && llmItems.length) {
        items = llmItems;
        unmatched = false;
        source = "llm";
      }
    }
    if (unmatched) {
      return ok({
        recognised: false,
        message: "Couldn't recognise any foods. Try simple words like \"2 roti, dal, rice, curd, 2 eggs\".",
        ...(await dailyPicture(user)),
      });
    }
    const t = totals(items);
    if (b.save !== false) {
      await prisma.mealLog.create({
        data: { userId: user.id, text, items: JSON.stringify(items), ...t, source },
      });
    }
    return ok({ recognised: true, meal: { text, items, ...t, source }, ...(await dailyPicture(user)) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new HttpError(400, "id is required");
    await prisma.mealLog.deleteMany({ where: { id, userId: user.id } });
    return ok(await dailyPicture(user));
  } catch (e) {
    return fail(e);
  }
}
