// Optional LLM meal parser. If ANTHROPIC_API_KEY is set, free-text meals the
// rule-based parser can't understand are sent to Claude for a structured
// estimate. Without a key (or on any error) we fall back to the rules.
import { MealItem } from "./nutrition";

export const llmEnabled = () => !!process.env.ANTHROPIC_API_KEY;

export async function parseMealWithLLM(text: string): Promise<MealItem[] | null> {
  if (!llmEnabled()) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system:
          "You estimate nutrition for Indian home, hostel and mess meals. Reply with ONLY a JSON array, no prose. " +
          'Each element: {"name": string, "qty": number, "unit": string, "calories": number, "protein": number, "carbs": number, "fats": number}. ' +
          "Use typical Indian portion sizes; grams for macros. If the text is not food, reply [].",
        messages: [{ role: "user", content: text.slice(0, 500) }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr
      .filter((i) => i && typeof i.name === "string")
      .map((i) => ({
        name: String(i.name),
        qty: Number(i.qty) || 1,
        unit: String(i.unit || "serving"),
        calories: Math.round(Number(i.calories) || 0),
        protein: Math.round((Number(i.protein) || 0) * 10) / 10,
        carbs: Math.round((Number(i.carbs) || 0) * 10) / 10,
        fats: Math.round((Number(i.fats) || 0) * 10) / 10,
      }));
  } catch {
    return null;
  }
}
