import jsPDF from "jspdf";

export type CertData = {
  recipient: string;
  course: string;
  date: string;
  number: string;
  instructor?: string;
};

/* ------------------------------------------------------------------ */
/* Palette (RGB)                                                       */
/* ------------------------------------------------------------------ */
const BG       = [10, 14, 20]   as const;  // deep navy/black
const BG_SOFT  = [16, 22, 30]   as const;
const GREEN    = [45, 220, 130] as const;  // premium neon green
const GREEN_DK = [22, 140, 82]  as const;
const GOLD     = [212, 175, 55] as const;
const GOLD_DK  = [156, 124, 30] as const;
const WHITE    = [240, 246, 252] as const;
const MUTED    = [165, 180, 200] as const;
const FAINT    = [70, 86, 104]   as const;

const setFill = (doc: jsPDF, c: readonly [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
const setDraw = (doc: jsPDF, c: readonly [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
const setText = (doc: jsPDF, c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

/* ------------------------------------------------------------------ */
/* Logo — terminal-style mark + wordmark, drawn as vectors            */
/* ------------------------------------------------------------------ */
function drawLogo(doc: jsPDF, cx: number, cy: number) {
  // Hex tile background
  const r = 22;
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  setFill(doc, BG_SOFT);
  setDraw(doc, GREEN);
  doc.setLineWidth(1.4);
  doc.lines(
    pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]).concat([[pts[0][0] - pts[5][0], pts[0][1] - pts[5][1]]]),
    pts[0][0], pts[0][1], [1, 1], "FD"
  );

  // ">_" prompt glyph inside
  setText(doc, GREEN);
  doc.setFont("courier", "bold");
  doc.setFontSize(20);
  doc.text(">_", cx, cy + 6, { align: "center" });

  // Wordmark to the right
  setText(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("NOOB", cx + 36, cy - 2);
  setText(doc, GREEN);
  doc.text("TO", cx + 36 + doc.getTextWidth("NOOB ") - 2, cy - 2);
  setText(doc, WHITE);
  doc.text("ROOT", cx + 36 + doc.getTextWidth("NOOB TO ") - 2, cy - 2);

  // Tagline
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("FROM ZERO TO ROOT  •  LEARNING ACADEMY", cx + 36, cy + 10, { charSpace: 1.2 });
}

/* ------------------------------------------------------------------ */
/* Decorative corner ornaments                                         */
/* ------------------------------------------------------------------ */
function drawCornerOrnament(doc: jsPDF, x: number, y: number, flipX: boolean, flipY: boolean) {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  setDraw(doc, GOLD);
  doc.setLineWidth(0.8);
  // L bracket
  doc.line(x, y, x + 38 * sx, y);
  doc.line(x, y, x, y + 38 * sy);
  setDraw(doc, GOLD_DK);
  doc.setLineWidth(0.4);
  doc.line(x + 4 * sx, y + 4 * sy, x + 30 * sx, y + 4 * sy);
  doc.line(x + 4 * sx, y + 4 * sy, x + 4 * sx, y + 30 * sy);
  // Diamond accent
  setFill(doc, GOLD);
  doc.triangle(
    x + 8 * sx, y + 8 * sy,
    x + 14 * sx, y + 5 * sy,
    x + 11 * sx, y + 11 * sy,
    "F"
  );
}

/* ------------------------------------------------------------------ */
/* Official seal / emblem                                              */
/* ------------------------------------------------------------------ */
function drawSeal(doc: jsPDF, cx: number, cy: number) {
  // Outer ring
  setDraw(doc, GOLD);
  doc.setLineWidth(1.6);
  doc.circle(cx, cy, 38, "S");
  doc.setLineWidth(0.4);
  setDraw(doc, GOLD_DK);
  doc.circle(cx, cy, 34, "S");

  // Tick marks around ring
  setDraw(doc, GOLD);
  doc.setLineWidth(0.6);
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * 2 * i) / 24;
    const x1 = cx + 35 * Math.cos(a);
    const y1 = cy + 35 * Math.sin(a);
    const x2 = cx + 37 * Math.cos(a);
    const y2 = cy + 37 * Math.sin(a);
    doc.line(x1, y1, x2, y2);
  }

  // Inner star
  setFill(doc, GREEN);
  const star: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? 16 : 7;
    star.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  doc.lines(
    star.slice(1).map((p, i) => [p[0] - star[i][0], p[1] - star[i][1]]).concat([[star[0][0] - star[9][0], star[0][1] - star[9][1]]]),
    star[0][0], star[0][1], [1, 1], "F"
  );

  // Inner ring text - "VERIFIED • NOOB TO ROOT •"
  setText(doc, GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("OFFICIAL  •  CERTIFIED  •  ACADEMY", cx, cy + 28, { align: "center", charSpace: 1 });
}

/* ------------------------------------------------------------------ */
export function generateCertificatePdf(data: CertData) {
  // Wide professional landscape — A3 landscape for a premium feel
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  /* Background */
  setFill(doc, BG);
  doc.rect(0, 0, W, H, "F");

  // Subtle radial-ish layered panel
  setFill(doc, BG_SOFT);
  doc.rect(40, 40, W - 80, H - 80, "F");

  /* Faint grid pattern (very subtle, expert craft) */
  setDraw(doc, FAINT);
  doc.setLineWidth(0.15);
  for (let x = 80; x < W - 80; x += 28) doc.line(x, 70, x, H - 70);
  for (let y = 80; y < H - 80; y += 28) doc.line(70, y, W - 70, y);

  /* Double border — outer gold thick, inner gold thin, then green hairline */
  setDraw(doc, GOLD);
  doc.setLineWidth(2.4);
  doc.rect(34, 34, W - 68, H - 68);
  doc.setLineWidth(0.5);
  setDraw(doc, GOLD_DK);
  doc.rect(46, 46, W - 92, H - 92);
  setDraw(doc, GREEN_DK);
  doc.setLineWidth(0.4);
  doc.rect(54, 54, W - 108, H - 108);

  /* Corner ornaments */
  drawCornerOrnament(doc, 62, 62, false, false);
  drawCornerOrnament(doc, W - 62, 62, true, false);
  drawCornerOrnament(doc, 62, H - 62, false, true);
  drawCornerOrnament(doc, W - 62, H - 62, true, true);

  /* Top — Logo */
  drawLogo(doc, W / 2 - 70, 110);

  /* Decorative divider */
  setDraw(doc, GOLD);
  doc.setLineWidth(0.6);
  doc.line(W / 2 - 180, 150, W / 2 - 20, 150);
  doc.line(W / 2 + 20, 150, W / 2 + 180, 150);
  setFill(doc, GOLD);
  doc.circle(W / 2, 150, 3, "F");
  doc.circle(W / 2 - 12, 150, 1.4, "F");
  doc.circle(W / 2 + 12, 150, 1.4, "F");

  /* Title */
  setText(doc, WHITE);
  doc.setFont("times", "normal");
  doc.setFontSize(62);
  doc.text("Certificate", W / 2, 220, { align: "center" });
  setText(doc, GOLD);
  doc.setFont("times", "italic");
  doc.setFontSize(28);
  doc.text("of Completion", W / 2, 258, { align: "center" });

  /* Eyebrow */
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("THIS CERTIFICATE IS PROUDLY PRESENTED TO", W / 2, 305, { align: "center", charSpace: 3 });

  /* Recipient name — elegant serif */
  setText(doc, GREEN);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(58);
  doc.text(data.recipient, W / 2, 380, { align: "center" });

  // Underline flourish under name
  setDraw(doc, GOLD);
  doc.setLineWidth(0.8);
  const nameW = Math.min(doc.getTextWidth(data.recipient) + 120, W - 220);
  doc.line((W - nameW) / 2, 398, (W + nameW) / 2, 398);
  setFill(doc, GOLD);
  doc.circle(W / 2, 398, 2.2, "F");

  /* Course intro */
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(
    "for successfully completing all modules, hands-on labs, and assessments of the course",
    W / 2, 432, { align: "center" }
  );

  /* Course name */
  setText(doc, WHITE);
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.text(`“${data.course}”`, W / 2, 478, { align: "center" });

  /* Body paragraph */
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(
    "demonstrating commitment, technical proficiency, and the curiosity that defines a true builder.",
    W / 2, 506, { align: "center" }
  );

  /* ---------- Footer block ---------- */
  const footY = H - 150;

  // Left signature
  setDraw(doc, GOLD);
  doc.setLineWidth(0.6);
  doc.line(120, footY, 320, footY);
  setText(doc, WHITE);
  doc.setFont("times", "italic");
  doc.setFontSize(18);
  doc.text(data.instructor ?? "Noob to Root", 220, footY - 8, { align: "center" });
  setText(doc, MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("INSTRUCTOR  •  FOUNDER", 220, footY + 14, { align: "center", charSpace: 2 });

  // Right — date
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.line(W - 320, footY, W - 120, footY);
  setText(doc, WHITE);
  doc.setFont("times", "italic");
  doc.setFontSize(18);
  doc.text(data.date, W - 220, footY - 8, { align: "center" });
  setText(doc, MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("DATE OF ISSUE", W - 220, footY + 14, { align: "center", charSpace: 2 });

  // Center — seal
  drawSeal(doc, W / 2, footY + 4);

  /* Bottom ID + verify */
  setText(doc, MUTED);
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text(`CERTIFICATE ID:  ${data.number}`, W / 2, H - 70, { align: "center", charSpace: 1 });
  setText(doc, FAINT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Verify authenticity at  noob-to-root.com/verify", W / 2, H - 56, { align: "center" });

  doc.save(`noob-to-root-certificate-${data.number}.pdf`);
}
