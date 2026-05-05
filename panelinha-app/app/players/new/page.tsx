"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewPlayerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdFromUrl = searchParams.get("groupId");

  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [role, setRole] = useState("line");
  const [participation, setParticipation] = useState("official");
  const [attack, setAttack] = useState(3);
  const [defense, setDefense] = useState(3);
  const [intensity, setIntensity] = useState(3);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(true);

  const showAttributes = role === "line" && participation === "official";

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
      setMessage("Crie um grupo antes de cadastrar jogadores.");
      setLoadingGroup(false);
      return;
    }

    setGroupId(data.group_id);
    setGroupName((data as any).groups?.name || "Meu grupo");
    setLoadingGroup(false);
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
    if (!photoFile || !groupId) return null;

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
        setMessage("Você não tem permissão para cadastrar jogador neste grupo.");
        setSaving(false);
        return;
      }

      const uploadedPhotoUrl = await uploadPhoto(nickname || name);

      const { error } = await supabase.from("players").insert({
        group_id: groupId,
        name,
        nickname,
        photo_url: uploadedPhotoUrl,
        role,
        participation,
        attack: showAttributes ? attack : null,
        defense: showAttributes ? defense : null,
        intensity: showAttributes ? intensity : null,
        active: true,
      });

      if (error) {
        setMessage(`Erro ao cadastrar jogador: ${error.message}`);
        setSaving(false);
        return;
      }

      router.push(`/players?groupId=${groupId}`);
    } catch (error: any) {
      setMessage(`Erro ao salvar jogador: ${error.message}`);
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
            Novo Jogador
          </h1>

          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 17 }}>
            Cadastro vinculado ao grupo: <strong>{groupName || "-"}</strong>
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

              <strong style={{ color: "#7a0000" }}>
                {photoPreview ? "Prévia da foto" : "Sem foto selecionada"}
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

            <button type="submit" disabled={saving} style={primaryButton}>
              {saving ? "Salvando..." : "Cadastrar jogador"}
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