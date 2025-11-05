"use client";

import { useState } from "react";
import { LoginForm } from "./login-form";
import { SignUpForm } from "./sign-up-form";

export default function AuthTabs() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div className="grid w-full mb-8">
      <div className="flex mb-8">
        
        
      </div>
      {tab === "login" ? <LoginForm /> : <SignUpForm />}
    </div>
  );
}
