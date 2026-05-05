"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserInfo = {
  email: string | undefined;
};

export default function HomePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUser({ email: user.email });
    } else {
      setUser(null);
    }

    setLoading(false);
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando...</main>;
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <section style={heroStyle}>
          <div
            style={{
              width: 82,
              height: 82,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FFCA28 0%, #FF2800 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7a0000",
              fontWeight: 900,
              fontSize: 30,
              border: "4px solid #fff",
              boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
              marginBottom: 18,
            }}
          >
            FC
          </div>

          <h1 style={{ margin: 0, fontSize: 42, fontWeight: 900 }}>
            Panelinha FC
          </h1>

          <p
            style={{
              marginTop: 12,
              marginBottom: 0,
              fontSize: 18,
              lineHeight: 1.5,
              maxWidth: 720,
            }}
          >
            Organize sua pelada com grupos, jogadores, horários, sorteio de
            times, controle de presença, ranking e resumo das partidas.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 24,
            }}
          >
            {user ? (
              <>
                <a href="/groups" style={{ textDecoration: "none" }}>
                  <button style={primaryHeroButton}>Abrir meus grupos</button>
                </a>

                <span style={loggedBadge}>
                  Logado como {user.email}
                </span>
              </>
            ) : (
              <>
                <a href="/auth/login" style={{ textDecoration: "none" }}>
                  <button style={primaryHeroButton}>Entrar</button>
                </a>

                <a href="/auth/signup" style={{ textDecoration: "none" }}>
                  <button style={secondaryHeroButton}>Criar conta</button>
                </a>
              </>
            )}
          </div>
        </section>

        <section style={gridStyle}>
          <InfoCard
            title="Grupos separados"
            text="Cada pelada fica em seu próprio grupo, com jogadores, horários e ranking separados."
          />

          <InfoCard
            title="Gestão do horário"
            text="Marque presença, gere times, controle barreiras, registre vitórias, empates e derrotas."
          />

          <InfoCard
            title="Ranking automático"
            text="O app calcula pontuação por horário, mês e ano com critérios de desempate."
          />

          <InfoCard
            title="Fotos e perfis"
            text="Cada jogador pode ter foto, nível, função e dados básicos para facilitar a identificação."
          />
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <section style={cardStyle}>
      <h2 style={{ marginTop: 0, color: "#b71c1c", fontSize: 22 }}>
        {title}
      </h2>

      <p style={{ color: "#666", lineHeight: 1.5, marginBottom: 0 }}>
        {text}
      </p>
    </section>
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
  borderRadius: 28,
  padding: 34,
  marginBottom: 24,
  boxShadow: "0 12px 34px rgba(255, 40, 0, 0.25)",
};

const primaryHeroButton: React.CSSProperties = {
  background: "#FFCA28",
  color: "#7a0000",
  border: "none",
  borderRadius: 14,
  padding: "14px 20px",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
};

const secondaryHeroButton: React.CSSProperties = {
  background: "#fff",
  color: "#7a0000",
  border: "none",
  borderRadius: 14,
  padding: "14px 20px",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
};

const loggedBadge: React.CSSProperties = {
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.36)",
  color: "#fff",
  borderRadius: 999,
  padding: "13px 16px",
  fontWeight: 800,
  fontSize: 14,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 18,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  padding: 22,
  border: "2px solid #ffe082",
  boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
};