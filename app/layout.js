import "./globals.css";

export const metadata = {
  title: "PennyPilot",
  description: "Simple family budget and bill tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
