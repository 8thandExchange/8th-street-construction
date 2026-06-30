import { Inter } from "next/font/google";
import "./invoicing.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function InvoicingRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={`inv-shell ${inter.variable}`}>{children}</div>;
}
