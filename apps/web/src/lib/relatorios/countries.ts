/**
 * ISO 3166-1 alpha-2 → metadata (nome PT-BR, ID numérico do world-atlas).
 *
 * Cobre os ~50 países mais frequentes em tráfego web típico de empresas
 * brasileiras. Falta na lista? UI mostra o código alpha-2 cru. Adicionar
 * incrementalmente conforme aparecerem.
 *
 * O `numeric` casa com `geographies.id` do `world-110m.json` (TopoJSON
 * world-atlas v2) — usado pra renderizar marker na posição correta do
 * mapa-múndi.
 */

type Country = {
  /** Nome em português brasileiro. */
  name: string;
  /** ISO 3166-1 numeric (3 dígitos, com zero à esquerda quando aplicável). */
  numeric: string;
};

export const COUNTRIES: Record<string, Country> = {
  BR: { name: "Brasil", numeric: "076" },
  US: { name: "Estados Unidos", numeric: "840" },
  PT: { name: "Portugal", numeric: "620" },
  AR: { name: "Argentina", numeric: "032" },
  MX: { name: "México", numeric: "484" },
  ES: { name: "Espanha", numeric: "724" },
  IT: { name: "Itália", numeric: "380" },
  DE: { name: "Alemanha", numeric: "276" },
  FR: { name: "França", numeric: "250" },
  GB: { name: "Reino Unido", numeric: "826" },
  CA: { name: "Canadá", numeric: "124" },
  CL: { name: "Chile", numeric: "152" },
  PE: { name: "Peru", numeric: "604" },
  CO: { name: "Colômbia", numeric: "170" },
  UY: { name: "Uruguai", numeric: "858" },
  PY: { name: "Paraguai", numeric: "600" },
  VE: { name: "Venezuela", numeric: "862" },
  EC: { name: "Equador", numeric: "218" },
  BO: { name: "Bolívia", numeric: "068" },
  CN: { name: "China", numeric: "156" },
  JP: { name: "Japão", numeric: "392" },
  KR: { name: "Coreia do Sul", numeric: "410" },
  IN: { name: "Índia", numeric: "356" },
  AU: { name: "Austrália", numeric: "036" },
  NZ: { name: "Nova Zelândia", numeric: "554" },
  RU: { name: "Rússia", numeric: "643" },
  TR: { name: "Turquia", numeric: "792" },
  ZA: { name: "África do Sul", numeric: "710" },
  EG: { name: "Egito", numeric: "818" },
  NL: { name: "Holanda", numeric: "528" },
  BE: { name: "Bélgica", numeric: "056" },
  CH: { name: "Suíça", numeric: "756" },
  AT: { name: "Áustria", numeric: "040" },
  SE: { name: "Suécia", numeric: "752" },
  NO: { name: "Noruega", numeric: "578" },
  DK: { name: "Dinamarca", numeric: "208" },
  FI: { name: "Finlândia", numeric: "246" },
  IE: { name: "Irlanda", numeric: "372" },
  PL: { name: "Polônia", numeric: "616" },
  GR: { name: "Grécia", numeric: "300" },
  IL: { name: "Israel", numeric: "376" },
  AE: { name: "Emirados Árabes", numeric: "784" },
  SA: { name: "Arábia Saudita", numeric: "682" },
  TH: { name: "Tailândia", numeric: "764" },
  VN: { name: "Vietnã", numeric: "704" },
  ID: { name: "Indonésia", numeric: "360" },
  PH: { name: "Filipinas", numeric: "608" },
  MY: { name: "Malásia", numeric: "458" },
  SG: { name: "Singapura", numeric: "702" },
  HK: { name: "Hong Kong", numeric: "344" },
  TW: { name: "Taiwan", numeric: "158" },
};

/**
 * Reverse lookup: ID numérico do TopoJSON → ISO alpha-2.
 * Usado no mapa-múndi pra casar geography.id com nossas linhas de events.
 */
export const NUMERIC_TO_ALPHA2: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRIES).map(([alpha2, c]) => [c.numeric, alpha2]),
);

/**
 * Converte alpha-2 em flag emoji via offset Unicode 🇦 = U+1F1E6.
 * Ex: "BR" → "🇧🇷". Falha silenciosamente em códigos inválidos.
 */
export function flagEmoji(alpha2: string): string {
  if (alpha2.length !== 2) return "";
  const codePoints = alpha2
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}

export function countryDisplayName(alpha2: string): string {
  return COUNTRIES[alpha2]?.name ?? alpha2;
}
