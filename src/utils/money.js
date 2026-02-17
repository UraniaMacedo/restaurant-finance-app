// ✅ Formatação apenas de DISPLAY.
// Pedido: ao trocar moeda no Topbar, trocar APENAS o símbolo/formato,
// sem converter valores (evita inconsistência e simplifica a apresentação).

const LOCALE_MAP = {
  EUR: "pt-PT",
  USD: "en-US",
  GBP: "en-GB",
  BRL: "pt-BR",
};

export function money(n, currency = "EUR") {
  const locale = LOCALE_MAP[currency] || "en-US";
  const raw = Number(n || 0);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      useGrouping: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(raw);
  } catch {
    // fallback simples
    const symbols = { EUR: "€", USD: "$", GBP: "£", BRL: "R$" };
    const sym = symbols[currency] || "";
    return `${sym}${raw.toFixed(2)}`;
  }
}


