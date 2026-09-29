import logo from "@/assets/logo.png";

const drinks = [
  { name: "WHISKY COMBO", color: "from-purple-900 to-gray-900" },
  { name: "VODKA COMBO", color: "from-blue-400 to-blue-600" },
  { name: "MELANCIA GIN COMBO", color: "from-pink-500 to-red-500" },
  { name: "WHISKY COMBO Y", color: "from-yellow-400 to-yellow-500" },
];

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-10">
      <div className="container space-y-8">
        {/* Logo & brand */}
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Mansão Maromba" className="w-16 h-16 object-contain" width={64} height={64} />
          <p className="font-heading font-black text-base tracking-wider text-foreground">
            REPRESENTANTE OFICIAL DA FAMÍLIA MAROMBA
          </p>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Portal exclusivo de atacado para revendedores autorizados.
          </p>
        </div>

        {/* Drinks list */}
        <div className="space-y-3">
          <h3 className="font-heading font-bold text-xs tracking-[0.3em] text-primary text-center">
            NOSSOS DRINKS
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {drinks.map((d) => (
              <div
                key={d.name}
                className="flex items-center gap-3 bg-secondary rounded-lg p-3 border border-border hover:border-primary/30 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${d.color} shrink-0`} />
                <span className="font-heading font-bold text-[10px] tracking-wider text-foreground">
                  {d.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[10px] text-muted-foreground font-heading tracking-wider pt-4 border-t border-border">
          © 2026 MANSÃO MAROMBA — TODOS OS DIREITOS RESERVADOS
        </div>
      </div>
    </footer>
  );
};

export default Footer;
