import type { Metadata } from 'next';
import { InvestigationProvider } from '@/components/investigation-provider';
import { Shell } from '@/components/shell';
import { ProviderSettingsContext } from '@/components/provider-context';
import './globals.css';
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const origin =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000');
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: { default: 'Parallax — Open source image intelligence', template: '%s | Parallax' },
  description:
    'Open source image intelligence. Inspect metadata, trace image origins, extract visual clues, and test shadows.',
  openGraph: {
    title: 'Parallax — Open source image intelligence',
    description:
      'Open source image intelligence. Inspect visual evidence and test location hypotheses.',
    type: 'website',
    images: [{ url: `${basePath}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: [`${basePath}/opengraph-image`] },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <ProviderSettingsContext>
          <InvestigationProvider>
            <Shell>{children}</Shell>
          </InvestigationProvider>
        </ProviderSettingsContext>
      </body>
    </html>
  );
}
