import "./globals.css";
import React from "react";
import Sidebar from "../src/components/Sidebar";
import { CompanionProvider } from "../src/components/Companion/CompanionProvider";
import CompanionDock from "../src/components/Companion/CompanionDock";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

export const metadata = {
    title: "Mentora | PageLM",
    description: "Next.js migration for Mentora PageLM",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-black text-stone-300 min-h-screen flex flex-col font-sans custom-scroll">
                <ErrorBoundary>
                    <CompanionProvider>
                        <div className="bg-black text-stone-300 min-h-screen flex flex-col sm:flex-row">
                            <Sidebar />
                            <div className="flex-1 relative overflow-auto">
                                <ErrorBoundary>{children}</ErrorBoundary>
                            </div>
                        </div>
                        <CompanionDock />
                    </CompanionProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
