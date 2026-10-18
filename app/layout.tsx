import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Posto VN | Gestão de abastecimentos',description:'Abastecimentos, veículos e fechamento mensal por instituição.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
