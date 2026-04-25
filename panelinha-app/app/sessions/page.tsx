import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("starts_at", { ascending: false });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff8e1 0%, #ffffff 100%)",
        padding: "32px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #FF2800 0%, #FF6A00 100%)",
            color: "#fff",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 10px 30px rgba(255, 40, 0, 0.25)",
            marginBottom: 24,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>
            Horários da Pelada
          </h1>

          <p style={{ marginTop: 10, marginBottom: 18, fontSize: 16 }}>
            Crie, acompanhe e organize os horários do futebol.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="/sessions/new" style={{ textDecoration: "none" }}>
              <button
                style={{
                  background: "#FFCA28",
                  color: "#7a0000",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                + Criar novo horário
              </button>
            </a>

            <a href="/" style={{ textDecoration: "none" }}>
              <button
                style={{
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.45)",
                  borderRadius: 12,
                  padding: "12px 18px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Voltar para início
              </button>
            </a>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#fff0f0",
              border: "1px solid #ffb3b3",
              color: "#b00020",
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(error, null, 2)}
          </div>
        )}

        {!error && (!data || data.length === 0) && (
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 24,
              boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
              textAlign: "center",
              color: "#444",
            }}
          >
            Nenhum horário cadastrado ainda.
          </div>
        )}

        {!error && data && data.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
            }}
          >
            {data.map((session) => (
              <div
                key={session.id}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: 18,
                  border: "2px solid #ffe082",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#b71c1c",
                    marginBottom: 10,
                  }}
                >
                  {session.name}
                </div>

                <InfoRow label="Local" value={session.location || "-"} />
                <InfoRow
                  label="Data"
                  value={new Date(session.starts_at).toLocaleString("pt-BR")}
                />
                <InfoRow
                  label="Jogadores por time"
                  value={String(session.line_players_per_team)}
                />
                <InfoRow
                  label="Duração"
                  value={`${session.match_minutes} min`}
                />
                <InfoRow label="Status" value={translateStatus(session.status)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function InfoRow({
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
        background: "#fafafa",
        border: "1px solid #eee",
        borderRadius: 12,
        padding: "10px 12px",
        marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: "#222", fontWeight: 800 }}>
        {value}
      </span>
    </div>
  );
}

function translateStatus(status: string) {
  if (status === "draft") return "Rascunho";
  if (status === "in_progress") return "Em andamento";
  if (status === "finished") return "Finalizado";
  return status;
}