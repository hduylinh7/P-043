import './globals.css';
import React from 'react';

export const metadata = {
  title: 'AI Agent (P-043)',
  description: 'AI Agent built with LangGraph, FastAPI, PostgreSQL, Redis and Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
