// Hostel / home meal estimator with affordable Indian protein suggestions.
// Values are approximate per-serving figures for typical home/hostel portions
// and are meant for rough guidance, not medical or dietary prescription.
// Prices are approximate and will vary by city — edit them here.

export interface FoodInfo {
  cal: number;
  p: number;
  c: number;
  f: number;
  unit: string;
  aliases: string[];
}

export const FOODS: Record<string, FoodInfo> = {
  roti: { cal: 104, p: 3.2, c: 20, f: 0.5, unit: "piece", aliases: ["roti", "rotis", "chapati", "chapatis", "phulka"] },
  paratha: { cal: 290, p: 5.5, c: 38, f: 13, unit: "piece", aliases: ["paratha", "parathas", "parantha"] },
  rice: { cal: 205, p: 4.2, c: 45, f: 0.4, unit: "cup", aliases: ["rice", "chawal", "jeera rice"] },
  dal: { cal: 150, p: 9, c: 22, f: 3, unit: "bowl", aliases: ["dal", "daal", "dhal"] },
  rajma: { cal: 210, p: 12, c: 35, f: 2.5, unit: "bowl", aliases: ["rajma"] },
  chole: { cal: 240, p: 11, c: 36, f: 5, unit: "bowl", aliases: ["chole", "chana masala", "chickpea curry"] },
  chana: { cal: 165, p: 9, c: 27, f: 2.6, unit: "handful (60g)", aliases: ["roasted chana", "chana", "chickpeas"] },
  sabzi: { cal: 120, p: 3, c: 14, f: 6, unit: "bowl", aliases: ["sabzi", "sabji", "aloo", "mixed veg", "bhindi"] },
  curd: { cal: 98, p: 4.5, c: 5, f: 4, unit: "katori", aliases: ["curd", "dahi", "yogurt", "raita"] },
  paneer: { cal: 265, p: 18, c: 4, f: 20, unit: "100g", aliases: ["paneer"] },
  egg: { cal: 74, p: 6.3, c: 0.4, f: 5, unit: "egg", aliases: ["eggs", "egg", "anda", "omelette", "omelet"] },
  chicken: { cal: 239, p: 27, c: 0, f: 13, unit: "100g", aliases: ["chicken"] },
  fish: { cal: 206, p: 22, c: 0, f: 12, unit: "100g", aliases: ["fish"] },
  soya: { cal: 173, p: 26, c: 16, f: 0.3, unit: "50g dry", aliases: ["soya chunks", "soya", "soy chunks", "nutrela"] },
  sprouts: { cal: 90, p: 7, c: 15, f: 0.5, unit: "bowl", aliases: ["sprouts", "moong sprouts"] },
  sattu: { cal: 150, p: 9, c: 22, f: 2, unit: "glass (40g)", aliases: ["sattu"] },
  milk: { cal: 122, p: 6, c: 9, f: 6.5, unit: "glass", aliases: ["milk", "doodh"] },
  peanuts: { cal: 230, p: 10, c: 6, f: 19, unit: "handful (40g)", aliases: ["peanuts", "peanut", "groundnuts", "moongfali"] },
  poha: { cal: 180, p: 3.5, c: 32, f: 4.5, unit: "plate", aliases: ["poha"] },
  upma: { cal: 190, p: 4.5, c: 28, f: 6.5, unit: "plate", aliases: ["upma"] },
  idli: { cal: 65, p: 2, c: 12, f: 0.2, unit: "piece", aliases: ["idlis", "idli"] },
  dosa: { cal: 168, p: 3.9, c: 29, f: 3.7, unit: "piece", aliases: ["dosas", "dosa"] },
  sambar: { cal: 110, p: 4.5, c: 16, f: 2.5, unit: "bowl", aliases: ["sambar", "sambhar"] },
  maggi: { cal: 310, p: 5, c: 46, f: 12, unit: "pack", aliases: ["maggi", "instant noodles", "noodles"] },
  bread: { cal: 75, p: 2.5, c: 14, f: 1, unit: "slice", aliases: ["bread", "slices", "toast"] },
  banana: { cal: 105, p: 1.3, c: 27, f: 0.3, unit: "piece", aliases: ["bananas", "banana", "kela"] },
  biscuit: { cal: 120, p: 1.5, c: 20, f: 4, unit: "pack", aliases: ["biscuits", "biscuit"] },
  chai: { cal: 60, p: 1.5, c: 8, f: 2, unit: "cup", aliases: ["chai", "tea", "coffee"] },
  samosa: { cal: 260, p: 4, c: 30, f: 14, unit: "piece", aliases: ["samosas", "samosa"] },
};

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, ek: 1, do: 2, teen: 3,
};

export interface MealItem {
  name: string;
  qty: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

// Rule-based parser: finds known foods (longest alias first, so "soya chunks"
// wins over "soya" and "eggs" isn't also counted as "egg") and a quantity in
// the two words before the food, e.g. "2 boiled eggs", "three roti".
export function parseMeal(text: string): { items: MealItem[]; unmatched: boolean } {
  let rest = ` ${text.toLowerCase().replace(/[^a-z0-9.\s]/g, " ").replace(/\s+/g, " ")} `;
  const aliasList = Object.entries(FOODS)
    .flatMap(([key, info]) => info.aliases.map((a) => ({ key, alias: a })))
    .sort((a, b) => b.alias.length - a.alias.length);

  const found = new Map<string, number>();
  for (const { key, alias } of aliasList) {
    const re = new RegExp(`((?:\\S+\\s){0,2})${alias.replace(/ /g, "\\s")}(?=\\s)`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(rest))) {
      const before = m[1].trim().split(" ").filter(Boolean);
      let qty = 1;
      for (const w of before.reverse()) {
        const n = Number(w);
        if (Number.isFinite(n) && n > 0 && n < 50) {
          qty = n;
          break;
        }
        if (w in WORD_NUMBERS) {
          qty = WORD_NUMBERS[w];
          break;
        }
      }
      found.set(key, (found.get(key) ?? 0) + qty);
      // blank out the match so shorter aliases can't match it again
      rest = rest.slice(0, m.index + m[1].length) + " ".repeat(alias.length) + rest.slice(m.index + m[0].length);
      re.lastIndex = 0;
    }
  }

  const items: MealItem[] = Array.from(found.entries()).map(([key, qty]) => {
    const f = FOODS[key];
    return {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      qty,
      unit: f.unit,
      calories: Math.round(f.cal * qty),
      protein: round1(f.p * qty),
      carbs: round1(f.c * qty),
      fats: round1(f.f * qty),
    };
  });
  return { items, unmatched: items.length === 0 };
}

export function totals(items: MealItem[]) {
  return {
    calories: Math.round(items.reduce((a, i) => a + i.calories, 0)),
    protein: round1(items.reduce((a, i) => a + i.protein, 0)),
    carbs: round1(items.reduce((a, i) => a + i.carbs, 0)),
    fats: round1(items.reduce((a, i) => a + i.fats, 0)),
  };
}

export type ActivityLevel = "low" | "moderate" | "active";

// Protein target estimate. The ICMR-NIN (2020/2024) RDA for Indian adults is
// ~0.8 g/kg/day; it is scaled up modestly for people who train regularly.
export function proteinTarget(weightKg: number | null, level: ActivityLevel) {
  const w = weightKg && weightKg > 25 && weightKg < 200 ? weightKg : 60;
  const perKg = level === "active" ? 1.2 : level === "moderate" ? 1.0 : 0.8;
  return { grams: Math.round(w * perKg), perKg, weightUsed: w, weightIsDefault: !weightKg };
}

export function activityLevel(activeDaysLast7: number, repsLast7: number): ActivityLevel {
  if (activeDaysLast7 >= 4 || repsLast7 >= 300) return "active";
  if (activeDaysLast7 >= 2 || repsLast7 >= 80) return "moderate";
  return "low";
}

export const BUDGET_PROTEIN: { name: string; serving: string; protein: number; costInr: number; tip: string; max?: number }[] = [
  { name: "Soya chunks", serving: "50 g dry, boiled", protein: 26, costInr: 11, max: 1, tip: "Soak in kettle-hot water 5 min, squeeze, add to dal or sabzi." },
  { name: "Roasted chana", serving: "60 g handful", protein: 11, costInr: 8, tip: "No cooking — keep a jar on your desk." },
  { name: "Boiled eggs", serving: "2 eggs", protein: 12.6, costInr: 14, tip: "8–10 min in an electric kettle." },
  { name: "Peanuts", serving: "40 g handful", protein: 10, costInr: 6, max: 1, tip: "Calorie-dense — good if you're struggling to eat enough." },
  { name: "Sprouted moong", serving: "1 bowl", protein: 7, costInr: 9, tip: "Soak overnight; eat with onion, lemon and chaat masala." },
  { name: "Sattu drink", serving: "40 g in water", protein: 9, costInr: 7, max: 1, tip: "Shake with water, lemon and black salt." },
  { name: "Curd / dahi", serving: "1 katori", protein: 4.5, costInr: 10, tip: "Add an extra katori at lunch or dinner." },
  { name: "Milk", serving: "1 glass", protein: 6, costInr: 15, tip: "Before bed or with breakfast." },
  { name: "Extra dal", serving: "1 bowl", protein: 9, costInr: 10, tip: "Ask for a second bowl in the mess." },
];

// Rank cheap options by protein per rupee and suggest enough to close the gap.
export function suggestAlternatives(deficitG: number) {
  if (deficitG <= 0) return [];
  return [...BUDGET_PROTEIN]
    .sort((a, b) => b.protein / b.costInr - a.protein / a.costInr)
    .slice(0, 4)
    .map((opt) => {
      const servings = Math.min(opt.max ?? 2, Math.max(1, Math.ceil((deficitG / opt.protein) * 2) / 2));
      const { max: _max, ...rest } = opt;
      return {
        ...rest,
        proteinPerRupee: round1(opt.protein / opt.costInr),
        suggestedServings: servings,
        coversGrams: round1(Math.min(deficitG, opt.protein * servings)),
      };
    });
}
