/**
 * The client's commission chain, verified cell-by-cell against the real
 * master workbook's "Insurance Return after comms" column and confirmed
 * directly with the client:
 *
 *   commission            = insurance_amount * commission_rate_percent / 100
 *   total_comms_incl_vat  = commission * 1.15
 *   insurance_inv_to_mssa = insurance_amount - total_comms_incl_vat
 *   percentage            = insurance_inv_to_mssa / retail_value * 100
 *
 * Pure and framework-free so the same math drives the live preview in the
 * bike form (react-hook-form watch) and the authoritative save on the
 * server (never trust client-computed money figures — recomputed there
 * from the same three inputs regardless of what the client sent).
 *
 * The commission rate itself is not derivable — confirmed with the client
 * it's negotiated per deal, so it is always a typed input, never computed.
 */

const VAT_MULTIPLIER = 1.15;

export type CommissionInputs = {
  retailValue: number | null;
  insuranceAmount: number | null;
  commissionRatePercent: number | null;
};

export type CommissionResult = {
  commission: number | null;
  totalCommsInclVat: number | null;
  insuranceInvToMssa: number | null;
  /** 0-100, matching the sheet's Insurance Return after comms column. */
  percentageAfterCommission: number | null;
};

export function computeCommissionChain({
  retailValue,
  insuranceAmount,
  commissionRatePercent,
}: CommissionInputs): CommissionResult {
  const commission =
    insuranceAmount !== null && commissionRatePercent !== null
      ? round2(insuranceAmount * (commissionRatePercent / 100))
      : null;

  const totalCommsInclVat = commission !== null ? round2(commission * VAT_MULTIPLIER) : null;

  const insuranceInvToMssa =
    insuranceAmount !== null && totalCommsInclVat !== null
      ? round2(insuranceAmount - totalCommsInclVat)
      : null;

  const percentageAfterCommission =
    insuranceInvToMssa !== null && retailValue !== null && retailValue > 0
      ? round2((insuranceInvToMssa / retailValue) * 100)
      : null;

  return { commission, totalCommsInclVat, insuranceInvToMssa, percentageAfterCommission };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
