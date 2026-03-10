// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Hello from Functions!");

Deno.serve(async (req) => {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response("Missing userId", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const { data: userFiles, error: storageError } = await supabase.storage
      .from("avatars").list("", { limit: 100, search: userId });

    if (storageError) {
      console.error("Error fetching user files:", storageError.message);
      return new Response("Failed to fetch user files", { status: 500 });
    }

    if (userFiles?.length > 0) {
      const deletePromises = userFiles.map((file) =>
        supabase.storage.from("avatars").remove([file.name])
      );
      const deleteResults = await Promise.all(deletePromises);

      for (const result of deleteResults) {
        if (result.error) {
          console.error("Error deleting file:", result.error.message);
          return new Response("Failed to delete user files", { status: 500 });
        }
      }
    }

    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(
      userId,
    );

    if (deleteUserError) {
      console.error("Error deleting user:", deleteUserError.message);
      return new Response("Failed to delete user", { status: 500 });
    }

    return new Response("User and files deleted successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing request:", (error as Error).message);
    return new Response("Internal server error", { status: 500 });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/deleteUser' \
    --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
