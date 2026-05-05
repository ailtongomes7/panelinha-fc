import type { Metadata } from "next";
import AuthMenu from "./AuthMenu";

export const metadata: Metadata = {
  title: "Panelinha FC",
  description: "Gestão de peladas, jogadores, horários e ranking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1000,
            background: "#fff",
            borderBottom: "1px solid #ffe082",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              maxWidth: 1150,
              margin: "0 auto",
              padding: "12px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              fontFamily: "Arial, sans-serif",
            }}
          >
            <a
              href="/"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #FF2800 0%, #FFCA28 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#7a0000",
                  fontWeight: 900,
                  border: "2px solid #FFCA28",
                }}
              >
                FC
              </div>

              <div>
                <div
                  style={{
                    color: "#b71c1c",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  Panelinha FC
                </div>

                <div
                  style={{
                    color: "#777",
                    fontSize: 12,
                    fontWeight: 700,
                    marginTop: 3,
                  }}
                >
                  Gestão da pelada
                </div>
              </div>
            </a>

            <nav
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <MenuLink href="/" label="Início" />
              <MenuLink href="/groups" label="Grupos" />
              <AuthMenu />
            </nav>
          </div>
        </header>

        {children}
      </body>
    </html>
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
        fontFamily: "Arial, sans-serif",
        fontSize: 14,
      }}
    >
      {label}
    </a>
  );
}