// QR codes for circle invites, drawn by the apps as one SVG path so web and
// Android render the same image.
import makeQr from "qrcode-generator";

export interface QrPath {
  /** Modules per side, not counting the quiet zone. */
  size: number;
  /** "M0 0h7v1h-7z…": one run of dark modules per segment, in module units. */
  path: string;
}

/** Medium error correction: still scans when the screen is a little dirty. */
export function qrPath(text: string): QrPath {
  const qr = makeQr(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let path = "";
  for (let row = 0; row < size; row += 1) {
    let col = 0;
    while (col < size) {
      if (!qr.isDark(row, col)) {
        col += 1;
        continue;
      }
      let run = 1;
      while (col + run < size && qr.isDark(row, col + run)) {
        run += 1;
      }
      path += `M${col} ${row}h${run}v1h-${run}z`;
      col += run;
    }
  }
  return { path, size };
}
