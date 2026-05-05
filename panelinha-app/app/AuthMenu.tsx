"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type UserInfo = {
  email: string | undefined;
};

export default function AuthMenu() {
  const router = useRouter();

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
      setUser({
        email: user.email,
      });
    } else {
      setUser(null);
    }

    setLoading(false);
  }

  async function handleLogout() {
    const confirmLogout = confirm("Deseja sair da sua conta?");
    if (!confirmLogout) return;

    await supabase.auth.signOut();

    setUser(null);
    router.push("/auth/login");
    router.refresh();
  }

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <>
        <MenuLink href="/auth/login" label="Entrar" />
      </>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span
        title={user.email}
        style={{
          background: "#fff8e1",
          color: "#7a0000",
          border: "1px solid #FFCA28",
          borderRadius: 999,
          padding: "8px 11px",
          fontWeight: 800,
          fontSize: 12,
          maxWidth: 180,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {user.email}
      </span>

      <button
        onClick={handleLogout}
        style={{
          background: "#fff",
          color: "#FF2800",
          border: "1px solid #FF2800",
          borderRadius: 999,
          padding: "8px 12px",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Sair
      </button>
    </div>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      style={{
        color: "#7a0000",
        background: "#FFCA28",
        padding: "9px 13px",
        borderRadius: 999,
        textDecoration: "none",
        fontWeight: 900,
        whiteSpace: "nowrap",
        fontSize: 14,
      }}
    >
      {label}
    </a>
  );
}