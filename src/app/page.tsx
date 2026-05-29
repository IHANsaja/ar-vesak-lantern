"use client";

import dynamic from "next/dynamic";

const ARScene = dynamic(() => import("../components/ARScene"), {
  ssr: false,
});

export default function Home() {
  return <ARScene />;
}