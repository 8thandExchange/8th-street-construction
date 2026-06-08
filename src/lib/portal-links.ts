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
          "For 8th Street team members with admin access. Sign in with your email and password. No account? Request access below.",
      };
    case "client":
      return {
        eyebrow: "— Client sign in",
        title: "Client portal",
        description:
          "Access is by invitation only. Sign in with the email and temporary password your project manager sent you, then set your own password.",
      };
    case "subcontractor":
      return {
        eyebrow: "— Sub sign in",
        title: "Subcontractor portal",
        description:
          "For invited trade partners. Sign in with your email and password to view bid requests and submit proposals.",
      };
    default:
      return {
        eyebrow: "— Sign in",
        title: "Client & team portal",
        description:
          "Sign in with your email and password. Don't have access yet? Submit a request and an admin will review it.",
      };
  }
}
