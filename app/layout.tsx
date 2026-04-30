import type {Metadata} from 'next';
import { Space_Grotesk, Playfair_Display } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import { ChatWidget } from '../components/ChatWidget';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Next Chapter Travel HQ',
  description: 'Content Strategy Dashboard for Next Chapter Travel LLC',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${playfair.variable} font-sans antialiased bg-[#fdfcf9] text-slate-900`} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <ChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
