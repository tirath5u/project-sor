import { createFileRoute } from "@tanstack/react-router";

const CHALLENGE_TOKEN = "mpdwQJN-PP7NxTtqggiq0TXkArvETb1yp6sggwonAtE";

export const Route = createFileRoute("/.well-known/openai-apps-challenge")({
  server: {
    handlers: {
      GET: async () =>
        new Response(CHALLENGE_TOKEN, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        }),
    },
  },
});
