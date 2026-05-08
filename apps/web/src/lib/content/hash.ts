import "server-only";

import sharp from "sharp";

/**
 * Perceptual hashing pra detecção de repost (Pillar 2.5 V1).
 *
 * Algoritmo: dHash (difference hash). Robusto a:
 *   - Resize (downsample → 9×8 grayscale)
 *   - Compressão JPEG/WebP até ~30% quality
 *   - Mudanças leves de saturação/contraste
 *   - Recortes pequenos (~10% borda)
 *
 * Vulnerável a:
 *   - Mirror horizontal (vira hash totalmente diferente — feature)
 *   - Recortes agressivos (~50% da imagem)
 *   - Re-gravação tipo screen capture
 *
 * Output: 16 chars hex (64 bits). Match via Hamming distance:
 *   - 0-3 bits diff: match perfeito (provavelmente o mesmo arquivo)
 *   - 4-10 bits: muito provável repost editado
 *   - 11-20 bits: similar mas inconclusivo
 *   - >20 bits: imagens diferentes
 */

/** Computa dHash 64-bit de uma imagem (buffer de bytes). */
export async function computeDHash(imageBuffer: Buffer): Promise<string> {
  // Resize pra 9×8 grayscale. Ordem é (largura+1) × altura pra que dHash
  // diff entre pixels adjacentes horizontais gere 8×8 = 64 bits.
  const raw = await sharp(imageBuffer)
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer();

  // raw é 9*8 = 72 bytes (1 byte por pixel cinza).
  if (raw.length !== 72) {
    throw new Error(`dHash: expected 72 bytes, got ${raw.length}`);
  }

  // Pra cada linha (8), compara cada par de pixels adjacentes (8 pares por linha).
  // Bit 1 = pixel à direita maior; Bit 0 = pixel à esquerda maior ou igual.
  let hash = 0n;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = raw[row * 9 + col]!;
      const right = raw[row * 9 + col + 1]!;
      hash <<= 1n;
      if (right > left) hash |= 1n;
    }
  }

  // Padded hex 16 chars.
  return hash.toString(16).padStart(16, "0");
}

/**
 * Hamming distance entre 2 hashes hex (0-64).
 * 0 = idêntico, 64 = totalmente diferente.
 */
export function hammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== 16 || hashB.length !== 16) {
    throw new Error("hammingDistance: both hashes must be 16 hex chars");
  }
  const a = BigInt("0x" + hashA);
  const b = BigInt("0x" + hashB);
  let xor = a ^ b;
  let dist = 0;
  while (xor > 0n) {
    dist += Number(xor & 1n);
    xor >>= 1n;
  }
  return dist;
}

/**
 * Score 0-1 de similaridade. 1 = idêntico, 0 = totalmente diferente.
 */
export function similarityScore(hashA: string, hashB: string): number {
  return 1 - hammingDistance(hashA, hashB) / 64;
}

/**
 * Categoriza distância em label humano + threshold de match.
 */
export function categorizeMatch(
  distance: number,
): "exact" | "very_likely" | "possible" | "different" {
  if (distance <= 3) return "exact";
  if (distance <= 10) return "very_likely";
  if (distance <= 20) return "possible";
  return "different";
}
