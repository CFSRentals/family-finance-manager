export const metadata = {
  title: "Family Finance Manager",
  description: "Simple family budget and bill tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
