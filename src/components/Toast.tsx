"use client";

import { useEffect, useState } from "react";

let showToastFn: (msg: string) => void = () => {};

export function toast(msg: string) {
  showToastFn(msg);
}

export default function ToastContainer() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    showToastFn = (msg: string) => {
      setMessage(msg);
      setVisible(true);
      setTimeout(() => setVisible(false), 2500);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-lg animate-[slideDown_0.3s_ease]"
      style={{ background: "var(--primary)" }}
    >
      {message}
    </div>
  );
}
