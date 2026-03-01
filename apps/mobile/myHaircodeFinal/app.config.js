import "dotenv/config";

export default ({ config }) => {
  const newConfig = {
    ...config,
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL || "",
      SUPABASE_ANON: process.env.SUPABASE_ANON || "",
      SUPABASE_FUNCTION_URL: process.env.SUPABASE_FUNCTION_URL || "",
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
      eas: {
        projectId: "88667b8c-f786-4a66-aa68-d9b4ee0c7c8e",
      },
    },
  };

  return newConfig;
};
