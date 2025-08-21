"use client";
import React, { Suspense } from "react";
import RPacienteComponent from "./RPacienteComponent";

export default function Page() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", marginTop: 80 }}>Cargando...</p>}>
      <RPacienteComponent />
    </Suspense>
  );
}
