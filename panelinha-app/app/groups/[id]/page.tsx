"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
};

type Session = {
  id: string;
  name: string;
  location: string | null;
  starts_at: string;
  status: string;
};

type Player = {
  id: string;
  name: string;
  nickname: string;
  role: string;
  participation: string;
};

type PointRow = {
  id: string;
  session_id: string;
  match_id: string;
  player_id: string;
  points: number;
  result: "WIN" | "LOSS" | "DRAW";
  created_at: string;
};

type RankingRow = {
  player: Player;
  totalPoints: number;
  wins: number;
  draws: number;
  losses: number;
  matches: number;
  average: number;
};

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [points, setPoints] = useState<PointRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadGroupDashboard();
  }, [groupId]);

  async function loadGroupDashboard() {
    if (!groupId) {
      setMessage("ID do grupo não encontrado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("id, name, description, created_at")
      .eq("id", groupId)
      .single();

    if (groupError || !groupData) {
      setMessage("Grupo não encontrado.");
      setLoading(false);
      return;
    }

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, name, nickname, role, participation")
      .eq("group_id", groupId)
      .order("nickname");

    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, name, location, starts_at, status")
      .eq("group_id", groupId)
      .order("starts_at", { ascending: false });

    if (playersError) {
      setMessage(`Erro ao carregar jogadores: ${playersError.message}`);
    }

    if (sessionsError) {
      setMessage(`Erro ao carregar horários: ${sessionsError.message}`);
    }

    const sessionIds = (sessionsData || []).map((session) => session.id);

    let pointsData: PointRow[] = [];

    if (sessionIds.length > 0) {
      const { data, error } = await supabase
        .from("player_match_points")
        .select("id, session_id, match_id, player_id, points, result, created_at")
        .in("session_id", sessionIds);

      if (error) {
        setMessage(`Erro ao carregar pontuação: ${error.message}`);
      }

      pointsData = data || [];
    }

    setGroup(groupData);
    setPlayers(playersData || []);
    setSessions(sessionsData || []);
    setPoints(pointsData || []);
    setLoading(false);
  }

  const now = new Date();

  const upcomingSessions = useMemo(() => {
    return sessions
      .filter((session) => new Date(session.starts_at) >= now)
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      )
      .slice(0, 3);
  }, [sessions]);

  const latestSessions = useMemo(() => {
    return sessions
      .filter((session) => new Date(session.starts_at) < now)
      .sort(
        (a, b) =>
          new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
      )
      .slice(0, 3);
  }, [sessions]);

  const currentMonthValue = getMonthValue(new Date());

  const monthlyPoints = useMemo(() => {
    return points.filter((point) => {
      const session = sessions.find((item) => item.id === point.session_id);
      if (!session) return false;

      return getMonthValue(new Date(session.starts_at)) === currentMonthValue;
    });
  }, [points, sessions, currentMonthValue]);

  const monthlyRanking = useMemo(() => {
    const map = new Map<string, RankingRow>();

    monthlyPoints.forEach((point) => {
      const player = players.find((item) => item.id === point.player_id);
      if (!player) return;

      if (!map.has(player.id)) {
        map.set(player.id, {
          player,
          totalPoints: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          matches: 0,
          average: 0,
        });
      }

      const row = map.get(player.id)!;

      row.totalPoints += point.points;
      row.matches += 1;

      if (point.result === "WIN") row.wins += 1;
      if (point.result === "DRAW") row.draws += 1;
      if (point.result === "LOSS") row.losses += 1;

      row.average = row.matches > 0 ? row.totalPoints / row.matches : 0;
    });

    return Array.from(map.values())
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        if (b.average !== a.average) return b.average - a.average;

        return a.player.nickname.localeCompare(b.player.nickname);
      })
      .slice(0, 3);
  }, [monthlyPoints, players]);

  const totalMatches = useMemo(() => {
    const matchIds = new Set(points.map((point) => point.match_id));
    return matchIds.size;
  }, [points]);

  const officialPlayers = players.filter(
    (player) => player.participation === "official"
  ).length;

  const guestPlayers = players.filter(
    (player) => player.participation === "guest"
  ).length;

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando grupo...</main>;
  }

  if (!group) {
    return <main style={{ padding: 24 }}>{message || "Grupo não encontrado."}</main>;
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        <section style={heroStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900 }}>
              {group.name}
            </h1>

            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 17 }}>
              {group.description || "Grupo sem descrição."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            <ActionButton href={`/players?groupId=${group.id}`} label="Jogadores" />
            <ActionButton href={`/players/new?groupId=${group.id}`} label="Novo jogador" />
            <ActionButton href={`/sessions?groupId=${group.id}`} label="Horários" />
            <ActionButton href={`/sessions/new?groupId=${group.id}`} label="Novo horário" />
            <ActionButton href={`/rankings?groupId=${group.id}`} label="Ranking" />
          </div>
        </section>

        {message && (
          <div
            style={{
              background: message.startsWith("Erro") ? "#fff0f0" : "#fff8e1",
              border: message.startsWith("Erro")
                ? "1px solid #ffb3b3"
                : "1px solid #ffd54f",
              color: message.startsWith("Erro") ? "#b00020" : "#5d4037",
              borderRadius: 14,
              padding: 14,
              marginBottom: 20,
              fontWeight: 800,
            }}
          >
            {message}
          </div>
        )}

        <section style={summaryGridStyle}>
          <SummaryCard label="Jogadores" value={players.length} />
          <SummaryCard label="Oficiais" value={officialPlayers} />
          <SummaryCard label="Convidados" value={guestPlayers} />
          <SummaryCard label="Horários" value={sessions.length} />
          <SummaryCard label="Partidas" value={totalMatches} />
        </section>

        <section style={twoColumnStyle}>
          <DashboardCard title="Próximos horários">
            {upcomingSessions.length === 0 ? (
              <EmptyText text="Nenhum próximo horário cadastrado." />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {upcomingSessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            )}

            <a
              href={`/sessions/new?groupId=${group.id}`}
              style={{ textDecoration: "none" }}
            >
              <button style={{ ...primaryButton, marginTop: 16, width: "100%" }}>
                Criar novo horário
              </button>
            </a>
          </DashboardCard>

          <DashboardCard title="Últimos horários">
            {latestSessions.length === 0 ? (
              <EmptyText text="Nenhum horário anterior encontrado." />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {latestSessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            )}

            <a
              href={`/sessions?groupId=${group.id}`}
              style={{ textDecoration: "none" }}
            >
              <button style={{ ...secondaryButton, marginTop: 16, width: "100%" }}>
                Ver todos os horários
              </button>
            </a>
          </DashboardCard>
        </section>

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <div>
              <h2 style={titleStyle}>Top 3 do mês</h2>
              <p style={{ color: "#666", margin: "6px 0 0" }}>
                Ranking mensal do grupo, com base nas partidas registradas.
              </p>
            </div>

            <a href={`/rankings?groupId=${group.id}`} style={{ textDecoration: "none" }}>
              <button style={primaryButton}>Ver ranking completo</button>
            </a>
          </div>

          {monthlyRanking.length === 0 ? (
            <EmptyText text="Ainda não existe pontuação registrada neste mês." />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {monthlyRanking.map((row, index) => (
                <div
                  key={row.player.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr auto",
                    alignItems: "center",
                    gap: 12,
                    background: index === 0 ? "#fff8e1" : "#fafafa",
                    border:
                      index === 0 ? "2px solid #FFCA28" : "1px solid #eee",
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: index === 0 ? "#FFCA28" : "#fff",
                      border: "1px solid #FFCA28",
                      color: "#7a0000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </div>

                  <div>
                    <div style={{ color: "#b71c1c", fontWeight: 900, fontSize: 17 }}>
                      {row.player.nickname}
                    </div>

                    <div style={{ color: "#666", fontSize: 13 }}>
                      V:{row.wins} • E:{row.draws} • D:{row.losses} • J:{row.matches}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#FFCA28",
                      color: "#7a0000",
                      borderRadius: 14,
                      padding: "9px 12px",
                      fontWeight: 900,
                      minWidth: 68,
                      textAlign: "center",
                    }}
                  >
                    {row.totalPoints} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Ações rápidas</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginTop: 18,
            }}
          >
            <QuickAction href={`/players/new?groupId=${group.id}`} label="Cadastrar jogador" />
            <QuickAction href={`/sessions/new?groupId=${group.id}`} label="Criar horário" />
            <QuickAction href={`/players?groupId=${group.id}`} label="Ver jogadores" />
            <QuickAction href={`/sessions?groupId=${group.id}`} label="Ver horários" />
            <QuickAction href={`/rankings?groupId=${group.id}`} label="Ranking do grupo" />
            <QuickAction href="/groups" label="Voltar aos grupos" />
          </div>
        </section>
      </div>
    </main>
  );
}

function SessionRow({ session }: { session: Session }) {
  return (
    <a href={`/sessions/view?id=${session.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "#fff8e1",
          border: "1px solid #ffd54f",
          borderRadius: 14,
          padding: 14,
          display: "grid",
          gap: 6,
        }}
      >
        <strong style={{ color: "#b71c1c", fontSize: 17 }}>{session.name}</strong>

        <span style={{ color: "#666", fontSize: 14 }}>
          {session.location || "Local não informado"}
        </span>

        <span style={{ color: "#5d4037", fontWeight: 800, fontSize: 14 }}>
          {new Date(session.starts_at).toLocaleString("pt-BR")}
        </span>

        <span
          style={{
            background: "#fff",
            border: "1px solid #ffd54f",
            borderRadius: 999,
            padding: "5px 9px",
            width: "fit-content",
            color: "#7a0000",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          {translateStatus(session.status)}
        </span>
      </div>
    </a>
  );
}

function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={cardStyle}>
      <h2 style={titleStyle}>{title}</h2>
      <div style={{ marginTop: 16 }}>{children}</div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: 20,
        border: "2px solid #ffe082",
        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ color: "#777", fontWeight: 800, marginBottom: 8 }}>
        {label}
      </div>

      <div style={{ color: "#b71c1c", fontSize: 30, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{ textDecoration: "none" }}>
      <button style={heroButton}>{label}</button>
    </a>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{ textDecoration: "none" }}>
      <button style={primaryButton}>{label}</button>
    </a>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <p
      style={{
        color: "#777",
        background: "#fafafa",
        border: "1px solid #eee",
        borderRadius: 14,
        padding: 14,
        margin: 0,
        fontWeight: 700,
      }}
    >
      {text}
    </p>
  );
}

function getMonthValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function translateStatus(status: string) {
  if (status === "draft") return "Rascunho";
  if (status === "in_progress") return "Em andamento";
  if (status === "finished") return "Finalizado";
  return status;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #fff8e1 0%, #ffffff 100%)",
  padding: "32px 20px",
  fontFamily: "Arial, sans-serif",
};

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #FF2800 0%, #FF6A00 100%)",
  color: "#fff",
  borderRadius: 22,
  padding: 28,
  marginBottom: 24,
  boxShadow: "0 10px 30px rgba(255, 40, 0, 0.25)",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 20,
  marginBottom: 24,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  padding: 24,
  border: "2px solid #ffe082",
  boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "#b71c1c",
  fontSize: 26,
};

const primaryButton: React.CSSProperties = {
  width: "100%",
  background: "#FFCA28",
  color: "#7a0000",
  border: "none",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 900,
  fontSize: 15,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  background: "#fff",
  color: "#7a0000",
  border: "1px solid #FFCA28",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 900,
  fontSize: 15,
  cursor: "pointer",
};

const heroButton: React.CSSProperties = {
  background: "#fff",
  color: "#7a0000",
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
};