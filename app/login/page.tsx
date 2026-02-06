export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Entrar</h1>
        <p>Acesse o painel Tebas Tech Agro.</p>
        <label>Email</label>
        <input type="email" placeholder="seu@email.com" />
        <label>Senha</label>
        <input type="password" placeholder="********" />
        <button>Entrar</button>
      </div>
    </div>
  );
}
