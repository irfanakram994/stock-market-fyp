import type { Metadata } from 'next';
import './globals.css';
import { LayoutWrapper } from '@/components/LayoutWrapper';

export const metadata: Metadata = {
    title: 'TradeFlux - AI Stock Prediction System',
    description: 'Production-grade Agentic AI Stock Market Prediction System powered by CrewAI, Prophet, and Groq LLM',
    keywords: ['stock prediction', 'AI', 'machine learning', 'trading', 'market analysis'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="font-sans">
                <LayoutWrapper>{children}</LayoutWrapper>
            </body>
        </html>
    );
}
