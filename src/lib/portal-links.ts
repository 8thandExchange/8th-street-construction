export type PortalKind = "client" | "subcontractor" | "admin" | "default";

export const PORTAL_LOGIN_LINKS = [
  { href: "/login?redirect=/client", label: "Client Portal", kind: "client" as const },
  { href: "/login?redirect=/subs", label: "Subcontractors", kind: "subcontractor" as const },
  { href: "/login?redirect=/admin", label: "Admin", kind: "admin" as const },
];

export function getPortalKind(redirect: string): PortalKind {
  if (redirect.startsWith("/admin")) return "admin";
  if (redirect.startsWith("/subs")) return "subcontractor";
  if (redirect.startsWith("/client")) return "client";
  return "default";
}

export function getPortalLoginCopy(kind: PortalKind) {
  switch (kind) {
    case "admin":
      return {
        eyebrow: "— Admin sign in",
        title: "Admin portal",
        description:
          "For 8th Street team members with admin access. Enter your approved email and we'll send a one-time sign-in link.",
      };
    case "client":
      return {
        eyebrow: "— Client sign in",
        title: "Client portal",
        description:
          "Access is by invitation only. If your project manager has approved you, enter your email and we'll send a one-time sign-in link.",
      };
    case "subcontractor":
      return {
        eyebrow: "— Sub sign in",
        title: "Subcontractor portal",
        description:
          "For invited trade partners. Enter your approved email and we'll send a one-time sign-in link to view bid requests and submit proposals.",
      };
    default:
      return {
        eyebrow: "— Sign in",
        title: "Client & team portal",
        description:
          "Access is by invitation only. Enter your approved email and we'll send a one-time sign-in link to the right portal for your role.",
      };
  }
}
