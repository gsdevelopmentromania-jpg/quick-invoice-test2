import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer as _renderToBuffer } from "@react-pdf/renderer";
import type { InvoiceWithClient } from "@/types";
import type { User } from "@prisma/client";

// Re-export renderToBuffer from @react-pdf/renderer
export { renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#111827",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  businessName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#6366f1",
    textAlign: "right",
  },
  label: {
    color: "#6b7280",
    fontSize: 9,
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: "#111827",
  },
  section: {
    marginBottom: 20,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  col: {
    flex: 1,
  },
  colRight: {
    flex: 1,
    textAlign: "right",
  },
  colWide: {
    flex: 3,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  totalsLabel: {
    width: 120,
    color: "#6b7280",
  },
  totalsValue: {
    width: 80,
    textAlign: "right",
  },
  grandTotal: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    color: "#9ca3af",
    fontSize: 8,
    textAlign: "center",
  },
});

type InvoicePDFProps = {
  invoice: InvoiceWithClient;
  user: Pick<User, "name" | "email" | "businessName" | "address" | "logoUrl"> | null;
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function InvoicePDF({ invoice, user }: InvoicePDFProps): React.ReactElement {
  const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (invoice.taxRate / 100);
  const total = subtotal + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>{user?.businessName ?? user?.name ?? "Freelancer"}</Text>
            {user?.address ? <Text style={styles.value}>{user.address}</Text> : null}
            {user?.email ? <Text style={styles.value}>{user.email}</Text> : null}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={[styles.label, { textAlign: "right" }]}># {invoice.number}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To + Dates */}
        <View style={[styles.section, { flexDirection: "row", justifyContent: "space-between" }]}>
          <View>
            <Text style={styles.label}>BILL TO</Text>
            <Text style={[styles.value, styles.bold]}>{invoice.client.name}</Text>
            {invoice.client.company ? <Text style={styles.value}>{invoice.client.company}</Text> : null}
            <Text style={styles.value}>{invoice.client.email}</Text>
            {invoice.client.address ? <Text style={styles.value}>{invoice.client.address}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.label}>ISSUE DATE</Text>
            <Text style={styles.value}>{new Date(invoice.issueDate).toLocaleDateString("en-US")}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>DUE DATE</Text>
            <Text style={styles.value}>{new Date(invoice.dueDate).toLocaleDateString("en-US")}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Line Items */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colWide, styles.bold]}>Description</Text>
          <Text style={[styles.col, styles.bold]}>Qty</Text>
          <Text style={[styles.col, styles.bold]}>Unit Price</Text>
          <Text style={[styles.colRight, styles.bold]}>Amount</Text>
        </View>

        {invoice.lineItems.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.colWide}>{item.description}</Text>
            <Text style={styles.col}>{item.quantity}</Text>
            <Text style={styles.col}>{formatCurrency(item.unitPrice, invoice.currency)}</Text>
            <Text style={styles.colRight}>{formatCurrency(item.amount, invoice.currency)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Subtotal</Text>
          <Text style={styles.totalsValue}>{formatCurrency(subtotal, invoice.currency)}</Text>
        </View>
        {invoice.taxRate > 0 ? (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax ({invoice.taxRate}%)</Text>
            <Text style={styles.totalsValue}>{formatCurrency(tax, invoice.currency)}</Text>
          </View>
        ) : null}
        <View style={[styles.totalsRow, { marginTop: 8 }]}>
          <Text style={[styles.totalsLabel, styles.grandTotal]}>Total Due</Text>
          <Text style={[styles.totalsValue, styles.grandTotal]}>
            {formatCurrency(total, invoice.currency)}
          </Text>
        </View>

        {/* Notes */}
        {invoice.notes ? (
          <View style={[styles.section, { marginTop: 24 }]}>
            <Text style={styles.label}>NOTES</Text>
            <Text style={styles.value}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* Payment Link */}
        {invoice.stripePaymentLinkUrl ? (
          <View style={[styles.section, { marginTop: 16 }]}>
            <Text style={styles.label}>PAY ONLINE</Text>
            <Text style={[styles.value, { color: "#6366f1" }]}>{invoice.stripePaymentLinkUrl}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business — Quick Invoice
        </Text>
      </Page>
    </Document>
  );
}
