"use client";

import React, { Suspense } from "react";
import GuardadoComponent from "./GuardadoComponent";

export default function Page() {
  return (
    <Suspense fallback={<p>Cargando...</p>}>
      <GuardadoComponent />
    </Suspense>
  );
}
