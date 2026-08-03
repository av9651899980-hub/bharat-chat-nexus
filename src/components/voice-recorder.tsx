import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { uploadVoiceMessage } from "@/lib/voice.functions";

export function VoiceRecorder({ chatId, onSent }: { chatId: string; onSent: () => void }) {
  const upload = useServerFn(uploadVoiceMessage);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startedAt = useRef<number>(0);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const duration = Math.round((Date.now() - startedAt.current) / 1000);
        setBusy(true);
        try {
          const buffer = new Uint8Array(await blob.arrayBuffer());
          let binary = "";
          buffer.forEach((b) => (binary += String.fromCharCode(b)));
          await upload({
            data: { chatId, base64: btoa(binary), mimeType: "audio/webm", duration },
          });
          onSent();
        } catch {
          toast.error("Voice message could not be sent");
        } finally {
          setBusy(false);
        }
      };
      recorderRef.current = recorder;
      startedAt.current = Date.now();
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone permission is required for voice messages");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      disabled={busy}
      aria-label={recording ? "Stop recording" : "Record voice message"}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
        recording ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"
      }`}
    >
      {busy ? (
        <Loader2 className="size-5 animate-spin" />
      ) : recording ? (
        <Square className="size-4" />
      ) : (
        <Mic className="size-5" />
      )}
    </button>
  );
}

export function VoicePlayer({ path }: { path: string }) {
  const getUrl = useServerFn(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (await0 => await0) as never,
  );
  return null;
}