import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Category = "all" | "food" | "clothing";

interface Props {
  value: Category;
  onChange: (v: Category) => void;
}

export default function CategoryFilter({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Category)}>
      <TabsList className="w-full">
        <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
        <TabsTrigger value="food" className="flex-1">Food</TabsTrigger>
        <TabsTrigger value="clothing" className="flex-1">Clothing</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
