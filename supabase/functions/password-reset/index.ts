import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => new Response(
  "This Staging preview reset endpoint has been retired. Request a new recovery link from the current application build.",
  {
    status:410,
    headers:{
      "Content-Type":"text/plain; charset=utf-8",
      "Cache-Control":"no-store",
      "Referrer-Policy":"no-referrer",
      "X-Content-Type-Options":"nosniff"
    }
  }
));
