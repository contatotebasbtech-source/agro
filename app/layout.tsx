import "./globals.css";
import TopMenu from "../components/TopMenu";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <TopMenu />
        {children}
      </body>
    </html>
  );
}
//texttext