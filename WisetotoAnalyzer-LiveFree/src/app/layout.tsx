import "./globals.css"; import type {Metadata} from "next";
export const metadata:Metadata={title:"Wisetoto Analyzer Live Free",description:"무료 실시간 스포츠 데이터 기반 분석기"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}