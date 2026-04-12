const HomePage = () => {
  return (
    <div className="px-4 pt-12 animate-fade-in">
      <h1 className="font-display text-2xl font-bold text-foreground">Início</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Seu resumo financeiro aparecerá aqui.
      </p>
      <div className="mt-6 rounded-xl bg-card p-6 shadow-sm border border-border">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Saldo total</p>
        <p className="mt-1 font-display text-3xl font-bold text-foreground">R$ 0,00</p>
      </div>
    </div>
  );
};

export default HomePage;
