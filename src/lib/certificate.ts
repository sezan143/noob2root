import jsPDF from "jspdf";
import { DEFAULT_SIGNATURES, type CertSignature } from "./certSignatures";

export type CertData = {
  recipient: string;
  course: string;
  date: string;
  number: string;
  category?: string;          // e.g. "PRO COURSE", "FOUNDATIONS"
  lengthHours?: number;
  cpeCredits?: number;
  location?: string;
  subjects?: string[];
  heroImage?: string;
  signatures?: CertSignature[];
  /** @deprecated kept for backward compat */
  instructor?: string;
};

/* ============================================================
 * Palette — mirrors src/index.css design tokens (RGB)
 * bg #0A0A0A, neon-green 157/100/50, cyan 190/100/50, magenta 265/100/65
 * ============================================================ */
const BG       = [10, 10, 10]    as const; // --background
const BG_CARD  = [18, 18, 18]    as const; // --card
const BG_SOFT  = [26, 28, 30]    as const;
const NEON     = [0, 255, 162]   as const; // --primary (neon green)
const NEON_DK  = [0, 170, 110]   as const;
const CYAN     = [0, 229, 255]   as const; // --secondary
const MAGENTA  = [156, 92, 255]  as const; // --accent
const WHITE    = [245, 248, 250] as const;
const MUTED    = [140, 150, 160] as const;
const HAIRLINE = [40, 44, 48]    as const;
const INK      = [8, 10, 12]     as const;

const setFill = (d: jsPDF, c: readonly [number, number, number]) => d.setFillColor(c[0], c[1], c[2]);
const setDraw = (d: jsPDF, c: readonly [number, number, number]) => d.setDrawColor(c[0], c[1], c[2]);
const setText = (d: jsPDF, c: readonly [number, number, number]) => d.setTextColor(c[0], c[1], c[2]);

type GStateCtor = { GState: new (o: { opacity: number }) => unknown };
const opacity = (doc: jsPDF, a: number) =>
  doc.setGState(new (doc as unknown as GStateCtor).GState({ opacity: a }));

/* ------------------------------------------------------------------ */
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
const detectImgFmt = (d: string): "PNG" | "JPEG" =>
  /^data:image\/jpe?g/i.test(d) ? "JPEG" : "PNG";

/* ------------------------------------------------------------------ */
/* Backplate — deep black with subtle dotted grid + corner glow        */
/* ------------------------------------------------------------------ */
function drawBackdrop(doc: jsPDF, W: number, H: number) {
  // Solid base
  setFill(doc, BG);
  doc.rect(0, 0, W, H, "F");

  // Faint dot grid
  setFill(doc, HAIRLINE);
  opacity(doc, 0.55);
  for (let y = 30; y < H - 20; y += 18) {
    for (let x = 30; x < W - 20; x += 18) {
      doc.circle(x, y, 0.35, "F");
    }
  }
  opacity(doc, 1);

  // Soft radial glows in corners (stacked translucent circles)
  const glow = (cx: number, cy: number, color: readonly [number, number, number]) => {
    for (let i = 6; i >= 1; i--) {
      opacity(doc, 0.05);
      setFill(doc, color);
      doc.circle(cx, cy, i * 38, "F");
    }
    opacity(doc, 1);
  };
  glow(40, 40, NEON);
  glow(W - 40, H - 40, CYAN);
  glow(W - 60, 60, MAGENTA);

  // Outer hairline frame with cut corners
  const m = 22;
  setDraw(doc, NEON);
  doc.setLineWidth(0.6);
  // top + bottom
  doc.line(m + 14, m, W - m - 14, m);
  doc.line(m + 14, H - m, W - m - 14, H - m);
  // sides
  doc.line(m, m + 14, m, H - m - 14);
  doc.line(W - m, m + 14, W - m, H - m - 14);
  // diagonal corner cuts
  doc.line(m, m + 14, m + 14, m);
  doc.line(W - m - 14, m, W - m, m + 14);
  doc.line(m, H - m - 14, m + 14, H - m);
  doc.line(W - m - 14, H - m, W - m, H - m - 14);

  // Inner hairline
  const m2 = 30;
  setDraw(doc, HAIRLINE);
  doc.setLineWidth(0.3);
  doc.rect(m2, m2, W - m2 * 2, H - m2 * 2, "S");

  // Corner brackets (terminal-style)
  const bracket = (x: number, y: number, sx: number, sy: number) => {
    setDraw(doc, CYAN);
    doc.setLineWidth(0.8);
    doc.line(x, y, x + 18 * sx, y);
    doc.line(x, y, x, y + 18 * sy);
  };
  bracket(m2 + 8, m2 + 8, 1, 1);
  bracket(W - m2 - 8, m2 + 8, -1, 1);
  bracket(m2 + 8, H - m2 - 8, 1, -1);
  bracket(W - m2 - 8, H - m2 - 8, -1, -1);
}

/* ------------------------------------------------------------------ */
/* Brand lockup                                                        */
/* ------------------------------------------------------------------ */
function drawBrand(doc: jsPDF, x: number, y: number) {
  const r = 13;
  const cx = x + r, cy = y + r;
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  // Glow halo
  opacity(doc, 0.25);
  setFill(doc, NEON);
  doc.circle(cx, cy, r + 4, "F");
  opacity(doc, 1);

  setFill(doc, BG_CARD);
  setDraw(doc, NEON);
  doc.setLineWidth(1.2);
  doc.lines(
    pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]])
       .concat([[pts[0][0] - pts[5][0], pts[0][1] - pts[5][1]]]),
    pts[0][0], pts[0][1], [1, 1], "FD"
  );
  setText(doc, NEON);
  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  doc.text(">_", cx, cy + 4, { align: "center" });

  // Wordmark
  setText(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("NOOB", cx + r + 10, cy - 1);
  const w1 = doc.getTextWidth("NOOB ");
  setText(doc, NEON);
  doc.text("TO", cx + r + 10 + w1, cy - 1);
  const w2 = doc.getTextWidth("NOOB TO ");
  setText(doc, WHITE);
  doc.text("ROOT", cx + r + 10 + w2, cy - 1);

  setText(doc, MUTED);
  doc.setFont("courier", "normal");
  doc.setFontSize(6.4);
  doc.text("// FROM ZERO TO ROOT", cx + r + 10, cy + 7, { charSpace: 0.6 });
}

/* ------------------------------------------------------------------ */
/* Holographic seal — refined concentric rings, no scallops            */
/* ------------------------------------------------------------------ */
function drawSeal(doc: jsPDF, cx: number, cy: number, R = 56) {
  // Outer aura
  opacity(doc, 0.18);
  setFill(doc, MAGENTA);
  doc.circle(cx, cy, R + 8, "F");
  opacity(doc, 0.22);
  setFill(doc, CYAN);
  doc.circle(cx, cy, R + 4, "F");
  opacity(doc, 1);

  // Holographic disk (offset translucent layers)
  const layers: Array<readonly [number, number, number]> = [CYAN, MAGENTA, NEON];
  layers.forEach((c, i) => {
    opacity(doc, 0.35 - i * 0.08);
    setFill(doc, c);
    doc.circle(cx + (i - 1) * 3, cy + (i - 1) * 3, R, "F");
  });
  opacity(doc, 1);

  // Tick marks around perimeter
  setDraw(doc, NEON);
  doc.setLineWidth(0.6);
  for (let i = 0; i < 60; i++) {
    const a = (Math.PI * 2 * i) / 60;
    const long = i % 5 === 0;
    const r1 = R - (long ? 6 : 3);
    const r2 = R - 1;
    doc.line(
      cx + r1 * Math.cos(a), cy + r1 * Math.sin(a),
      cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)
    );
  }

  // Inner core
  setFill(doc, BG);
  doc.circle(cx, cy, R - 12, "F");
  setDraw(doc, CYAN);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, R - 12, "S");
  setDraw(doc, NEON_DK);
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, R - 18, "S");

  // Center hex
  const r = R - 26;
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  setFill(doc, NEON);
  doc.lines(
    pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]])
       .concat([[pts[0][0] - pts[5][0], pts[0][1] - pts[5][1]]]),
    pts[0][0], pts[0][1], [1, 1], "F"
  );
  setText(doc, INK);
  doc.setFont("courier", "bold");
  doc.setFontSize(r * 0.85);
  doc.text(">_", cx, cy + r * 0.3, { align: "center" });

  // Curved-ish ring text (straight, top + bottom)
  setText(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("NOOB TO ROOT  •  CERTIFIED", cx, cy - R + 6, { align: "center", charSpace: 1.4 });
  doc.text("AUTHENTIC  •  SINCE 2026", cx, cy + R - 2, { align: "center", charSpace: 1.4 });
}

/* ------------------------------------------------------------------ */
/* Signature block                                                     */
/* ------------------------------------------------------------------ */
function drawSignature(doc: jsPDF, x: number, y: number, sig: CertSignature, w = 150) {
  if (sig.image) {
    try {
      doc.addImage(sig.image, detectImgFmt(sig.image), x, y - 28, w, 28, undefined, "FAST");
    } catch {
      setText(doc, WHITE);
      doc.setFont("times", "italic");
      doc.setFontSize(20);
      doc.text(sig.name, x, y - 6);
    }
  } else {
    setText(doc, WHITE);
    doc.setFont("times", "italic");
    doc.setFontSize(20);
    doc.text(sig.name, x, y - 6);
  }
  setDraw(doc, NEON);
  doc.setLineWidth(0.5);
  doc.line(x, y, x + w, y);
  // tiny tick at end
  doc.line(x + w, y - 2, x + w, y + 2);

  setText(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(sig.name.toUpperCase(), x, y + 11, { charSpace: 1 });
  setText(doc, MUTED);
  doc.setFont("courier", "normal");
  doc.setFontSize(7.2);
  doc.text(sig.role.toUpperCase(), x, y + 20, { charSpace: 1 });
}

/* ------------------------------------------------------------------ */
/* Metadata "chip"                                                     */
/* ------------------------------------------------------------------ */
function drawMetaChip(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string) {
  // glass card
  setFill(doc, BG_SOFT);
  doc.roundedRect(x, y, w, h, 4, 4, "F");
  setDraw(doc, HAIRLINE);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 4, 4, "S");
  // accent bar
  setFill(doc, NEON);
  doc.rect(x, y, 2, h, "F");

  setText(doc, MUTED);
  doc.setFont("courier", "normal");
  doc.setFontSize(6.8);
  doc.text(label.toUpperCase(), x + 9, y + 11, { charSpace: 1.2 });
  setText(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(value, x + 9, y + h - 8);
}

/* ------------------------------------------------------------------ */
export async function generateCertificatePdf(data: CertData) {
  const signaturesRaw = data.signatures ??
    (data.instructor
      ? [{ name: data.instructor, role: "Course Instructor" }, DEFAULT_SIGNATURES[0]]
      : DEFAULT_SIGNATURES);
  const signatures: CertSignature[] = await Promise.all(
    signaturesRaw.slice(0, 2).map(async (s) => {
      if (s.image && /^https?:/i.test(s.image)) {
        const d = await urlToDataUrl(s.image);
        return { ...s, image: d ?? undefined };
      }
      return s;
    })
  );

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  /* Backdrop + frame */
  drawBackdrop(doc, W, H);

  /* Header row: brand (left) + cert ID chip (right) */
  drawBrand(doc, 50, 50);

  // Top-right chip with cert ID
  const chipW = 200, chipH = 26;
  const chipX = W - 50 - chipW;
  const chipY = 50;
  setFill(doc, BG_SOFT);
  doc.roundedRect(chipX, chipY, chipW, chipH, 13, 13, "F");
  setDraw(doc, NEON);
  doc.setLineWidth(0.5);
  doc.roundedRect(chipX, chipY, chipW, chipH, 13, 13, "S");
  // status dot
  setFill(doc, NEON);
  doc.circle(chipX + 12, chipY + chipH / 2, 2.6, "F");
  opacity(doc, 0.5);
  doc.circle(chipX + 12, chipY + chipH / 2, 5, "F");
  opacity(doc, 1);
  setText(doc, MUTED);
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.text("CERT.ID", chipX + 22, chipY + 11, { charSpace: 1 });
  setText(doc, WHITE);
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.text(data.number, chipX + 22, chipY + 21);

  /* Eyebrow + title block (centered) */
  const titleY = 130;

  // Category eyebrow with dashes
  if (data.category || true) {
    const cat = (data.category || "Certificate").toUpperCase();
    setText(doc, NEON);
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    const tw = doc.getTextWidth(cat);
    doc.text(cat, W / 2, titleY, { align: "center", charSpace: 3 });
    setDraw(doc, NEON);
    doc.setLineWidth(0.6);
    doc.line(W / 2 - tw / 2 - 30, titleY - 2.5, W / 2 - tw / 2 - 8, titleY - 2.5);
    doc.line(W / 2 + tw / 2 + 8, titleY - 2.5, W / 2 + tw / 2 + 30, titleY - 2.5);
  }

  // "Certificate of Completion"
  setText(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("CERTIFICATE OF COMPLETION", W / 2, titleY + 32, { align: "center", charSpace: 2 });

  // Subtle gradient underline (cyan→neon→magenta) using stacked rects
  const ulY = titleY + 40;
  const ulW = 280;
  const ulX = W / 2 - ulW / 2;
  const seg = ulW / 30;
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    const r = Math.round(CYAN[0] * (1 - t) + MAGENTA[0] * t);
    const g = Math.round(CYAN[1] * (1 - t) + MAGENTA[1] * t);
    const b = Math.round(CYAN[2] * (1 - t) + MAGENTA[2] * t);
    doc.setFillColor(r, g, b);
    doc.rect(ulX + i * seg, ulY, seg + 0.5, 1.5, "F");
  }

  /* Granting sentence */
  setText(doc, MUTED);
  doc.setFont("courier", "normal");
  doc.setFontSize(11);
  doc.text("$ this certificate is hereby granted to", W / 2, titleY + 66, { align: "center" });

  /* Recipient name — large display */
  setText(doc, WHITE);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(48);
  doc.text(data.recipient, W / 2, titleY + 112, { align: "center" });

  // Glow underline under name
  const nameW = Math.min(doc.getTextWidth(data.recipient) + 60, W - 200);
  const nx = W / 2 - nameW / 2;
  setDraw(doc, NEON);
  doc.setLineWidth(0.8);
  doc.line(nx, titleY + 122, nx + nameW, titleY + 122);
  opacity(doc, 0.4);
  doc.setLineWidth(2.5);
  doc.line(nx + 20, titleY + 122, nx + nameW - 20, titleY + 122);
  opacity(doc, 1);

  /* Course line */
  setText(doc, MUTED);
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.text("for successfully completing the course", W / 2, titleY + 142, { align: "center" });

  setText(doc, CYAN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`"${data.course}"`, W / 2, titleY + 162, { align: "center" });

  /* Metadata chips row */
  const metaY = H - 175;
  const cols = [
    { label: "Date Issued",  value: data.date },
    { label: "Length",       value: data.lengthHours ? `${data.lengthHours} hrs` : "—" },
    { label: "CPE Credits",  value: data.cpeCredits != null ? String(data.cpeCredits) : "—" },
    { label: "Location",     value: data.location ?? "Online" },
  ];
  const chipsTotalW = W - 100;
  const cw = (chipsTotalW - 3 * 10) / 4;
  cols.forEach((c, i) => drawMetaChip(doc, 50 + i * (cw + 10), metaY, cw, 38, c.label, c.value));

  /* Subjects line */
  if (data.subjects && data.subjects.length) {
    setText(doc, MUTED);
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.text("// SUBJECT AREAS COVERED", 50, metaY - 14, { charSpace: 1.2 });
    setText(doc, WHITE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(data.subjects.join("  ·  "), W - 100);
    doc.text(lines.slice(0, 1), 50, metaY - 4);
  }

  /* Footer: signatures (left) + seal (right) */
  const footY = H - 70;
  drawSignature(doc, 50, footY, signatures[0], 150);
  if (signatures[1]) drawSignature(doc, 220, footY, signatures[1], 150);

  // Seal
  drawSeal(doc, W - 100, footY - 18, 48);

  /* Bottom verify strip */
  setDraw(doc, HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(50, H - 36, W - 50, H - 36);
  setText(doc, MUTED);
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.text(`SHA  ${data.number}  ::  AUTH OK`, 50, H - 24, { charSpace: 1 });
  setText(doc, NEON);
  doc.text("verify  →  noobtoroot.com/verify", W - 50, H - 24, { align: "right", charSpace: 1 });

  doc.save(`noob-to-root-certificate-${data.number}.pdf`);
}
