import { Suspense } from "react";
import SignedInAs from "./signed-in-as";

export default function Home() {
  return (
    <main className="flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Aruno Store</h1>
        <Suspense fallback={null}>
          <SignedInAs />
        </Suspense>
      </div>
    </main>
  );
}