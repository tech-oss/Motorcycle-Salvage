import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/** Everything the PDF needs, auto-populated from the bike record (PROJECT_SCOPE §14) — no re-typing. */
export type UpliftmentInstructionData = {
  stockNumber: string;
  fileNumber: string | null;
  claimNumber: string | null;
  insuranceCompany: string | null;
  insuredName: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  registrationNumber: string | null;
  vin: string | null;
  colour: string | null;
  transporterName: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  upliftmentDate: string | null;
  upliftmentTime: string | null;
  pickupAddress: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  generatedAt: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2 solid #d6a23a",
    paddingBottom: 12,
    marginBottom: 20,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 1,
  },
  companySubtitle: {
    fontSize: 8,
    letterSpacing: 2,
    color: "#8a6d2f",
    marginTop: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    textAlign: "right",
  },
  stockNumber: {
    fontSize: 10,
    textAlign: "right",
    color: "#555",
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#8a6d2f",
    marginBottom: 6,
    borderBottom: "0.5 solid #ddd",
    paddingBottom: 3,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  col: {
    width: "50%",
    flexDirection: "row",
  },
  label: {
    width: 90,
    color: "#666",
  },
  value: {
    flex: 1,
    fontWeight: 500,
  },
  addressBlock: {
    flexDirection: "row",
    gap: 20,
  },
  addressCol: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#8a6d2f",
    marginBottom: 4,
  },
  addressText: {
    lineHeight: 1.4,
  },
  notes: {
    lineHeight: 1.4,
    color: "#333",
  },
  signatureRow: {
    flexDirection: "row",
    gap: 30,
    marginTop: 50,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLine: {
    borderTop: "0.75 solid #333",
    marginTop: 30,
    paddingTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#999",
    textAlign: "center",
    borderTop: "0.5 solid #eee",
    paddingTop: 8,
  },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.col}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

export function UpliftmentInstructionDocument({
  data,
}: {
  data: UpliftmentInstructionData;
}) {
  return (
    <Document
      title={`Upliftment Instruction - ${data.stockNumber}`}
      author="Motorcycle Salvage"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>MOTORCYCLE SALVAGE</Text>
            <Text style={styles.companySubtitle}>SOUTH AFRICA</Text>
          </View>
          <View>
            <Text style={styles.title}>Upliftment Instruction</Text>
            <Text style={styles.stockNumber}>Stock No. {data.stockNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Claim &amp; Insurance</Text>
          <View style={styles.row}>
            <Field label="File Number" value={dash(data.fileNumber)} />
            <Field label="Claim Number" value={dash(data.claimNumber)} />
          </View>
          <View style={styles.row}>
            <Field label="Insurer" value={dash(data.insuranceCompany)} />
            <Field label="Insured Name" value={dash(data.insuredName)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motorcycle</Text>
          <View style={styles.row}>
            <Field
              label="Make / Model"
              value={dash([data.make, data.model].filter(Boolean).join(" "))}
            />
            <Field label="Year" value={dash(data.year)} />
          </View>
          <View style={styles.row}>
            <Field label="Registration" value={dash(data.registrationNumber)} />
            <Field label="VIN" value={dash(data.vin)} />
          </View>
          <View style={styles.row}>
            <Field label="Colour" value={dash(data.colour)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transporter</Text>
          <View style={styles.row}>
            <Field label="Transporter" value={dash(data.transporterName)} />
            <Field label="Contact Person" value={dash(data.contactPerson)} />
          </View>
          <View style={styles.row}>
            <Field label="Contact Number" value={dash(data.contactNumber)} />
            <Field
              label="Date / Time"
              value={dash(
                [data.upliftmentDate, data.upliftmentTime].filter(Boolean).join(" ")
              )}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collection &amp; Delivery</Text>
          <View style={styles.addressBlock}>
            <View style={styles.addressCol}>
              <Text style={styles.addressLabel}>Pickup Address</Text>
              <Text style={styles.addressText}>{dash(data.pickupAddress)}</Text>
            </View>
            <View style={styles.addressCol}>
              <Text style={styles.addressLabel}>Delivery Address</Text>
              <Text style={styles.addressText}>{dash(data.deliveryAddress)}</Text>
            </View>
          </View>
        </View>

        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{data.notes}</Text>
          </View>
        )}

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLine}>Driver Signature &amp; Date</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLine}>Received By &amp; Date</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Generated {data.generatedAt} · Motorcycle Salvage Management Platform · This
          document is auto-populated from the bike record and issued for
          transporter use only.
        </Text>
      </Page>
    </Document>
  );
}
