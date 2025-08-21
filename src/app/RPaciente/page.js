"use client";

import dynamic from "next/dynamic";

const RPacienteComponent = dynamic(() => import("./RPacienteComponent"), {
  ssr: false,
});

export default function Page() {
  return <RPacienteComponent />;
}