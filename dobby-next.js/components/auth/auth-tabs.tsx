"use client";

import { useState } from "react";
import { LoginForm } from "./login-form";
import { SignUpForm } from "./sign-up-form";

interface AuthTabsProps {
  defaultTab?: "login" | "signup";
}

export default function AuthTabs({ defaultTab = "login" }: AuthTabsProps) {
  const [tab, setTab] = useState<"login" | "signup">(defaultTab);

  return (
    <div className="w-full">
      {/* Form */}
      {tab === "login" ? <LoginForm onSwitchToSignup={() => setTab("signup")} /> : <SignUpForm onSwitchToLogin={() => setTab("login")} />}
    </div>
  );
}
