import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wisetoto Analyzer Live Free",
  description: "실전 스포츠 분석과 자동 PRE·결과검증 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <nav
          aria-label="서비스 화면 이동"
          style={{ display: "flex", justifyContent: "center", gap: 22, padding: "9px 16px",
            background: "#112134", borderBottom: "1px solid #294158", fontSize: 13 }}
        >
          <a href="/" style={{ color: "#d9e5f3", fontWeight: 700, textDecoration: "none" }}>실전 분석</a>
          <a href="/automation" style={{ color: "#53dec4", fontWeight: 800, textDecoration: "none" }}>⚡ 자동분석 결과</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
