import type { Metadata } from "next";
import TrialSetupClient from "./trial-setup-client";

export const metadata: Metadata = {
  title: "Welcome to Trefolio Pro | trefolio",
  description: "Setting up your Pro experience.",
};

export default function TrialWelcomePage() {
  return <TrialSetupClient />;
}
