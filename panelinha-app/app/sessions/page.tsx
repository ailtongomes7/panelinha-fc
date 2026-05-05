"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import SessionActions from "./SessionActions";

type Session = {
  id: string;
  name: string;
  location: string | null;
  starts_at: string;
  line_players_per_team: number;
  match_minutes: number;
  status: string;
  group_id: string | null;
};

type Group = {
  id: string;
  name: string;
};

function SessionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdFromUrl = searchParams.get("groupId") || "";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupId, setGroupId] = useState(groupIdFromUrl);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [groupIdFromUrl]);

  async function loadSessions() {
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
      setSessions([]);
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

    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select("*")
      .eq("group_id", finalGroupId)
      .order("starts_at", { ascending: false });

    if (sessionsError) {
      setMessage(`Erro ao carregar horários: ${sessionsError.message}`);
      setLoading(false);
      return;
    }

    setSessions((sessionsData || []) as Session[]);
    setLoading(false);
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando horários...</main>;
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
            Horários
          </h1>

          <p style={{ marginTop: 10, marginBottom: 20, fontSize: 17 }}>
            {selectedGroup
              ? `Horários do grupo ${selectedGroup.name}.`
              : "Horários do grupo selecionado."}
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
              href={groupId ? `/sessions/new?groupId=${groupId}` : "/sessions/new"}
              style={{ textDecoration: "none" }}
            >
              <button style={primaryButton}>+ Novo horário</button>
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

        {sessions.length === 0 ? (
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
            Nenhum horário cadastrado neste grupo.
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
            }}
          >
            {sessions.map((session) => (
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
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 8,
                    color: "#b71c1c",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  {session.name}
                </h2>

                <div style={{ display: "grid", gap: 8 }}>
                  <InfoRow
                    label="Local"
                    value={session.location || "Não informado"}
                  />

                  <InfoRow
                    label="Data"
                    value={new Date(session.starts_at).toLocaleString("pt-BR")}
                  />

                  <InfoRow
                    label="Linha por time"
                    value={String(session.line_players_per_team)}
                  />

                  <InfoRow
                    label="Duração"
                    value={`${session.match_minutes} min`}
                  />

                  <InfoRow
                    label="Status"
                    value={translateStatus(session.status)}
                  />

                  <SessionActions
                    sessionId={session.id}
                    status={session.status}
                    groupId={session.group_id}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Carregando horários...</main>}>
      <SessionsContent />
    </Suspense>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        background: "#fafafa",
        border: "1px solid #eee",
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
          color: "#222",
          fontWeight: 900,
          textAlign: "right",
        }}
      >
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