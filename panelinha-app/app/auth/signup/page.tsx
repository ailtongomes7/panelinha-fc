"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name || !email || !password) {
      setMessage("Preencha todos os campos.");
      return;
    }

    if (password.length < 6) {
      setMessage("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As senhas não conferem.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      setMessage(`Erro ao criar conta: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Conta criada com sucesso! Agora faça login.");
    setLoading(false);

    setTimeout(() => {
      router.push("/auth/login");
    }, 1200);
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <section style={heroStyle}>
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900 }}>
            Criar conta
          </h1>

          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 17 }}>
            Cadastre-se para criar e gerenciar seus grupos no Panelinha FC.
          </p>
        </section>

        <section style={cardStyle}>
          {message && (
            <div
              style={{
                marginBottom: 16,
                background: message.startsWith("Erro") ? "#fff0f0" : "#f1fff2",
                border: message.startsWith("Erro")
                  ? "1px solid #ffb3b3"
                  : "1px solid #b7e4b8",
                color: message.startsWith("Erro") ? "#b00020" : "#1b5e20",
                borderRadius: 12,
                padding: 12,
                fontWeight: 800,
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: "grid", gap: 16 }}>
            <Field label="Nome">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Ailton Gomes"
                required
              />
            </Field>

            <Field label="E-mail">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                required
              />
            </Field>

            <Field label="Senha">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </Field>

            <Field label="Confirmar senha">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita sua senha"
                required
              />
            </Field>

            <button type="submit" disabled={loading} style={primaryButton}>
              {loading ? "Criando conta..." : "Criar conta"}
            </button>

            <a href="/auth/login" style={linkStyle}>
              Já tenho conta
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