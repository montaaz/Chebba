import "server-only";
import QRCode from "qrcode";

export const SHARE_URL = "https://chebbautocar.com/";
const COLORS = { dark: "#021a1c", light: "#ffffff" };

/* error level "Q": still scans if a quarter of it is damaged, scratched or printed small */
export const qrSvg = (url = SHARE_URL) => QRCode.toString(url, { type: "svg", errorCorrectionLevel: "Q", margin: 1, color: COLORS });
export const qrPng = (url = SHARE_URL, width = 1024) => QRCode.toBuffer(url, { type: "png", errorCorrectionLevel: "Q", margin: 2, width, color: COLORS });
