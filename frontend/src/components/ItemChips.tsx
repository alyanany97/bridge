import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Item {
  name: string;
  quantity: number;
  size?: string;
  condition?: string;
  urgency?: string;
}

interface Props {
  items: Item[];
  onChange: (items: Item[]) => void;
  kind: "offer" | "need";
}

export default function ItemChips({ items, onChange, kind }: Props) {
  function update(index: number, field: keyof Item, value: string | number) {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    onChange([...items, { name: "", quantity: 1 }]);
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Input
              value={item.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Item name"
              className="bg-background"
            />
            <div className="flex gap-2">
              <div className="flex w-24 flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Qty</span>
                <Input
                  type="number"
                  value={item.quantity}
                  min={1}
                  onChange={(e) => update(i, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-background"
                />
              </div>
              {kind === "offer" && (
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Size (optional)</span>
                  <Input
                    value={item.size ?? ""}
                    onChange={(e) => update(i, "size", e.target.value)}
                    placeholder="e.g. M, 500g"
                    className="bg-background"
                  />
                </div>
              )}
              {kind === "need" && (
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Urgency (optional)</span>
                  <select
                    value={item.urgency ?? ""}
                    onChange={(e) => update(i, "urgency", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">—</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="mt-1 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove item"
          >
            <X size={15} />
          </button>
        </div>
      ))}

      <Button variant="ghost" size="sm" className="gap-1" onClick={addItem}>
        <Plus size={14} />
        Add item
      </Button>
    </div>
  );
}
