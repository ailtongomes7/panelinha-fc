import { supabase } from "@/lib/supabase";
import PlayerActions from "./PlayerActions";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const { data } = await supabase
    .from("players")
    .select("*")
    .order("nickname");

  return (
    <main style={{ padding: 24 }}>
      <h1>Panelinha FC</h1>

      <a href="/players/new">
        <button style={{ marginBottom: 20 }}>+ Novo jogador</button>
      </a>

      <div style={{ display: "grid", gap: 12 }}>
        {data?.map((player) => (
          <div
            key={player.id}
            style={{
              border: "1px solid #ddd",
              padding: 16,
              borderRadius: 10,
            }}
          >
            <strong>{player.nickname}</strong> ({player.name})

            <div>Tipo: {player.role}</div>
            <div>Participação: {player.participation}</div>

            {/* ⭐ NÍVEL COM ESTRELAS */}
            <div>
              Nível: {player.overall ?? "-"}{" "}
              {renderStars(player.overall)}
            </div>

            <PlayerActions playerId={player.id} />
          </div>
        ))}
      </div>
    </main>
  );
}

// ⭐ FUNÇÃO DE ESTRELAS
function renderStars(value: number | null) {
  if (!value) return "☆☆☆☆☆";

  const fullStars = Math.round(value);
  let stars = "";

  for (let i = 1; i <= 5; i++) {
    stars += i <= fullStars ? "⭐" : "☆";
  }

  return (
    <span style={{ color: "#FFD700", marginLeft: 6 }}>
      {stars}
    </span>
  );
}