"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Props = {
  sessionId: string;
  status: string;
  groupId?: string | null;
};

export default function SessionActions({ sessionId, status, groupId }: Props) {
  const router = useRouter();

  async function deleteSession() {
    const confirmDelete = confirm(
      "Deseja realmente excluir este horário? Essa ação não pode ser desfeita."
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      alert(`Erro ao excluir horário: ${error.message}`);
      return;
    }

    router.push(groupId ? `/sessions?groupId=${groupId}` : "/sessions");
    router.refresh();
  }

  const editHref = groupId
    ? `/sessions/edit?id=${sessionId}&groupId=${groupId}`
    : `/sessions/edit?id=${sessionId}`;

  const openHref = `/sessions/view?id=${sessionId}`;

  const isFinished = status === "finished";

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      <a href={openHref} style={{ textDecoration: "none" }}>
        <button style={primaryButton}>Abrir horário</button>
      </a>

      {!isFinished && (
        <a href={editHref} style={{ textDecoration: "none" }}>
          <button style={secondaryButton}>Editar horário</button>
        </a>
      )}

      {!isFinished && (
        <button onClick={deleteSession} style={dangerButton}>
          Excluir horário
        </button>
      )}
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  width: "100%",
  background: "#FFCA28",
  color: "#7a0000",
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  color: "#7a0000",
  border: "1px solid #FFCA28",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButton: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  color: "#FF2800",
  border: "1px solid #FF2800",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};