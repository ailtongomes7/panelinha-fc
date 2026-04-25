"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function PlayerActions({ playerId }: { playerId: string }) {
  const router = useRouter();

  async function handleDelete() {
    const confirmDelete = confirm("Deseja excluir este jogador?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);

    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }

    router.refresh(); // atualiza a lista corretamente
  }

  return (
    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
      <a href={`/players/edit/${playerId}`}>
        <button style={btnEdit}>Editar</button>
      </a>

      <button onClick={handleDelete} style={btnDelete}>
        Excluir
      </button>
    </div>
  );
}

const btnEdit = {
  background: "#FFD54F",
  color: "#7a0000",
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const btnDelete = {
  background: "#fff",
  color: "#FF2800",
  border: "1px solid #FF2800",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};