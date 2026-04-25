export default function HomePage() {
  const cards = [
    {
      title: "Jogadores",
      description: "Visualizar todos os jogadores cadastrados no grupo.",
      href: "/players",
      buttonLabel: "Ver jogadores",
    },
    {
      title: "Novo jogador",
      description: "Cadastrar jogador oficial, convidado ou goleiro.",
      href: "/players/new",
      buttonLabel: "Cadastrar agora",
    },
    {
     title: "Horários",
     description: "Criar, visualizar e organizar os horários da pelada.",
     href: "/sessions",
     buttonLabel: "Ver horários",
    },
    {
      title: "Times",
      description: "Em breve: montagem automática e equilibrada dos times.",
      href: "#",
      buttonLabel: "Em breve",
      disabled: true,
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff8e1 0%, #ffffff 100%)",
        padding: "32px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        <section
          style={{
            background: "linear-gradient(135deg, #FF2800 0%, #FF2800 100%)",
            color: "#fff",
            borderRadius: 24,
            padding: "32px 28px",
            boxShadow: "0 12px 30px rgba(213, 0, 0, 0.24)",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                  opacity: 0.9,
                  marginBottom: 10,
                  textTransform: "uppercase",
                }}
              >
                Painel principal
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 40,
                  fontWeight: 900,
                  lineHeight: 1.1,
                }}
              >
                Panelinha FC
              </h1>

              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  maxWidth: 620,
                  fontSize: 17,
                  lineHeight: 1.6,
                  opacity: 0.96,
                }}
              >
                Sistema de gestão da pelada, com cadastro de jogadores,
                controle do grupo e base pronta para evolução do sorteio,
                partidas e ranking.
              </p>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 20,
                padding: "18px 20px",
                minWidth: 240,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  textTransform: "uppercase",
                  fontWeight: 800,
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                Status do projeto
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <StatusRow label="Supabase" value="Conectado" />
                <StatusRow label="Cadastro" value="Funcionando" />
                <StatusRow label="Listagem" value="Funcionando" />
                <StatusRow label="Próximo módulo" value="Horários" />
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              marginBottom: 16,
              color: "#7a0000",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            Acesso rápido
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 18,
            }}
          >
            {cards.map((card) => (
              <div
                key={card.title}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: 20,
                  border: "2px solid #ffe082",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 22,
                      color: "#FF2800",
                      fontWeight: 900,
                    }}
                  >
                    {card.title}
                  </h2>

                  <p
                    style={{
                      marginTop: 10,
                      marginBottom: 0,
                      color: "#555",
                      lineHeight: 1.6,
                      fontSize: 15,
                    }}
                  >
                    {card.description}
                  </p>
                </div>

                {card.disabled ? (
                  <button
                    disabled
                    style={{
                      background: "#f5f5f5",
                      color: "#999",
                      border: "1px solid #ddd",
                      borderRadius: 12,
                      padding: "12px 16px",
                      fontWeight: 800,
                      cursor: "not-allowed",
                    }}
                  >
                    {card.buttonLabel}
                  </button>
                ) : (
                  <a href={card.href} style={{ textDecoration: "none" }}>
                    <button
                      style={{
                        width: "100%",
                        background: "#ffca28",
                        color: "#7a0000",
                        border: "none",
                        borderRadius: 12,
                        padding: "12px 16px",
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      }}
                    >
                      {card.buttonLabel}
                    </button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            border: "2px solid #ffe082",
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 12,
              color: "#FF2800",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            Próximos passos do Panelinha FC
          </h3>

          <div style={{ display: "grid", gap: 12 }}>
            <StepItem text="Criar módulo de horários da pelada" />
            <StepItem text="Selecionar jogadores presentes" />
            <StepItem text="Montar times equilibrados automaticamente" />
            <StepItem text="Registrar partidas, vitórias, empates e derrotas" />
            <StepItem text="Gerar ranking do dia, mês e ano" />
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 14,
      }}
    >
      <span style={{ opacity: 0.92 }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StepItem({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "#fff8e1",
        border: "1px solid #ffd54f",
        borderRadius: 12,
        padding: "12px 14px",
        color: "#5d4037",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}