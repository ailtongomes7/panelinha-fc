"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdFromUrl = searchParams.get("groupId");

  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [linePlayersPerTeam, setLinePlayersPerTeam] = useState(6);
  const [matchMinutes, setMatchMinutes] = useState(8);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(true);

  useEffect(() => {
    loadUserGroup();
  }, []);

  async function loadUserGroup() {
    setLoadingGroup(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (groupIdFromUrl) {
      const { data: membership } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("group_id", groupIdFromUrl)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        setMessage("Você não tem acesso a este grupo.");
        setLoadingGroup(false);
        return;
      }

      const { data: group } = await supabase
        .from("groups")
        .select("id, name")
        .eq("id", groupIdFromUrl)
        .maybeSingle();

      setGroupId(groupIdFromUrl);
      setGroupName(group?.name || "Grupo selecionado");
      setLoadingGroup(false);
      return;
    }

    const { data, error } = await supabase
      .from("group_members")
      .select(
        `
        group_id,
        groups (
          id,
          name
        )
      `
      )
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      setMessage(`Erro ao carregar grupo: ${error.message}`);
      setLoadingGroup(false);
      return;
    }

    if (!data?.group_id) {
      setMessage("Crie um grupo antes de cadastrar horários.");
      setLoadingGroup(false);
      return;
    }

    setGroupId(data.group_id);
    setGroupName((data as any).groups?.name || "Meu grupo");
    setLoadingGroup(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!groupId) {
      setMessage("Grupo não definido. Volte em Grupos e abra o grupo correto.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: membership } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        setMessage("Você não tem permissão para criar horário neste grupo.");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("sessions").insert({
        group_id: groupId,
        name,
        location,
        starts_at: new Date(startsAt).toISOString(),
        line_players_per_team: linePlayersPerTeam,
        match_minutes: matchMinutes,
        status: "draft",
      });

      if (error) {
        setMessage(`Erro ao criar horário: ${error.message}`);
        setSaving(false);
        return;
      }

      router.push(`/sessions?groupId=${groupId}`);
    } catch (error: any) {
      setMessage(`Erro inesperado: ${error.message}`);
      setSaving(false);
    }
  }

  if (loadingGroup) {
    return <main style={{ padding: 24 }}>Carregando grupo...</main>;
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <section style={heroStyle}>
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900 }}>
            Novo Horário
          </h1>

          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 17 }}>
            Horário vinculado ao grupo: <strong>{groupName || "-"}</strong>
          </p>
        </section>

        <section style={cardStyle}>
          {message && <MessageBox message={message} />}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <Field label="Nome do horário">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Pelada de quarta"
                required
              />
            </Field>

            <Field label="Local">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex.: Quadra CSC"
              />
            </Field>

            <Field label="Data e hora de início">
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </Field>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <Field label="Jogadores de linha por time">
                <Input
                  type="number"
                  min={3}
                  max={10}
                  value={linePlayersPerTeam}
                  onChange={(e) => setLinePlayersPerTeam(Number(e.target.value))}
                  required
                />
              </Field>

              <Field label="Duração da partida (minutos)">
                <Input
                  type="number"
                  min={3}
                  max={30}
                  value={matchMinutes}
                  onChange={(e) => setMatchMinutes(Number(e.target.value))}
                  required
                />
              </Field>
            </div>

            <button type="submit" disabled={saving} style={primaryButton}>
              {saving ? "Criando..." : "Criar horário"}
            </button>

            <a href={`/sessions?groupId=${groupId}`} style={linkStyle}>
              Voltar para horários do grupo
            </a>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ color: "#7a0000", fontWeight: 900, fontSize: 15 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function MessageBox({ message }: { message: string }) {
  return (
    <div
      style={{
        marginBottom: 16,
        background: message.startsWith("Erro") ? "#fff0f0" : "#fff8e1",
        border: message.startsWith("Erro")
          ? "1px solid #ffb3b3"
          : "1px solid #ffd54f",
        color: message.startsWith("Erro") ? "#b00020" : "#5d4037",
        borderRadius: 12,
        padding: 12,
        fontWeight: 800,
      }}
    >
      {message}
    </div>
  );
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

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 22,
  padding: 28,
  border: "2px solid #ffe082",
  boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 14,
  border: "1px solid #ddd",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};

const primaryButton: React.CSSProperties = {
  background: "#FFCA28",
  color: "#7a0000",
  border: "none",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  color: "#b71c1c",
  fontWeight: 900,
  textDecoration: "none",
  textAlign: "center",
};