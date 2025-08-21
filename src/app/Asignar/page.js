"use client";
import React, { Suspense } from "react";
import AsignarCitaComponent from "./AsignarCitaComponent";

export default function Page() {
  return (
    <Suspense fallback={<p style={{textAlign: "center", marginTop: 80}}>Cargando...</p>}>
      <AsignarCitaComponent />
    </Suspense>
  );
}
