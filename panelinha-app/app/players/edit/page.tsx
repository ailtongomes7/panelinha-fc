"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function EditPlayerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [role, setRole] = useState("line");
  const [participation, setParticipation] = useState("official");
  const [attack, setAttack] = useState(3);
  const [defense, setDefense] = useState(3);
  const [intensity, setIntensity] = useState(3);
  const [active, setActive] = useState(true);

  const showAttributes = role === "line" && participation === "official";

  useEffect(() => {
    async function loadPlayer() {
      if (!id) {
        setMessage("ID do jogador não informado.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setMessage("Jogador não encontrado.");
        setLoading(false);
        return;
      }

      setGroupId(data.group_id || "");
      setName(data.name || "");
      setNickname(data.nickname || "");
      setCurrentPhotoUrl(data.photo_url || "");
      setPhotoPreview(data.photo_url || "");
      setRole(data.role || "line");
      setParticipation(data.participation || "official");
      setAttack(data.attack ?? 3);
      setDefense(data.defense ?? 3);
      setIntensity(data.intensity ?? 3);
      setActive(data.active ?? true);
      setLoading(false);
    }

    loadPlayer();
  }, [id]);

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
    if (!photoFile || !groupId) return currentPhotoUrl || null;

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

  async function removePhoto() {
    const confirmRemove = confirm("Deseja remover a foto deste jogador?");
    if (!confirmRemove) return;

    setCurrentPhotoUrl("");
    setPhotoPreview("");
    setPhotoFile(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!id) return;

    try {
      setSaving(true);
      setMessage("");

      const uploadedPhotoUrl = await uploadPhoto(nickname || name);

      const { error } = await supabase
        .from("players")
        .update({
          name,
          nickname,
          photo_url: uploadedPhotoUrl,
          role,
          participation,
          attack: showAttributes ? attack : null,
          defense: showAttributes ? defense : null,
          intensity: showAttributes ? intensity : null,
          active,
        })
        .eq("id", id);

      if (error) {
        setMessage(`Erro ao atualizar jogador: ${error.message}`);
        setSaving(false);
        return;
      }

      router.push("/players");
    } catch (error: any) {
      setMessage(`Erro ao enviar foto: ${error.message}`);
      setSaving(false);
    }
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando jogador...</main>;
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
            Editar Jogador
          </h1>

          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 17 }}>
            Atualize dados, foto, nível e status do jogador.
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
                background: "#fff0f0",
                border: "1px solid #ffb3b3",
                color: "#b00020",
                borderRadius: 12,
                padding: 12,
                fontWeight: 800,
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <Field label="Nome completo">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field label="Apelido">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </Field>

            <Field label="Trocar foto do jogador">
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
                  alt={nickname}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #FFCA28",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 70,
                    height: 70,
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

              <div style={{ display: "grid", gap: 8 }}>
                <strong style={{ color: "#7a0000" }}>
                  {photoPreview ? "Foto atual / prévia" : "Sem foto cadastrada"}
                </strong>

                {photoPreview && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    style={{
                      background: "#fff",
                      color: "#FF2800",
                      border: "1px solid #FF2800",
                      borderRadius: 10,
                      padding: "7px 10px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Remover foto
                  </button>
                )}
              </div>
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

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                background: "#fff8e1",
                border: "1px solid #ffd54f",
                borderRadius: 14,
                padding: 14,
                color: "#7a0000",
                fontWeight: 900,
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Jogador ativo
            </label>

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

            <a
              href="/players"
              style={{
                color: "#b71c1c",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Voltar para jogadores
            </a>
          </form>
        </section>
      </div>
    </main>
  );
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