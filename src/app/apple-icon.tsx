import { renderAppIcon } from "@/lib/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS arrotonda da sé gli angoli: icona piena
export default function AppleIcon() {
  return renderAppIcon(180, { maskable: true });
}
