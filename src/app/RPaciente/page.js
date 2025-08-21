"use client";

import dynamic from "next/dynamic";

const RPacienteComponent = dynamic(() => import("./RPacienteComponent"), {
  ssr: false, // Desactiva renderizado del lado del servidor
});

export default function Page() {
  return <RPacienteComponent />;
}