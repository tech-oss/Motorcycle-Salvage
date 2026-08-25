import * as XLSX from "xlsx";
import { getCurrentProfile } from "@/lib/supabase/auth";
import { getMasterExportData } from "@/services/export";
import { buildMasterSheet } from "@/lib/master-export";
import { BRYTE_HOLLARD_COLUMNS, ALPHA_COLUMNS } from "@/lib/master-layout";

/**
 * Excel master export — reproduces the client's own MSSA master workbook
 * exactly: the same 121/102 columns per tab, the same headers, and the
 * same live formulas (Outstanding, Profit, TAT, etc.), not a simplified
 * substitute. The client was explicit that a lookalike export would mean
 * re-entering data by hand into their real reporting file — this is the
 * file itself, rebuilt from the database.
 *
 * A route handler rather than a Server Action because the response is a
 * file download. The query still runs under the caller's session, so RLS
 * decides what lands in the workbook. Never cached, never served to a
 * signed-out caller — this carries the client's entire salvage history.
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return new Response("Not signed in.", { status: 401 });
  }
  // Viewers can read bikes in the app, but pulling the whole book out as a
  // file is a different act — keep it with the roles that own the data.
  if (profile.role !== "admin" && profile.role !== "staff") {
    return new Response("You do not have permission to export the master.", {
      status: 403,
    });
  }

  let data;
  try {
    data = await getMasterExportData();
  } catch (err) {
    console.error("[export] master export failed:", err);
    return new Response("Could not build the export.", { status: 500 });
  }

  const workbook = XLSX.utils.book_new();

  const bryteHollardSheet = buildMasterSheet(
    BRYTE_HOLLARD_COLUMNS,
    data.sheets["Bryte & Hollard"],
    { text: "MSSA SALVAGE MASTER", col: 4 }
  );
  XLSX.utils.book_append_sheet(workbook, bryteHollardSheet, "Bryte & Hollard");

  const alphaSheet = buildMasterSheet(ALPHA_COLUMNS, data.sheets.Alpha, {
    text: "IUM SALVAGE MASTER",
    col: 2,
  });
  XLSX.utils.book_append_sheet(workbook, alphaSheet, "Alpha");

  const buffer: Buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="MSSA Master ${stamp}.xlsx"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
