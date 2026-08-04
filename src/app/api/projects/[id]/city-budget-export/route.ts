import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { buildCityBudgetWorkbook } from "@/lib/billing/city-budget-excel";

export const dynamic = "force-dynamic";

/** The city's Budget-vs-Actuals Excel, built fresh from live data. Admin-only. */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workbook = await buildCityBudgetWorkbook(id);
  if (!workbook) {
    return NextResponse.json({ error: "No city budget loaded for this job." }, { status: 404 });
  }

  return new Response(new Uint8Array(workbook.buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${workbook.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
