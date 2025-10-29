"use client";

import { useState } from "react";
import { LoginForm } from "./login-form";
import { SignUpForm } from "./sign-up-form";

export default function AuthTabs() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div className="w-full max-w-sm mx-auto bg-white/10 rounded-lg shadow p-8">
      <div className="flex mb-8">
        
        
      </div>
      {tab === "login" ? <LoginForm /> : <SignUpForm />}
    </div>
  );
}
