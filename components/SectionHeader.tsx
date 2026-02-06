export default function SectionHeader({title, subtitle}:{title:string, subtitle:string}){
  return (
    <header>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </header>
  )
}
