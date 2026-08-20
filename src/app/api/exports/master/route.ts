import * as XLSX from "xlsx";
import { getCurrentProfile } from "@/lib/supabase/auth";
import { getMasterExport } from "@/services/export";
import { EXPORT_COLUMNS, SHEET_ORDER } from "@/lib/export-columns";

/**
 * Excel master export (client requirement: "We must keep a master").
 *
 * A route handler rather than a Server Action because the response is a file
 * download. The query still runs under the caller's session, so RLS decides
 * what lands in the workbook.
 *
 * The export carries the client's entire salvage history and is explicitly
 * sensitive, so it is never cached and never served to a signed-out caller.
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

  let exported;
  try {
    exported = await getMasterExport();
  } catch (err) {
    console.error("[export] master export failed:", err);
    return new Response("Could not build the export.", { status: 500 });
  }

  const workbook = XLSX.utils.book_new();
  const names = Object.keys(exported.sheets).sort(
    (a, b) => SHEET_ORDER.indexOf(a) - SHEET_ORDER.indexOf(b)
  );

  if (names.length === 0) {
    const empty = XLSX.utils.aoa_to_sheet([[...EXPORT_COLUMNS]]);
    XLSX.utils.book_append_sheet(workbook, empty, "Master");
  }

  for (const name of names) {
    const sheet = XLSX.utils.json_to_sheet(exported.sheets[name], {
      header: [...EXPORT_COLUMNS],
    });
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  }

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
