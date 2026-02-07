import './globals.css';

export const metadata = {
  title: 'Tebas Tech Agro',
  description: 'Painel agrícola por produção',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
//text