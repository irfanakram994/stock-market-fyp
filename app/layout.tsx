import type { Metadata } from 'next';
import './globals.css';
import { LayoutWrapper } from '@/components/LayoutWrapper';

export const metadata: Metadata = {
    title: 'TradeFlux | AI Stock Research Workspace',
    description: 'TradeFlux combines AI predictions, market news sentiment, backtesting, visual analytics, and agent logs in one stock research dashboard.',
    keywords: ['TradeFlux', 'stock prediction', 'AI trading', 'market analysis', 'backtesting', 'sentiment analysis'],
    icons: {
        icon: [
            { url: '/icon.png', type: 'image/png' },
            { url: '/logo-only-no-text.png', type: 'image/png' },
        ],
        shortcut: '/icon.png',
        apple: '/icon.png',
    },
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
