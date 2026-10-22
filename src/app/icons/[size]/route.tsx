import { renderAppIcon } from "@/lib/app-icon";

const SIZES = new Set([192, 512]);

/** Icone PNG per il manifest: /icons/192, /icons/512 e varianti maskable (?maskable=1). */
export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const res = renderAppIcon(size, { maskable: new URL(req.url).searchParams.has("maskable") });
  res.headers.set("Cache-Control", "public, max-age=86400");
  return res;
}
