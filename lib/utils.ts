import type { Category } from "@/types/challenge";

export const categories: { value: "all" | Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "investing", label: "Investing" },
  { value: "economics", label: "Economics" },
  { value: "personal-finance", label: "Personal finance" },
  { value: "business", label: "Business" },
  { value: "real-estate", label: "Real estate" },
  { value: "crypto", label: "Crypto" },
  { value: "markets", label: "Markets" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
];

export function categoryLabel(category: Category) {
  return categories.find((item) => item.value === category)?.label ?? category;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
