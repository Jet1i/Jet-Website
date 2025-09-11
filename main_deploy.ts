import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.177.0/http/file_server.ts";

serve((req) => {
  const pathname = new URL(req.url).pathname;
  
  // Serve static files from the current directory
  return serveDir(req, {
    fsRoot: ".",
    urlRoot: "",
    showDirListing: true,
    enableCors: true
  });
});