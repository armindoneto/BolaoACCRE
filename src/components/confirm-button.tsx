"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Botão que pede confirmação antes de rodar uma ação do servidor. */
export function ConfirmButton({
  action,
  confirm,
  className,
  children,
}: {
  action: () => Promise<void>;
  confirm: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (!window.confirm(confirm)) return;
        startTransition(async () => {
          await action();
          router.refresh();
        });
      }}
    >
      {pending ? "Aguarde…" : children}
    </button>
  );
}
