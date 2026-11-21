import { qrPath } from "@mindfulverse/core/qr";
import { useMemo } from "react";

const QUIET = 2;

/** The circle's invite link as a QR code, dark on white so any phone camera
 *  reads it in light or night theme. */
export default function CircleQr({
  url,
  label,
}: {
  url: string;
  label: string;
}) {
  const qr = useMemo(() => qrPath(url), [url]);
  const span = qr.size + QUIET * 2;
  return (
    <svg
      className="circle-qr"
      viewBox={`${-QUIET} ${-QUIET} ${span} ${span}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect x={-QUIET} y={-QUIET} width={span} height={span} fill="#fff" />
      <path d={qr.path} fill="#161a2e" />
    </svg>
  );
}
