import ToolsLayoutClient from "./tools-layout-client";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToolsLayoutClient>
      {children}
    </ToolsLayoutClient>
  );
}
