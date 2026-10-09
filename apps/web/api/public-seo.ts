import {
  PLAIN_TEXT_HEADERS,
  toWebRequest,
  writeWebResponse,
  type NodeLikeReq,
  type NodeLikeRes,
} from "../src/lib/publicSeoVercelAdapter";

export const config = { runtime: "nodejs" };

const FALLBACK_ROBOTS = "User-agent: *\nAllow: /\n";

function writeFallback(res: NodeLikeRes | undefined): Response | void {
  if (res) {
    res.statusCode = 200;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(FALLBACK_ROBOTS);
    return;
  }
  return new Response(FALLBACK_ROBOTS, { headers: PLAIN_TEXT_HEADERS });
}

export default async function handler(req: Request | NodeLikeReq, res?: NodeLikeRes): Promise<Response | void> {
  try {
    const webReq = toWebRequest(req);
    const file = new URL(webReq.url).searchParams.get("file") ?? "";
    const { handlePublicSeoDiscovery } = await import("../src/lib/publicSeoHandlers");
    return await writeWebResponse(res, await handlePublicSeoDiscovery(webReq, file));
  } catch (err) {
    console.error("[public-seo]", err);
    return writeFallback(res);
  }
}
