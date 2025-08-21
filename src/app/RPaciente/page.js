"use client";

import dynamic from "next/dynamic";

const RPaciente = dynamic(() => import("./RPaciente"), {
  ssr: false,
});

export default function Page() {
  return <RPaciente />;
}