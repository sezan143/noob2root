import jsPDF from "jspdf";

export type CertData = {
  recipient: string;
  course: string;
  date: string;
  number: string;
  instructor?: string;
};

export function generateCertificatePdf(data: CertData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(8, 12, 18);
  doc.rect(0, 0, W, H, "F");

  // Outer border
  doc.setDrawColor(45, 220, 130);
  doc.setLineWidth(3);
  doc.rect(20, 20, W - 40, H - 40);
  doc.setLineWidth(0.6);
  doc.setDrawColor(70, 90, 110);
  doc.rect(34, 34, W - 68, H - 68);

  // Brand
  doc.setTextColor(45, 220, 130);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("NOOB TO ROOT", W / 2, 90, { align: "center" });
  doc.setTextColor(150, 170, 190);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("FROM ZERO TO ROOT • LEARNING ACADEMY", W / 2, 108, { align: "center" });

  // Title
  doc.setTextColor(235, 245, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(46);
  doc.text("Certificate of Completion", W / 2, 190, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 180, 200);
  doc.setFontSize(14);
  doc.text("This certificate is proudly presented to", W / 2, 230, { align: "center" });

  // Recipient name
  doc.setTextColor(45, 220, 130);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.text(data.recipient, W / 2, 290, { align: "center" });

  // Underline under name
  doc.setDrawColor(45, 220, 130);
  doc.setLineWidth(1);
  const nameWidth = Math.min(doc.getTextWidth(data.recipient) + 80, W - 120);
  doc.line((W - nameWidth) / 2, 305, (W + nameWidth) / 2, 305);

  // Course line
  doc.setTextColor(200, 215, 230);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("for successfully completing the course", W / 2, 345, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(`"${data.course}"`, W / 2, 380, { align: "center" });

  // Footer line: signature + cert number
  doc.setDrawColor(80, 100, 120);
  doc.setLineWidth(0.5);
  doc.line(120, H - 110, 280, H - 110);
  doc.line(W - 280, H - 110, W - 120, H - 110);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 180, 200);
  doc.text(data.instructor ?? "Noob to Root Team", 200, H - 92, { align: "center" });
  doc.text("Instructor", 200, H - 78, { align: "center" });

  doc.text(data.date, W - 200, H - 92, { align: "center" });
  doc.text("Date Issued", W - 200, H - 78, { align: "center" });

  // Cert number bottom center
  doc.setFontSize(9);
  doc.setTextColor(120, 140, 160);
  doc.text(`Certificate ID: ${data.number}`, W / 2, H - 50, { align: "center" });
  doc.text("Verify at noob-to-root.com", W / 2, H - 38, { align: "center" });

  doc.save(`certificate-${data.number}.pdf`);
}
