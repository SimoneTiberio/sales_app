import '../style.css';

export const metadata = {
  title: 'Atlas | AI Infrastructure Advisor',
};

export const viewport = {
  themeColor: '#102d2b',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
