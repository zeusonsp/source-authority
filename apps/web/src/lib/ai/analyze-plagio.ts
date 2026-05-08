import "server-only";

import {
  AI_MODEL_ID,
  estimateCostMicroUsd,
  getAnthropicClient,
} from "./anthropic";

/**
 * Innovation #1: Análise semântica de plágio via Claude Sonnet 4.5 Vision.
 *
 * Recebe original + suspeito (image bytes + caption opcional) e retorna
 * verdict estruturado.
 *
 * Por que isso é único: dHash detecta pixel similarity. AI vê SEMÂNTICA —
 * mesmo storyboard, mesma ideia, mesmo conceito visual mesmo se cores +
 * recorte + edição forem totalmente diferentes.
 */

export type AIVerdict =
  | "plagio_direto" // Reupload do mesmo arquivo (raro chegar aqui — dHash já pegou)
  | "inspiracao_clara" // Recriou o conceito/storyboard, mesma essência
  | "similar_inconclusivo" // Tem semelhanças mas evidências fracas
  | "diferente"; // Conteúdos não relacionados

export type AIPlagioResult = {
  verdict: AIVerdict;
  confidence: number; // 0-1
  reasoning: string;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
  model: string;
};

const SYSTEM_PROMPT = `Você é um analista forense especializado em detecção de plágio de conteúdo de mídia social brasileira.

Sua tarefa: comparar 2 imagens (thumbnail original + thumbnail suspeito) e julgar se há plágio/repost/inspiração indevida.

REGRAS DE ANÁLISE:
1. Considere CONCEITO visual, não apenas pixels: composição, cenário, pose, iluminação, ângulo, props.
2. Ignore "estilo de plataforma" comum (UI Instagram/TikTok overlay) — foque no conteúdo da imagem.
3. Considere captions/títulos se fornecidos como contexto adicional.
4. Não acuse plágio sem evidência forte — "diferente" é resposta válida.

CATEGORIAS DE VEREDITO:
- "plagio_direto": Reupload literal (mesmo arquivo ou re-encode trivial)
- "inspiracao_clara": Recriação evidente do conceito (mesmo storyboard, ângulo, props)
- "similar_inconclusivo": Tem semelhanças mas pode ser tema comum/coincidência
- "diferente": Conteúdos não relacionados

OUTPUT OBRIGATÓRIO (JSON):
{
  "verdict": "plagio_direto" | "inspiracao_clara" | "similar_inconclusivo" | "diferente",
  "confidence": 0.0-1.0 (sua confiança no veredito),
  "reasoning": "explicação técnica em português (max 500 chars)"
}

NÃO inclua markdown, NÃO inclua texto fora do JSON.`;

export async function analyzePlagio(input: {
  originalImage: Buffer;
  originalCaption: string | null;
  suspectImage: Buffer;
  suspectCaption: string | null;
}): Promise<AIPlagioResult> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY não configurado.");
  }

  const message = await client.messages.create({
    model: AI_MODEL_ID,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Imagem 1 — ORIGINAL${input.originalCaption ? ` (caption: "${input.originalCaption.slice(0, 200)}")` : ""}:`,
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: detectMediaType(input.originalImage),
              data: input.originalImage.toString("base64"),
            },
          },
          {
            type: "text",
            text: `\nImagem 2 — SUSPEITO${input.suspectCaption ? ` (caption: "${input.suspectCaption.slice(0, 200)}")` : ""}:`,
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: detectMediaType(input.suspectImage),
              data: input.suspectImage.toString("base64"),
            },
          },
          {
            type: "text",
            text: "\nAnalise e responda APENAS o JSON especificado.",
          },
        ],
      },
    ],
  });

  // Claude retorna content[0].text. Pode haver markdown wrap se modelo desviou.
  const raw =
    message.content.find((b) => b.type === "text")?.text?.trim() ?? "";
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: { verdict: AIVerdict; confidence: number; reasoning: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Claude retornou resposta não-JSON: ${cleaned.slice(0, 200)}`,
    );
  }

  if (
    !parsed.verdict ||
    typeof parsed.confidence !== "number" ||
    typeof parsed.reasoning !== "string"
  ) {
    throw new Error("Claude retornou JSON sem campos esperados.");
  }

  // Sanity: clamp confidence + bound reasoning length.
  const confidence = Math.max(0, Math.min(1, parsed.confidence));
  const reasoning = parsed.reasoning.slice(0, 1000);

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const costMicroUsd = estimateCostMicroUsd(inputTokens, outputTokens);

  return {
    verdict: parsed.verdict,
    confidence,
    reasoning,
    inputTokens,
    outputTokens,
    costMicroUsd,
    model: AI_MODEL_ID,
  };
}

function detectMediaType(
  buffer: Buffer,
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  // Magic bytes (primeiros bytes do file).
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return "image/png";
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  )
    return "image/webp";
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  )
    return "image/gif";
  // Fallback: jpeg (tipo mais comum em CDN).
  return "image/jpeg";
}
