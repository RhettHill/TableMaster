import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabase";
import { useGameStore } from "../../store/gameStore";
import Dnd5eSheet, { Dnd5eData } from "./Dnd5eSheet";
import Pf2eSheet, { Pf2eData } from "./Pf2Sheet";
import GenericSheet, { SheetTemplate } from "./GenericSheet";

interface CharacterSheetProps {
  sheetId: string;
  tokenId: string | null; // for stats sync back to token
  gameId: string;
  userId: string; // current viewer
  isGM: boolean;
  canEdit: boolean;
  onClose: () => void;
}

interface SheetRow {
  id: string;
  data: Record<string, any>;
  user_id: string;
  systems: {
    id: string;
    slug: string;
    name: string;
    sheet_template?: SheetTemplate | null;
  };
}

export default function CharacterSheet({
  sheetId,
  tokenId,
  isGM,
  canEdit,
  onClose,
}: CharacterSheetProps) {
  const [sheetRow, setSheetRow] = useState<SheetRow | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({
    x: Math.max(40, window.innerWidth / 2 - 260),
    y: 60,
  });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const W = panelRef.current?.offsetWidth ?? 520;
      const H = panelRef.current?.offsetHeight ?? 600;
      setPos({
        x: Math.max(
          0,
          Math.min(window.innerWidth - W, e.clientX - dragOffset.current.x),
        ),
        y: Math.max(
          0,
          Math.min(window.innerHeight - H, e.clientY - dragOffset.current.y),
        ),
      });
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  const storeUpdateToken = useGameStore((s) => s.updateToken);

  // Find the token linked to this sheet.
  // Prefer the prop, then store lookup by sheet_id, then by owner_id.

  // ── Load sheet + system ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Step 1: load the sheet row itself
      const { data: sheetRow, error: sheetErr } = await supabase
        .from("character_sheets")
        .select("id, data, user_id, system_id")
        .eq("id", sheetId)
        .single();

      if (sheetErr || !sheetRow) {
        setLoading(false);
        return;
      }

      // Step 2: load the system separately — sheet_template may not exist yet
      const { data: systemData } = await supabase
        .from("systems")
        .select("id, slug, name, sheet_template") // ← THIS IS MISSING
        .eq("id", sheetRow.system_id)
        .single();

      // Assemble a row-like object so the rest of the component works unchanged
      const row = {
        id: sheetRow.id,
        data: sheetRow.data,
        user_id: sheetRow.user_id,
        systems: systemData ?? {
          id: sheetRow.system_id,
          slug: "dnd5e",
          name: "D&D 5e",
          sheet_template: null,
        },
      };

      if (!row) {
        setLoading(false);
        return;
      }

      let sheetData = { ...(row.data ?? {}) };

      // ── Stats sync: seed from token.stats_json if sheet fields are empty ──
      const sysSlug = (row.systems as any)?.slug;
      if (tokenId && (sysSlug === "dnd5e" || sysSlug === "pf2e")) {
        const { data: token } = await supabase
          .from("tokens")
          .select("stats_json, name")
          .eq("id", tokenId)
          .single();

        if (token?.stats_json) {
          const s = token.stats_json as any;
          if (!sheetData.characterName && token.name)
            sheetData.characterName = token.name;
          if (!sheetData.hp && s.hp) sheetData.hp = s.hp;
          if (!sheetData.maxHp && s.maxHp) sheetData.maxHp = s.maxHp;
          if (!sheetData.ac && s.ac) sheetData.ac = s.ac;
        }
      }

      setSheetRow(row as unknown as SheetRow);
      setData(sheetData);
      setLoading(false);
    };
    load();
  }, [sheetId, tokenId]);

  // ── Save with debounce ────────────────────────────────────────────────────
  const save = useCallback(
    async (d: Record<string, any>) => {
      if (!canEdit) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        await supabase
          .from("character_sheets")
          .update({ data: d })
          .eq("id", sheetId);

        // Sync stats and name to ALL tokens linked to this sheet.
        // Fetches every token with sheet_id = sheetId so multiple tokens
        // (e.g. player has two tokens on different scenes) all stay in sync.
        const { data: linkedTokens } = await supabase
          .from("tokens")
          .select("id, stats_json")
          .eq("sheet_id", sheetId);

        if (linkedTokens && linkedTokens.length > 0) {
          const tokenUpdate: Record<string, any> = {};
          if (d.characterName) tokenUpdate.name = d.characterName;

          // Merge hp/maxHp/ac into existing stats_json
          const hasStats =
            d.hp !== undefined || d.maxHp !== undefined || d.ac !== undefined;
          if (hasStats) {
            // Use first token's stats_json as base (they should all match)
            const base = (linkedTokens[0].stats_json as any) ?? {};
            const merged = {
              ...base,
              ...(d.hp !== undefined ? { hp: d.hp } : {}),
              ...(d.maxHp !== undefined ? { maxHp: d.maxHp } : {}),
              ...(d.ac !== undefined ? { ac: d.ac } : {}),
            };
            tokenUpdate.stats_json = merged;
          }

          if (Object.keys(tokenUpdate).length > 0) {
            const tokenIds = linkedTokens.map((t: any) => t.id);
            // Update all tokens in one call
            await supabase
              .from("tokens")
              .update(tokenUpdate)
              .in("id", tokenIds);
            // Update local store for each
            tokenIds.forEach((id: string) => storeUpdateToken(id, tokenUpdate));
          }
        }

        setSaving(false);
      }, 800);
    },
    [canEdit, sheetId, tokenId, storeUpdateToken],
  );

  const update = useCallback(
    (patch: Record<string, any>) => {
      setData((prev) => {
        const next = { ...prev, ...patch };
        save(next);
        return next;
      });
    },
    [save],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const slug = (sheetRow?.systems as any)?.slug ?? "dnd5e";
  const sysName = (sheetRow?.systems as any)?.name ?? "Character Sheet";
  const template = (sheetRow?.systems as any)
    ?.sheet_template as SheetTemplate | null;

  const charName =
    slug === "dnd5e"
      ? (data as Dnd5eData).characterName || "Unnamed Character"
      : (data.characterName as string) || "Unnamed Character";

  const subline =
    slug === "dnd5e"
      ? [
          (data as Partial<Dnd5eData>).race,
          (data as Partial<Dnd5eData>).class,
          (data as Partial<Dnd5eData>).background,
        ]
          .filter(Boolean)
          .join(" · ") || "D\&D 5e"
      : slug === "pf2e"
        ? [
            (data as Partial<Pf2eData>).ancestry,
            (data as Partial<Pf2eData>).characterClass,
            (data as Partial<Pf2eData>).background,
            (data as Partial<Pf2eData>).level
              ? `Level ${(data as Partial<Pf2eData>).level}`
              : "",
          ]
            .filter(Boolean)
            .join(" · ") || "Pathfinder 2e"
        : (sheetRow?.systems?.name ?? "Character");

  if (loading) {
    return createPortal(
      <div
        className="fixed z-[300] rounded-2xl border border-white/10 bg-[#0f0f1c]/98 shadow-2xl flex items-center justify-center"
        style={{ left: pos.x, top: pos.y, width: 520, height: 120 }}
      >
        <span className="text-white/30 text-sm">Loading sheet…</span>
      </div>,
      document.body,
    );
  }

  if (!sheetRow) {
    return createPortal(
      <div
        className="fixed z-[300] rounded-2xl border border-white/10 bg-[#0f0f1c]/98 shadow-2xl flex flex-col items-center justify-center gap-2"
        style={{ left: pos.x, top: pos.y, width: 520, height: 120 }}
      >
        <span className="text-white/30 text-sm">Sheet not found.</span>
        <button
          onClick={onClose}
          className="text-xs text-amber-400/60 hover:text-amber-400"
        >
          Close
        </button>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[300] rounded-2xl border border-white/10 bg-[#0f0f1c]/98 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col"
      style={{ left: pos.x, top: pos.y, width: 520, maxHeight: "90vh" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 cursor-grab active:cursor-grabbing select-none bg-[#0f0f1c] flex-shrink-0"
        onMouseDown={onHeaderMouseDown}
      >
        <div className="flex items-center gap-3">
          <span className="text-white/25 text-xs">⠿</span>
          <div>
            <p className="text-white/90 text-sm font-semibold">{charName}</p>
            <p className="text-white/30 text-[10px]">{subline}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-[10px] text-amber-400/60 animate-pulse">
              Saving…
            </span>
          )}
          {!canEdit && (
            <span className="text-[10px] text-white/25 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
              View only
            </span>
          )}
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Sheet content (scrollable) ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {slug === "dnd5e" ? (
          <Dnd5eSheet
            data={data as Partial<Dnd5eData>}
            canEdit={canEdit}
            isGM={isGM}
            onChange={update}
          />
        ) : slug === "pf2e" ? (
          <Pf2eSheet
            data={data as Partial<Pf2eData>}
            canEdit={canEdit}
            isGM={isGM}
            onChange={update}
          />
        ) : template ? (
          <GenericSheet
            template={template}
            data={data}
            canEdit={canEdit}
            onChange={update}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-white/25 text-sm">
              No sheet template for{" "}
              <span className="text-white/50">{sysName}</span>.
            </p>
            <p className="text-white/15 text-xs">
              Add a <code className="text-white/30">sheet_template</code> JSON
              to the systems table.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
