"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import PlayerActions from "./PlayerActions";

type Player = {
  id: string;
  name: string;
  nickname: string;
  role: string;
  participation: string;
  attack: number | null;
  defense: number | null;
  intensity: number | null;
  overall: number | null;
  active: boolean;
  photo_url: string | null;
  group_id: string | null;
};

type Group = {
  id: string;
  name: string;
};

function PlayersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdFromUrl = searchParams.get("groupId") || "";

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupId, setGroupId] = useState(groupIdFromUrl);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayers();
  }, [groupIdFromUrl]);

  async function loadPlayers() {
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
        setMessage(`Erro ao carregar vínculo do grupo: ${membershipError.message}`);
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

    setGroupId(finalGroupId);

    const { data: membership, error: checkError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("group_id", finalGroupId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError) {
      setMessage(`Erro ao verificar acesso ao grupo: ${checkError.message}`);
      setLoading(false);
      return;
    }

    if (!membership) {
      setMessage("Você não tem acesso a este grupo.");
      setPlayers([]);
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

    setSelectedGroup(groupData || null);

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("group_id", finalGroupId)
      .order("nickname");

    if (playersError) {
      setMessage(`Erro ao carregar jogadores: ${playersError.message}`);
      setLoading(false);
      return;
    }

    setPlayers((playersData || []) as Player[]);
    setLoading(false);
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando jogadores...</main>;
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
            Jogadores
          </h1>

          <p style={{ marginTop: 10, marginBottom: 20, fontSize: 17 }}>
            {selectedGroup
              ? `Jogadores do grupo ${selectedGroup.name}.`
              : "Jogadores do grupo selecionado."}
          </p>

          {groupId && (
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
              Grupo filtrado: {selectedGroup?.name || groupId}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href={groupId ? `/players/new?groupId=${groupId}` : "/players/new"}
              style={{ textDecoration: "none" }}
            >
              <button style={primaryButton}>+ Novo jogador</button>
            </a>

            {groupId && (
              <a href={`/groups/${groupId}`} style={{ textDecoration: "none" }}>
                <button style={secondaryButton}>Voltar ao grupo</button>
              </a>
            )}

            <a href="/groups" style={{ textDecoration: "none" }}>
              <button style={secondaryButton}>Ver grupos</button>
            </a>
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

        {players.length === 0 ? (
          <section
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 24,
              border: "2px solid #ffe082",
              boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
              textAlign: "center",
              color: "#777",
              fontWeight: 700,
            }}
          >
            Nenhum jogador cadastrado neste grupo.
          </section>
        ) : (
          <>
            <div
              style={{
                marginBottom: 18,
                color: "#7a0000",
                fontWeight: 900,
                fontSize: 18,
              }}
            >
              Total de jogadores: {players.length}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 18,
              }}
            >
              {players.map((player) => {
                const isLine = player.role === "line";
                const isOfficial = player.participation === "official";

                return (
                  <div
                    key={player.id}
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
                        display: "flex",
                        gap: 14,
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <PlayerPhoto
                        photoUrl={player.photo_url}
                        nickname={player.nickname}
                      />

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 900,
                            color: "#b71c1c",
                          }}
                        >
                          {player.nickname}
                        </div>

                        <div
                          style={{
                            fontSize: 14,
                            color: "#666",
                            marginTop: 2,
                          }}
                        >
                          {player.name}
                        </div>
                      </div>

                      <div
                        style={{
                          background: player.active ? "#FFCA28" : "#e0e0e0",
                          color: player.active ? "#7a0000" : "#555",
                          borderRadius: 999,
                          padding: "6px 10px",
                          fontSize: 12,
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {player.active ? "ATIVO" : "INATIVO"}
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <InfoRow
                        label="Tipo"
                        value={isLine ? "Jogador de linha" : "Goleiro"}
                      />

                      <InfoRow
                        label="Participação"
                        value={isOfficial ? "Oficial" : "Convidado"}
                      />

                      {isLine && isOfficial && (
                        <>
                          <InfoRow
                            label="Ataque"
                            value={String(player.attack ?? "-")}
                          />
                          <InfoRow
                            label="Defesa"
                            value={String(player.defense ?? "-")}
                          />
                          <InfoRow
                            label="Intensidade"
                            value={String(player.intensity ?? "-")}
                          />
                          <InfoRow
                            label="Nível geral"
                            value={`${player.overall ?? "-"} ${renderStars(
                              player.overall
                            )}`}
                            highlight
                          />
                        </>
                      )}

                      {!isLine && <InfoRow label="Nível" value="Goleiro" />}

                      {isLine && !isOfficial && (
                        <InfoRow
                          label="Observação"
                          value="Convidado não entra no ranking técnico"
                        />
                      )}
                    </div>

                    <PlayerActions playerId={player.id} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Carregando jogadores...</main>}>
      <PlayersContent />
    </Suspense>
  );
}

function PlayerPhoto({
  photoUrl,
  nickname,
}: {
  photoUrl: string | null;
  nickname: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={nickname}
        style={{
          width: 58,
          height: 58,
          borderRadius: "50%",
          objectFit: "cover",
          border: "3px solid #FFCA28",
          background: "#fff8e1",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 58,
        height: 58,
        borderRadius: "50%",
        background: "#fff8e1",
        border: "3px solid #FFCA28",
        color: "#b71c1c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: 20,
      }}
    >
      {(nickname || "FC").slice(0, 2).toUpperCase()}
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        background: highlight ? "#fff8e1" : "#fafafa",
        border: highlight ? "1px solid #ffd54f" : "1px solid #eee",
        borderRadius: 12,
        padding: "10px 12px",
      }}
    >
      <span style={{ fontSize: 14, color: "#666", fontWeight: 700 }}>
        {label}
      </span>

      <span
        style={{
          fontSize: 14,
          color: highlight ? "#b71c1c" : "#222",
          fontWeight: 900,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function renderStars(value: number | null) {
  if (!value) return "☆☆☆☆☆";

  const fullStars = Math.round(value);
  let stars = "";

  for (let i = 1; i <= 5; i++) {
    stars += i <= fullStars ? "⭐" : "☆";
  }

  return stars;
}

const primaryButton: React.CSSProperties = {
  background: "#FFCA28",
  color: "#7a0000",
  border: "none",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  background: "#fff",
  color: "#7a0000",
  border: "1px solid #FFCA28",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 900,
  cursor: "pointer",
};