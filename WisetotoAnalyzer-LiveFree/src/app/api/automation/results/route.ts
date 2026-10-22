import { NextResponse } from "next/server";

// Public, sanitized Actions projection; never read private tracker/credentials.
const SOURCE =
  "https://raw.githubusercontent.com/qor102-sketch/wisetoto-analyzer/automation-data/automation-history.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(SOURCE, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "자동분석 공개 이력을 불러오지 못했습니다.", sourceStatus: res.status },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || (data as any).schema !== "wisetoto-public-history-v1" || !Array.isArray((data as any).records)) {
      return NextResponse.json({ ok: false, error: "자동분석 기록 형식이 올바르지 않습니다." }, { status: 502 });
    }
    // Prevent abuse of the public upstream: expose a bounded, schema-identified projection.
    const payload = data as { records: unknown[] };
    if (payload.records.length > 500) {
      return NextResponse.json({ ok: false, error: "자동분석 기록 개수 검증 실패" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "자동분석 이력 연결에 실패했습니다. 잠시 후 다시 조회해 주세요." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
