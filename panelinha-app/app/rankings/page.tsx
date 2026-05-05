"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

type Session = {
  id: string;
  name: string;
  starts_at: string;
  location: string | null;
  group_id: string | null;
};

type Player = {
  id: string;
  name: string;
  nickname: string;
  role: string;
  participation: string;
  group_id: string | null;
};

type Group = {
  id: string;
  name: string;
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

type RankingMode = "session" | "month" | "year";

type RankingRow = {
  player: Player;
  totalPoints: number;
  wins: number;
  draws: number;
  losses: number;
  matches: number;
  average: number;
};

function RankingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdFromUrl = searchParams.get("groupId") || "";

  const [group, setGroup] = useState<Group | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [points, setPoints] = useState<PointRow[]>([]);
  const [mode, setMode] = useState<RankingMode>("month");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, [groupIdFromUrl]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/auth/login");
      return;
    }

    let finalGroupId = groupIdFromUrl;

    if (!finalGroupId) {
      const { data: firstMembership, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        setMessage(`Erro ao carregar grupo: ${membershipError.message}`);
        setLoading(false);
        return;
      }

      if (!firstMembership?.group_id) {
        setMessage("Nenhum grupo vinculado à sua conta.");
        setLoading(false);
        return;
      }

      finalGroupId = firstMembership.group_id;
    }

    const { data: membership, error: membershipCheckError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("group_id", finalGroupId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipCheckError) {
      setMessage(`Erro ao verificar acesso ao grupo: ${membershipCheckError.message}`);
      setLoading(false);
      return;
    }

    if (!membership) {
      setMessage("Você não tem acesso a este grupo.");
      setLoading(false);
      return;
    }

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("id, name")
      .eq("id", finalGroupId)
      .maybeSingle();

    if (groupError) {
      setMessage(`Erro ao carregar grupo: ${groupError.message}`);
      setLoading(false);
      return;
    }

    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, name, starts_at, location, group_id")
      .eq("group_id", finalGroupId)
      .order("starts_at", { ascending: false });

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, name, nickname, role, participation, group_id")
      .eq("group_id", finalGroupId)
      .order("nickname");

    if (sessionsError) {
      setMessage(`Erro ao carregar horários: ${sessionsError.message}`);
      setLoading(false);
      return;
    }

    if (playersError) {
      setMessage(`Erro ao carregar jogadores: ${playersError.message}`);
      setLoading(false);
      return;
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
        setLoading(false);
        return;
      }

      pointsData = data || [];
    }

    setGroup(groupData || null);
    setSessions((sessionsData || []) as Session[]);
    setPlayers((playersData || []) as Player[]);
    setPoints(pointsData);

    if (sessionsData && sessionsData.length > 0) {
      setSelectedSessionId(sessionsData[0].id);

      const firstDate = new Date(sessionsData[0].starts_at);
      setSelectedMonth(getMonthValue(firstDate));
      setSelectedYear(String(firstDate.getFullYear()));
    } else {
      const today = new Date();
      setSelectedSessionId("");
      setSelectedMonth(getMonthValue(today));
      setSelectedYear(String(today.getFullYear()));
    }

    setLoading(false);
  }

  const availableMonths = useMemo(() => {
    const values = sessions.map((session) =>
      getMonthValue(new Date(session.starts_at))
    );

    return Array.from(new Set(values)).sort().reverse();
  }, [sessions]);

  const availableYears = useMemo(() => {
    const values = sessions.map((session) =>
      String(new Date(session.starts_at).getFullYear())
    );

    return Array.from(new Set(values)).sort().reverse();
  }, [sessions]);

  const filteredPoints = useMemo(() => {
    return points.filter((point) => {
      const session = sessions.find((item) => item.id === point.session_id);
      if (!session) return false;

      const sessionDate = new Date(session.starts_at);

      if (mode === "session") {
        return point.session_id === selectedSessionId;
      }

      if (mode === "month") {
        return getMonthValue(sessionDate) === selectedMonth;
      }

      if (mode === "year") {
        return String(sessionDate.getFullYear()) === selectedYear;
      }

      return false;
    });
  }, [points, sessions, mode, selectedSessionId, selectedMonth, selectedYear]);

  const ranking = useMemo(() => {
    const map = new Map<string, RankingRow>();

    filteredPoints.forEach((point) => {
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

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      if (b.average !== a.average) return b.average - a.average;

      return a.player.nickname.localeCompare(b.player.nickname);
    });
  }, [filteredPoints, players]);

  const selectedSession = sessions.find(
    (session) => session.id === selectedSessionId
  );

  const totalRegisteredMatches = useMemo(() => {
    const matchIds = new Set(filteredPoints.map((point) => point.match_id));
    return matchIds.size;
  }, [filteredPoints]);

  const totalPlayersWithPoints = ranking.length;

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando ranking...</main>;
  }

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
        <section
          style={{
            background: "linear-gradient(135deg, #FF2800 0%, #FF6A00 100%)",
            color: "#fff",
            borderRadius: 22,
            padding: 28,
            marginBottom: 24,
            boxShadow: "0 10px 30px rgba(255, 40, 0, 0.25)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900 }}>
            Ranking Panelinha FC
          </h1>

          <p style={{ marginTop: 10, marginBottom: 16, fontSize: 17 }}>
            {group
              ? `Classificação do grupo ${group.name}.`
              : "Acompanhe a classificação por horário, mês ou ano."}
          </p>

          {group && (
            <div
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: 12,
                padding: 10,
                marginBottom: 16,
                fontWeight: 800,
              }}
            >
              Grupo filtrado: {group.name}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {group && (
              <a href={`/groups/${group.id}`} style={{ textDecoration: "none" }}>
                <button style={heroButton}>Voltar ao grupo</button>
              </a>
            )}

            <a href="/groups" style={{ textDecoration: "none" }}>
              <button style={heroButton}>Ver grupos</button>
            </a>
          </div>
        </section>

        {message && (
          <div
            style={{
              background: message.startsWith("Erro") ? "#fff0f0" : "#f1fff2",
              border: message.startsWith("Erro")
                ? "1px solid #ffb3b3"
                : "1px solid #b7e4b8",
              color: message.startsWith("Erro") ? "#b00020" : "#1b5e20",
              borderRadius: 14,
              padding: 14,
              marginBottom: 20,
              fontWeight: 800,
            }}
          >
            {message}
          </div>
        )}

        <section
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            border: "2px solid #ffe082",
            boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, color: "#b71c1c", fontSize: 26 }}>
            Tipo de ranking
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <button
              onClick={() => setMode("session")}
              style={mode === "session" ? activeButton : secondaryButton}
            >
              Ranking do horário
            </button>

            <button
              onClick={() => setMode("month")}
              style={mode === "month" ? activeButton : secondaryButton}
            >
              Ranking mensal
            </button>

            <button
              onClick={() => setMode("year")}
              style={mode === "year" ? activeButton : secondaryButton}
            >
              Ranking anual
            </button>
          </div>

          {mode === "session" && (
            <>
              {sessions.length === 0 ? (
                <p style={{ color: "#777" }}>Nenhum horário cadastrado ainda.</p>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  style={inputStyle}
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} -{" "}
                      {new Date(session.starts_at).toLocaleString("pt-BR")}
                    </option>
                  ))}
                </select>
              )}

              {selectedSession && (
                <InfoBox>
                  <div>
                    <strong>Horário:</strong> {selectedSession.name}
                  </div>
                  <div>
                    <strong>Local:</strong>{" "}
                    {selectedSession.location || "Não informado"}
                  </div>
                  <div>
                    <strong>Data:</strong>{" "}
                    {new Date(selectedSession.starts_at).toLocaleString("pt-BR")}
                  </div>
                </InfoBox>
              )}
            </>
          )}

          {mode === "month" && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={inputStyle}
            >
              {availableMonths.length === 0 ? (
                <option value={selectedMonth}>{selectedMonth}</option>
              ) : (
                availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))
              )}
            </select>
          )}

          {mode === "year" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={inputStyle}
            >
              {availableYears.length === 0 ? (
                <option value={selectedYear}>{selectedYear}</option>
              ) : (
                availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))
              )}
            </select>
          )}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <SummaryCard label="Jogadores pontuados" value={totalPlayersWithPoints} />
          <SummaryCard label="Partidas registradas" value={totalRegisteredMatches} />
          <SummaryCard label="Registros de pontuação" value={filteredPoints.length} />
        </section>

        <section
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            border: "2px solid #ffe082",
            boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, color: "#b71c1c", fontSize: 26 }}>
            Critérios de desempate
          </h2>

          <div style={{ display: "grid", gap: 8, color: "#5d4037" }}>
            <Criterion text="1º Maior pontuação total" />
            <Criterion text="2º Maior número de vitórias" />
            <Criterion text="3º Menor número de derrotas" />
            <Criterion text="4º Maior média de pontos por partida" />
            <Criterion text="5º Ordem alfabética" />
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            border: "2px solid #ffe082",
            boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#b71c1c", fontSize: 26 }}>
            Classificação
          </h2>

          {ranking.length === 0 ? (
            <p style={{ color: "#777" }}>
              Ainda não existe pontuação registrada nesse filtro.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {ranking.map((row, index) => (
                <div
                  key={row.player.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "50px 1fr auto",
                    gap: 14,
                    alignItems: "center",
                    background: index === 0 ? "#fff8e1" : "#fafafa",
                    border:
                      index === 0 ? "2px solid #FFCA28" : "1px solid #eee",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: index === 0 ? "#FFCA28" : "#fff",
                      color: "#7a0000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      border: "1px solid #FFCA28",
                    }}
                  >
                    {index + 1}
                  </div>

                  <div>
                    <div
                      style={{
                        color: "#b71c1c",
                        fontWeight: 900,
                        fontSize: 18,
                      }}
                    >
                      {row.player.nickname}
                    </div>

                    <div style={{ color: "#666", fontSize: 14 }}>
                      {row.player.name} •{" "}
                      {row.player.role === "line" ? "Linha" : "Goleiro"} •{" "}
                      {row.player.participation === "official"
                        ? "Oficial"
                        : "Convidado"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 8,
                      }}
                    >
                      <MiniBadge label={`V: ${row.wins}`} />
                      <MiniBadge label={`E: ${row.draws}`} />
                      <MiniBadge label={`D: ${row.losses}`} />
                      <MiniBadge label={`J: ${row.matches}`} />
                      <MiniBadge label={`Média: ${row.average.toFixed(2)}`} />
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#FFCA28",
                      color: "#7a0000",
                      borderRadius: 16,
                      padding: "10px 14px",
                      fontWeight: 900,
                      fontSize: 20,
                      minWidth: 70,
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
      </div>
    </main>
  );
}

export default function RankingsPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Carregando ranking...</main>}>
      <RankingsContent />
    </Suspense>
  );
}

function getMonthValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 16,
        background: "#fff8e1",
        border: "1px solid #ffd54f",
        borderRadius: 14,
        padding: 14,
        color: "#5d4037",
        fontWeight: 700,
      }}
    >
      {children}
    </div>
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
      <div style={{ color: "#777", fontWeight: 700, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color: "#b71c1c", fontSize: 30, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

function MiniBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        background: "#fff8e1",
        border: "1px solid #ffd54f",
        color: "#5d4037",
        borderRadius: 999,
        padding: "5px 9px",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {label}
    </span>
  );
}

function Criterion({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "#fff8e1",
        border: "1px solid #ffd54f",
        borderRadius: 12,
        padding: "10px 12px",
        fontWeight: 800,
      }}
    >
      {text}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 14,
  border: "1px solid #ddd",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};

const activeButton: React.CSSProperties = {
  background: "#FFCA28",
  color: "#7a0000",
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  background: "#fff",
  color: "#7a0000",
  border: "1px solid #FFCA28",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const heroButton: React.CSSProperties = {
  background: "#fff",
  color: "#7a0000",
  border: "none",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 900,
  cursor: "pointer",
};