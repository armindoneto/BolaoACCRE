/** Normaliza nomes para comparação: sem acento, minúsculo, sem espaços extras. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function teamCodeFromName(name: string): string {
  const clean = normalizeName(name).replace(/ /g, "");
  return clean.slice(0, 3).toUpperCase() || "???";
}
