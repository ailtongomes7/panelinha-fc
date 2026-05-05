"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

type Session = {
  id: string;
  group_id: string | null;
  name: string;
  location: string | null;
  starts_at: string;
  line_players_per_team: number;
  match_minutes: number;
  status: string;
};

export default function EditSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("id");
  const groupIdFromUrl = searchParams.get("groupId");

  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [linePlayersPerTeam, setLinePlayersPerTeam] = useState(6);
  const [matchMinutes, setMatchMinutes] = useState(8);
  const [status, setStatus] = useState("draft");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  async function loadSession() {
    if (!sessionId) {
      setMessage("ID do horário não informado.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error || !data) {
      setMessage("Horário não encontrado.");
      setLoading(false);
      return;
    }

    const sessionData = data as Session;

    setSession(sessionData);
    setName(sessionData.name || "");
    setLocation(sessionData.location || "");
    setStartsAt(formatDateTimeLocal(sessionData.starts_at));
    setLinePlayersPerTeam(sessionData.line_players_per_team || 6);
    setMatchMinutes(sessionData.match_minutes || 8);
    setStatus(sessionData.status || "draft");
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!sessionId || !session) return;

    try {
      setSaving(true);
      setMessage("");

      const { error } = await supabase
        .from("sessions")
        .update({
          name,
          location,
          starts_at: new Date(startsAt).toISOString(),
          line_players_per_team: linePlayersPerTeam,
          match_minutes: matchMinutes,
          status,
        })
        .eq("id", sessionId);

      if (error) {
        setMessage(`Erro ao atualizar horário: ${error.message}`);
        setSaving(false);
        return;
      }

      const returnGroupId = groupIdFromUrl || session.group_id;

      router.push(
        returnGroupId ? `/sessions?groupId=${returnGroupId}` : "/sessions"
      );
    } catch (error: any) {
      setMessage(`Erro inesperado: ${error.message}`);
      setSaving(false);
    }
  }

  function goBack() {
    const returnGroupId = groupIdFromUrl || session?.group_id;

    router.push(
      returnGroupId ? `/sessions?groupId=${returnGroupId}` : "/sessions"
    );
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando horário...</main>;
  }

  if (!session) {
    return <main style={{ padding: 24 }}>{message || "Horário não encontrado."}</main>;
  }

  const isFinished = session.status === "finished";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff8e1 0%, #ffffff 100%)",
        padding: "32px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
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
            Editar horário
          </h1>

          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 17 }}>
            Ajuste nome, local, data, quantidade de jogadores e tempo de partida.
          </p>
        </section>

        <section
          style={{
            background: "#fff",
            borderRadius: 22,
            padding: 28,
            border: "2px solid #ffe082",
            boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
          }}
        >
          {message && (
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
          )}

          {isFinished && (
            <div
              style={{
                marginBottom: 16,
                background: "#fafafa",
                border: "1px solid #ddd",
                color: "#555",
                borderRadius: 12,
                padding: 12,
                fontWeight: 800,
              }}
            >
              Este horário já foi finalizado. Evite alterar dados históricos.
            </div>
          )}

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

            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="draft">Rascunho</option>
                <option value="in_progress">Em andamento</option>
                <option value="finished">Finalizado</option>
              </select>
            </Field>

            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? "#ddd" : "#FFCA28",
                color: saving ? "#777" : "#7a0000",
                border: "none",
                borderRadius: 14,
                padding: "14px 18px",
                fontWeight: 900,
                fontSize: 16,
                cursor: saving ? "not-allowed" : "pointer",
                marginTop: 8,
              }}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            <button
              type="button"
              onClick={goBack}
              style={{
                background: "#fff",
                color: "#7a0000",
                border: "1px solid #FFCA28",
                borderRadius: 14,
                padding: "14px 18px",
                fontWeight: 900,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              Voltar para horários
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function formatDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 14,
  border: "1px solid #ddd",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};