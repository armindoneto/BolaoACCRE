"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { TeamBadge } from "@/components/team-badge";
import {
  adminDeleteTeam,
  adminRemoveCrest,
  adminUpdateTeam,
  adminUploadCrest,
  type ActionResult,
  type TeamForm,
} from "../actions";

const SIZE = 256;

/**
 * Reduz a imagem escolhida para um PNG de até 256×256 no próprio navegador,
 * mantendo a proporção e o fundo transparente. Assim qualquer foto ou arquivo
 * grande vira um escudo leve antes de ser enviado.
 */
async function toSmallPng(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth || SIZE;
    const h = img.naturalHeight || SIZE;
    const scale = Math.min(SIZE / w, SIZE / h, 1);
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    const dw = w * scale;
    const dh = h * scale;
    ctx.drawImage(img, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("falhou"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function TeamEditor({
  team,
  editions,
}: {
  team: TeamForm & { id: string; crestUrl: string | null };
  /** Edições em que o time aparece (com o nível). Sem nenhuma, o time pode ser excluído. */
  editions: { name: string; tier: number }[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<TeamForm>({
    name: team.name,
    shortName: team.shortName,
    code: team.code,
    color: team.color,
    color2: team.color2,
  });
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (key: keyof TeamForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFeedback(null);
  };
  const dirty = (Object.keys(form) as (keyof TeamForm)[]).some((k) => form[k] !== team[k]);

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      let result: ActionResult;
      try {
        result = await action();
      } catch {
        result = { ok: false, error: "Não deu certo agora. Tente de novo." };
      }
      setFeedback(result);
      if (result.ok) router.refresh();
    });
  }

  function upload(file: File | undefined) {
    if (!file) return;
    run(async () => {
      let png: Blob;
      try {
        png = await toSmallPng(file);
      } catch {
        return { ok: false, error: "Não consegui ler essa imagem. Use PNG, JPG, WebP ou SVG." };
      }
      const data = new FormData();
      data.append("crest", png, "escudo.png");
      return adminUploadCrest(team.id, data);
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <details className="card group">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <TeamBadge team={{ ...form, crestUrl: team.crestUrl }} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{team.name}</span>
          <span className="block truncate text-xs text-muted">
            {team.code} · {team.crestUrl ? "com escudo" : "sem escudo"} ·{" "}
            {editions.length === 0
              ? "em nenhuma edição"
              : editions.length === 1
                ? editions[0].name
                : `${editions.length} edições`}
          </span>
        </span>
        <span className="text-sm font-semibold text-primary group-open:hidden">Editar</span>
      </summary>

      <div className="space-y-3 border-t border-border p-3">
        {editions.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {editions.map((e) => (
              <li key={e.name} className="chip bg-border/60 text-fg">
                {e.name} <span className="font-normal text-muted">· nível {e.tier}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />
          <button type="button" className="btn-primary" disabled={pending} onClick={() => fileRef.current?.click()}>
            <ImageUp className="size-4" /> {team.crestUrl ? "Trocar escudo" : "Enviar escudo"}
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={pending || !team.crestUrl}
            onClick={() => run(() => adminRemoveCrest(team.id))}
          >
            <Trash2 className="size-4" /> Remover
          </button>
        </div>
        <p className="text-xs text-muted">
          Prefira PNG com fundo transparente. A imagem é reduzida automaticamente.
        </p>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => adminUpdateTeam(team.id, form));
          }}
        >
          <div>
            <label className="label" htmlFor={`name-${team.id}`}>Nome</label>
            <input id={`name-${team.id}`} className="input" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={60} required />
          </div>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <div>
              <label className="label" htmlFor={`short-${team.id}`}>Nome curto</label>
              <input id={`short-${team.id}`} className="input" value={form.shortName} onChange={(e) => set("shortName", e.target.value)} maxLength={24} />
            </div>
            <div>
              <label className="label" htmlFor={`code-${team.id}`}>Sigla</label>
              <input
                id={`code-${team.id}`}
                className="input uppercase"
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase().slice(0, 4))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor={`c1-${team.id}`}>Cor principal</label>
              <input id={`c1-${team.id}`} type="color" className="input p-1" value={form.color} onChange={(e) => set("color", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor={`c2-${team.id}`}>Cor secundária</label>
              <input id={`c2-${team.id}`} type="color" className="input p-1" value={form.color2} onChange={(e) => set("color2", e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted">As cores e a sigla só aparecem quando o time está sem imagem de escudo.</p>
          <button type="submit" className="btn-outline w-full" disabled={pending || !dirty}>
            {pending ? "Aguarde…" : "Salvar dados do time"}
          </button>
        </form>

        {editions.length === 0 && (
          <button
            type="button"
            className="btn-danger w-full"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Excluir ${team.name} do cadastro de times?`)) run(() => adminDeleteTeam(team.id));
            }}
          >
            Excluir time (não está em nenhuma edição)
          </button>
        )}

        {feedback && (
          <p
            role="status"
            className={
              feedback.ok
                ? "rounded-xl bg-primary-soft p-3 text-sm font-medium text-primary"
                : "rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger"
            }
          >
            {feedback.ok ? feedback.message : feedback.error}
          </p>
        )}
      </div>
    </details>
  );
}
