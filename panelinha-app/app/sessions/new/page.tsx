"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const GROUP_ID = "db0a5d28-807f-4f34-8bef-969178829631";
const CREATED_BY = "e460ea1b-5d15-43c4-baa4-b963815ff6d0";

export default function NewSessionPage() {
  const [name, setName] = useState("Pelada de Segunda");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [linePlayersPerTeam, setLinePlayersPerTeam] = useState(6);
  const [matchMinutes, setMatchMinutes] = useState(8);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      group_id: GROUP_ID,
      name,
      location,
      starts_at: new Date(startsAt).toISOString(),
      line_players_per_team: linePlayersPerTeam,
      match_minutes: matchMinutes,
      status: "draft",
      created_by: CREATED_BY,
    };

    const { error } = await supabase.from("sessions").insert(payload);

    if (error) {
      setMessage(`Erro ao salvar: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Horário criado com sucesso!");

    setTimeout(() => {
      window.location.href = "/sessions";
    }, 700);
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
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
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
            Novo Horário
          </h1>
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 16 }}>
            Cadastre um novo horário da pelada
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            border: "2px solid #ffe082",
            boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <Field>
              <Label>Nome do horário</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Panelinha de Segunda"
                required
              />
            </Field>

            <Field>
              <Label>Local</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex.: Arena Society Palmas"
              />
            </Field>

            <Field>
              <Label>Data e hora</Label>
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
              <Field>
                <Label>Jogadores de linha por time</Label>
                <Input
                  type="number"
                  min={3}
                  max={8}
                  value={linePlayersPerTeam}
                  onChange={(e) => setLinePlayersPerTeam(Number(e.target.value))}
                  required
                />
              </Field>

              <Field>
                <Label>Duração da partida (min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={20}
                  value={matchMinutes}
                  onChange={(e) => setMatchMinutes(Number(e.target.value))}
                  required
                />
              </Field>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={loading}
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
                {loading ? "Salvando..." : "Salvar horário"}
              </button>

              <a href="/sessions" style={{ textDecoration: "none" }}>
                <button
                  type="button"
                  style={{
                    background: "#fff",
                    color: "#b71c1c",
                    border: "1px solid #f1b5b5",
                    borderRadius: 12,
                    padding: "12px 18px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Voltar para horários
                </button>
              </a>
            </div>

            {message && (
              <div
                style={{
                  marginTop: 8,
                  background: message.startsWith("Erro")
                    ? "#fff0f0"
                    : "#f1fff2",
                  border: message.startsWith("Erro")
                    ? "1px solid #ffb3b3"
                    : "1px solid #b7e4b8",
                  color: message.startsWith("Erro") ? "#b00020" : "#1b5e20",
                  borderRadius: 12,
                  padding: 12,
                  fontWeight: 700,
                }}
              >
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gap: 6 }}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: "#7a0000",
      }}
    >
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #ddd",
        fontSize: 15,
        outline: "none",
        boxSizing: "border-box",
        ...(props.style || {}),
      }}
    />
  );
}