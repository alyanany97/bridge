import { useRef, useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { storage } from "@/firebase";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Item } from "@/components/ItemChips";

interface ParseResult {
  category: string;
  items: Item[];
  description: string;
}

interface Props {
  kind: "offer" | "need";
  onParsed: (result: ParseResult & { photoURL: string }) => void;
}

type State = "capture" | "parsing" | "error";

export default function PhotoIntake({ kind, onParsed }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>("capture");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleFile(file: File) {
    setState("parsing");
    setErrorMsg(null);
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);

    try {
      const storageRef = ref(storage, `posts/${uuidv4()}.jpg`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      const result = await api<ParseResult>("/ai/parse-photo", {
        method: "POST",
        body: JSON.stringify({ photo_url: photoURL, kind }),
      });

      onParsed({ ...result, photoURL });
    } catch (err) {
      console.error("PhotoIntake error:", err);
      setState("error");
      setErrorMsg("Couldn't identify items. Try another photo or describe manually.");
    }
  }

  function handleFallback() {
    onParsed({
      category: "mixed",
      items: [{ name: "", quantity: 1 }],
      description: "",
      photoURL: "",
    });
  }

  if (state === "parsing") {
    return (
      <div className="space-y-4">
        {photoPreview && (
          <img
            src={photoPreview}
            alt="Uploaded photo"
            className="max-h-64 w-full rounded-xl object-cover"
          />
        )}
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles size={14} className="text-primary" />
            Identifying items…
          </p>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {state === "error" && errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-6 py-12 transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <Camera size={32} className="text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-semibold">Take a photo or upload</p>
          <p className="text-xs text-muted-foreground">
            {kind === "offer"
              ? "Photograph items you'd like to donate."
              : "Show us what you need help with."}
          </p>
        </div>
      </button>

      <Button variant="ghost" className="w-full" onClick={handleFallback}>
        Describe in your own words instead
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
