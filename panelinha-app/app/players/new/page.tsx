"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const GROUP_ID = "db0a5d28-807f-4f34-8bef-969178829631";

export default function NewPlayerPage() {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState("line");
  const [participation, setParticipation] = useState("official");
  const [attack, setAttack] = useState(3);
  const [defense, setDefense] = useState(3);
  const [intensity, setIntensity] = useState(3);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const showAttributes = role === "line" && participation === "official";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      group_id: GROUP_ID,
      name,
      nickname,
      role,
      participation,
      attack: showAttributes ? attack : null,
      defense: showAttributes ? defense : null,
      intensity: showAttributes ? intensity : null,
      active: true,
    };

    const { error } = await supabase.from("players").insert(payload);

    if (error) {
      setMessage(`Erro ao salvar: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Jogador cadastrado com sucesso!");

    setTimeout(() => {
      window.location.href = "/players";
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
            background: "linear-gradient(135deg, #d50000 0%, #ff3d00 100%)",
            color: "#fff",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 10px 30px rgba(213, 0, 0, 0.25)",
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: 0.5,
            }}
          >
            Panelinha FC
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: 16,
              opacity: 0.95,
            }}
          >
            Cadastro de novo jogador
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
          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            <Field>
              <Label>Nome completo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Ailton Gomes"
                required
              />
            </Field>

            <Field>
              <Label>Apelido</Label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex.: Ailton"
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
                <Label>Tipo</Label>
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="line">Jogador de linha</option>
                  <option value="goalkeeper">Goleiro</option>
                </Select>
              </Field>

              <Field>
                <Label>Participação</Label>
                <Select
                  value={participation}
                  onChange={(e) => setParticipation(e.target.value)}
                >
                  <option value="official">Oficial</option>
                  <option value="guest">Convidado</option>
                </Select>
              </Field>
            </div>

            {showAttributes && (
              <div
                style={{
                  background: "#fff8e1",
                  border: "1px solid #ffd54f",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    color: "#b71c1c",
                    marginBottom: 12,
                  }}
                >
                  Avaliação do jogador
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 16,
                  }}
                >
                  <Field>
                    <Label>Ataque</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={attack}
                      onChange={(e) => setAttack(Number(e.target.value))}
                      required
                    />
                  </Field>

                  <Field>
                    <Label>Defesa</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={defense}
                      onChange={(e) => setDefense(Number(e.target.value))}
                      required
                    />
                  </Field>

                  <Field>
                    <Label>Intensidade</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      required
                    />
                  </Field>
                </div>
              </div>
            )}

            {!showAttributes && (
              <div
                style={{
                  background: "#fafafa",
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: 14,
                  color: "#555",
                  fontSize: 14,
                }}
              >
                {role === "goalkeeper"
                  ? "Goleiros não precisam de avaliação por ataque, defesa e intensidade."
                  : "Jogadores convidados participam da pelada, mas não entram no ranking oficial."}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "#ffca28",
                  color: "#7a0000",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {loading ? "Salvando..." : "Salvar jogador"}
              </button>

              <a href="/players" style={{ textDecoration: "none" }}>
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
                  Voltar para jogadores
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
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {children}
    </div>
  );
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

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #ddd",
        fontSize: 15,
        outline: "none",
        background: "#fff",
        boxSizing: "border-box",
        ...(props.style || {}),
      }}
    />
  );
}