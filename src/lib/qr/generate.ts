import QRCode from "qrcode";

/**
 * The QR target is the bike's own protected record URL. Unauthenticated
 * scans hit the login redirect first, then land back here (PROJECT_SCOPE §15).
 */
export function bikeRecordUrl(stockNumber: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/bikes/${stockNumber}`;
}

export async function generateBikeQrDataUrl(stockNumber: string) {
  return QRCode.toDataURL(bikeRecordUrl(stockNumber), {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#071018", light: "#ffffff" },
  });
}
