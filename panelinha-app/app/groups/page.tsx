"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
};

export default function GroupsPage() {
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
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

    const { data, error } = await supabase
      .from("group_members")
      .select(
        `
        group_id,
        role,
        groups (
          id,
          name,
          description,
          created_at
        )
      `
      )
      .eq("user_id", user.id);

    if (error) {
      setMessage(`Erro ao carregar grupos: ${error.message}`);
      setLoading(false);
      return;
    }

    const userGroups = (data || [])
      .map((item: any) => item.groups)
      .filter(Boolean)
      .sort((a: Group, b: Group) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

    setGroups(userGroups);
    setLoading(false);
  }

  async function createGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim()) {
      setMessage("Informe o nome do grupo.");
      return;
    }

    setSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/auth/login");
      return;
    }

    const { data: createdGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id,
      })
      .select("id, name, description, created_at")
      .single();

    if (groupError || !createdGroup) {
      setMessage(`Erro ao criar grupo: ${groupError?.message}`);
      setSaving(false);
      return;
    }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: createdGroup.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      setMessage(
        `Grupo criado, mas houve erro ao vincular usuário: ${memberError.message}`
      );
      setSaving(false);
      return;
    }

    setName("");
    setDescription("");
    setSaving(false);
    setMessage("Grupo criado com sucesso!");
    await loadGroups();
  }

  async function deleteGroup(groupId: string) {
    const confirmDelete = confirm(
      "Deseja excluir este grupo? Essa ação remove o grupo e seus vínculos."
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("groups").delete().eq("id", groupId);

    if (error) {
      setMessage(`Erro ao excluir grupo: ${error.message}`);
      return;
    }

    setMessage("Grupo excluído.");
    await loadGroups();
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando grupos...</main>;
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
            Meus grupos
          </h1>

          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 17 }}>
            Aqui aparecem somente os grupos vinculados à sua conta.
          </p>
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
            Criar novo grupo
          </h2>

          <form onSubmit={createGroup} style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "#7a0000", fontWeight: 900 }}>
                Nome do grupo
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Panelinha CSC"
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "#7a0000", fontWeight: 900 }}>
                Descrição
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Futebol de quarta-feira do CSC"
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "Arial, sans-serif",
                }}
              />
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
              }}
            >
              {saving ? "Criando..." : "Criar grupo"}
            </button>
          </form>
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
            Grupos da minha conta
          </h2>

          {groups.length === 0 ? (
            <p style={{ color: "#777" }}>
              Nenhum grupo vinculado à sua conta ainda.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {groups.map((group) => (
                <div
                  key={group.id}
                  style={{
                    background: "#fff8e1",
                    border: "1px solid #ffd54f",
                    borderRadius: 18,
                    padding: 18,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color: "#b71c1c",
                        fontSize: 22,
                        fontWeight: 900,
                      }}
                    >
                      {group.name}
                    </h3>

                    <p style={{ color: "#666", marginBottom: 0 }}>
                      {group.description || "Sem descrição"}
                    </p>
                  </div>

                  <div style={{ color: "#777", fontSize: 13, fontWeight: 700 }}>
                    Criado em:{" "}
                    {group.created_at
                      ? new Date(group.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <a
                      href={`/groups/${group.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <button style={primaryButton}>Abrir grupo</button>
                    </a>

                    <button
                      onClick={() => deleteGroup(group.id)}
                      style={dangerButton}
                    >
                      Excluir grupo
                    </button>
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
  width: "100%",
  background: "#FFCA28",
  color: "#7a0000",
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButton: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  color: "#FF2800",
  border: "1px solid #FF2800",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
};