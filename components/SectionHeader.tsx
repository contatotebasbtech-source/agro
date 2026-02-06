type Props = {
  title: string;
  subtitle: string;
};

export default function SectionHeader({ title, subtitle }: Props) {
  return (
    <header className="section-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </header>
  );
}
