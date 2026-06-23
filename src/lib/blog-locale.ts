/**
 * Detects the language of a blog post by counting Arabic-range characters
 * in its title and excerpt. No DB column needed — works on existing posts.
 */
export function detectPostLocale(p: { title?: string | null; excerpt?: string | null; language?: string | null }): "ar" | "en" {
  if (p.language === "ar" || p.language === "en") return p.language;
  const text = `${p.title ?? ""} ${p.excerpt ?? ""}`;
  if (!text.trim()) return "en";
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const letters = (text.match(/[\p{L}]/gu) || []).length || 1;
  return arabic / letters > 0.3 ? "ar" : "en";
}
