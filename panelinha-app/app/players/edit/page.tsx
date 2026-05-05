"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

type Player = {
  id: string;
  group_id: string | null;
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
};

function EditPlayerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const playerId = searchParams.get("id");

  const [player, setPlayer] = useState<Player | null>(null);
  const [groupId, setGroupId] = useState("");

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState("line");
  const [participation, setParticipation] = useState("official");
  const [attack, setAttack] = useState(3);
  const [defense, setDefense] = useState(3);
  const [intensity, setIntensity] = useState(3);
  const [active, setActive] = useState(true);

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const showAttributes = role === "line" && participation === "official";

  useEffect(() => {
    loadPlayer();
  }, [playerId]);

  async function loadPlayer() {
    if (!playerId) {
      setMessage("ID do jogador não informado.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .single();

    if (error || !data) {
      setMessage(`Erro ao carregar jogador: ${error?.message || "não encontrado"}`);
      setLoading(false);
      return;
    }

    const playerData = data as Player;

    if (playerData.group_id) {
      const { data: membership } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("group_id", playerData.group_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        setMessage("Você não tem acesso a este jogador.");
        setLoading(false);
        return;
      }
    }

    setPlayer(playerData);
    setGroupId(playerData.group_id || "");
    setName(playerData.name || "");
    setNickname(playerData.nickname || "");
    setRole(playerData.role || "line");
    setParticipation(playerData.participation || "official");
    setAttack(playerData.attack || 3);
    setDefense(playerData.defense || 3);
    setIntensity(playerData.intensity || 3);
    setActive(playerData.active ?? true);
    setPhotoUrl(playerData.photo_url || "");
    setPhotoPreview(playerData.photo_url || "");
    setLoading(false);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Selecione apenas arquivos de imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("A imagem deve ter no máximo 5MB.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto(playerName: string) {
    if (!photoFile || !groupId) return photoUrl || null;

    const extension = photoFile.name.split(".").pop();

    const safeName = playerName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-");

    const filePath = `${groupId}/${safeName}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("player-photos")
      .upload(filePath, photoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("player-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!playerId || !player) {
      setMessage("Jogador não carregado.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const uploadedPhotoUrl = await uploadPhoto(nickname || name);

      const { error } = await supabase
        .from("players")
        .update({
          name,
          nickname,
          role,
          participation,
          attack: showAttributes ? attack : null,
          defense: showAttributes ? defense : null,
          intensity: showAttributes ? intensity : null,
          photo_url: uploadedPhotoUrl,
          active,
        })
        .eq("id", playerId);

      if (error) {
        setMessage(`Erro ao atualizar jogador: ${error.message}`);
        setSaving(false);
        return;
      }

      router.push(groupId ? `/players?groupId=${groupId}` : "/players");
    } catch (error: any) {
      setMessage(`Erro ao salvar jogador: ${error.message}`);
      setSaving(false);
    }
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando jogador...</main>;
  }

  if (!player) {
    return (
      <main style={pageStyle}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <section style={cardStyle}>
            <h1 style={{ color: "#b71c1c", marginTop: 0 }}>
              Jogador não encontrado
            </h1>

            <p style={{ color: "#666", fontWeight: 700 }}>
              {message || "Não foi possível carregar este jogador."}
            </p>

            <a href="/groups" style={{ textDecoration: "none" }}>
              <button style={primaryButton}>Voltar para grupos</button>
            </a>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <section style={heroStyle}>
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900 }}>
            Editar Jogador
          </h1>

          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 17 }}>
            Atualize dados, nível, foto e situação do jogador.
          </p>
        </section>

        <section style={cardStyle}>
          {message && <MessageBox message={message} />}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <Field label="Nome completo">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Ailton Gomes"
                required
              />
            </Field>

            <Field label="Apelido">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex.: AG7"
                required
              />
            </Field>

            <Field label="Foto do jogador">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoChange}
                style={inputStyle}
              />
            </Field>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#fff8e1",
                border: "1px solid #ffd54f",
                borderRadius: 14,
                padding: 12,
              }}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Prévia"
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #FFCA28",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    background: "#fff",
                    border: "3px solid #FFCA28",
                    color: "#b71c1c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 22,
                  }}
                >
                  {(nickname || name || "FC").slice(0, 2).toUpperCase()}
                </div>
              )}

              <strong style={{ color: "#7a0000" }}>
                {photoPreview ? "Foto atual / prévia" : "Sem foto"}
              </strong>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <Field label="Tipo">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={inputStyle}
                >
                  <option value="line">Jogador de linha</option>
                  <option value="goalkeeper">Goleiro</option>
                </select>
              </Field>

              <Field label="Participação">
                <select
                  value={participation}
                  onChange={(e) => setParticipation(e.target.value)}
                  style={inputStyle}
                >
                  <option value="official">Oficial</option>
                  <option value="guest">Convidado</option>
                </select>
              </Field>
            </div>

            {showAttributes && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 16,
                }}
              >
                <Field label="Ataque">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={attack}
                    onChange={(e) => setAttack(Number(e.target.value))}
                    required
                  />
                </Field>

                <Field label="Defesa">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={defense}
                    onChange={(e) => setDefense(Number(e.target.value))}
                    required
                  />
                </Field>

                <Field label="Intensidade">
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
            )}

            <Field label="Situação">
              <select
                value={active ? "active" : "inactive"}
                onChange={(e) => setActive(e.target.value === "active")}
                style={inputStyle}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </Field>

            <button type="submit" disabled={saving} style={primaryButton}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            <a href={`/players?groupId=${groupId}`} style={linkStyle}>
              Voltar para jogadores do grupo
            </a>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function EditPlayerPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Carregando jogador...</main>}>
      <EditPlayerContent />
    </Suspense>
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