import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * WhatsApp business contact placeholder. Nathan vai trocar pelo número
 * real do cliente. Centralizado aqui pra evitar hardcode espalhado.
 */
export const WHATSAPP_NUMBER = "5511940000000";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
