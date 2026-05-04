import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Casa todas as rotas exceto:
     * - _next/static (build artifacts)
     * - _next/image (image optimizer)
     * - favicon.ico, robots.txt, sitemap.xml
     * - assets estáticos com extensão de imagem
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
