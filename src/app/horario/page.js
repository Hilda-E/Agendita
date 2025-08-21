"use client";

import React, { Suspense } from "react";
import HorarioComponent from "./HorarioComponent";

export default function Page() {
  return (
    <Suspense fallback={<p>Cargando...</p>}>
      <HorarioComponent />
    </Suspense>
  );
}
