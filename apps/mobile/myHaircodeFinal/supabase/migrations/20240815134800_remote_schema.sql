
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."add_hairdresser_client_relationship"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$begin
  if not exists (
    select 1 from hairdresser_clients 
    where hairdresser_id = new.hairdresser_id and client_id = new.client_id
  ) then
    insert into hairdresser_clients (hairdresser_id, client_id)
    values (new.hairdresser_id, new.client_id);
  end if;
  return new;
end;$$;

ALTER FUNCTION "public"."add_hairdresser_client_relationship"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_user_insert()"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$begin
  if new.user_type = 'HAIRDRESSER' then
    insert into public.hairdressers (id, salon_name, about_me) values (new.id, new.salon_name, new.about_me);
  elsif new.user_type = 'CLIENT' then
    insert into clients (id) values (new.id);
  end if;
  return new;
end;$$;

ALTER FUNCTION "public"."handle_user_insert()"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."notify_hairdresser_of_new_client()"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$declare
  client_name text;
  
begin
  -- Look up the full name of the client who added the hairdresser
  select full_name into client_name 
  from profiles
  where id = new.client_id;

  -- Insert a notification for the hairdresser
  insert into notifications (user_id, message)
  values (
    new.hairdresser_id, 
    client_name || ' got added to my Clients.'
  );

  return new;
end;$$;

ALTER FUNCTION "public"."notify_hairdresser_of_new_client()"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."sync_hairdresser_info"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$begin
  -- Update the corresponding fields in the hairdressers table
  if new.salon_name is distinct from old.salon_name or new.about_me is distinct from old.about_me then
    update hairdressers
    set 
      salon_name = new.salon_name,
      about_me = new.about_me
    where  id = new.id;
  end if;

  return new;
end;$$;

ALTER FUNCTION "public"."sync_hairdresser_info"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."clients" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."haircode_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "haircode_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_url" "text" NOT NULL,
    "media_type" "text" NOT NULL
);

ALTER TABLE "public"."haircode_media" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."haircodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hairdresser_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_description" "text"
);

ALTER TABLE "public"."haircodes" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."hairdresser_clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hairdresser_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE "public"."hairdresser_clients" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."hairdressers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "salon_name" "text",
    "about_me" "text"
);

ALTER TABLE "public"."hairdressers" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."inspirations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shared_by" "uuid" DEFAULT "gen_random_uuid"(),
    "image_url" "text"
);

ALTER TABLE "public"."inspirations" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false
);

ALTER TABLE "public"."notifications" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "phone_number" "text",
    "user_type" "text" DEFAULT 'HAIRDRESSER'::"text",
    "salon_phone_number" "text",
    "salon_name" "text",
    "about_me" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("email") >= 3))
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";

ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."haircode_media"
    ADD CONSTRAINT "haircode_media_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."haircodes"
    ADD CONSTRAINT "haircodes_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."hairdresser_clients"
    ADD CONSTRAINT "hairdresser_clients_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."hairdressers"
    ADD CONSTRAINT "hairdressers_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."inspirations"
    ADD CONSTRAINT "inspirations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_website_key" UNIQUE ("phone_number");

CREATE OR REPLACE TRIGGER "add_hairdresser_client_relationship_trigger" AFTER INSERT ON "public"."haircodes" FOR EACH ROW EXECUTE FUNCTION "public"."add_hairdresser_client_relationship"();

CREATE OR REPLACE TRIGGER "after_user_insert" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_insert()"();

CREATE OR REPLACE TRIGGER "notify_hairdresser_of_new_client_trigger" AFTER INSERT ON "public"."hairdresser_clients" FOR EACH ROW EXECUTE FUNCTION "public"."notify_hairdresser_of_new_client()"();

CREATE OR REPLACE TRIGGER "sync_hairdresser_info_trigger" AFTER UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_hairdresser_info"();

ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."haircode_media"
    ADD CONSTRAINT "haircode_media_haircode_id_fkey" FOREIGN KEY ("haircode_id") REFERENCES "public"."haircodes"("id");

ALTER TABLE ONLY "public"."haircodes"
    ADD CONSTRAINT "haircodes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."haircodes"
    ADD CONSTRAINT "haircodes_hairdresser_id_fkey" FOREIGN KEY ("hairdresser_id") REFERENCES "public"."hairdressers"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."hairdresser_clients"
    ADD CONSTRAINT "hairdresser_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."hairdresser_clients"
    ADD CONSTRAINT "hairdresser_clients_hairdresser_id_fkey" FOREIGN KEY ("hairdresser_id") REFERENCES "public"."hairdressers"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."hairdressers"
    ADD CONSTRAINT "hairdressers_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."inspirations"
    ADD CONSTRAINT "inspirations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."inspirations"
    ADD CONSTRAINT "inspirations_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE POLICY "Allow client read access" ON "public"."clients" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));

CREATE POLICY "Allow client read access to inspirations" ON "public"."inspirations" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "shared_by")));

CREATE POLICY "Allow client to update profile" ON "public"."clients" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));

CREATE POLICY "Allow hairdresser and client read access" ON "public"."haircodes" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "hairdresser_id") OR ("auth"."uid"() = ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."id" = "haircodes"."client_id")))));

CREATE POLICY "Allow hairdresser and client read access" ON "public"."hairdresser_clients" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "hairdresser_id") OR ("auth"."uid"() = "client_id")));

CREATE POLICY "Allow hairdresser and clients to add each other" ON "public"."hairdresser_clients" FOR INSERT WITH CHECK ((("auth"."uid"() = "hairdresser_id") OR ("auth"."uid"() = "client_id")));

CREATE POLICY "Allow hairdresser read access" ON "public"."hairdressers" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));

CREATE POLICY "Allow hairdresser to insert haircodes" ON "public"."haircodes" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "hairdresser_id") AND (EXISTS ( SELECT 1
   FROM "public"."hairdresser_clients"
  WHERE (("hairdresser_clients"."hairdresser_id" = "auth"."uid"()) AND ("hairdresser_clients"."client_id" = "hairdresser_clients"."client_id"))))));

CREATE POLICY "Allow hairdresser to insert media" ON "public"."haircode_media" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = ( SELECT "haircodes"."hairdresser_id"
   FROM "public"."haircodes"
  WHERE ("haircodes"."id" = "haircode_media"."haircode_id"))));

CREATE POLICY "Allow hairdresser to update profile" ON "public"."hairdressers" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));

CREATE POLICY "Allow insert access to inspirations" ON "public"."inspirations" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "shared_by")));

CREATE POLICY "Allow inserting notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Allow read access to haircode media" ON "public"."haircode_media" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."haircodes"
  WHERE (("haircodes"."id" = "haircodes"."id") AND (("auth"."uid"() = "haircodes"."hairdresser_id") OR ("auth"."uid"() = ( SELECT "clients"."id"
           FROM "public"."clients"
          WHERE ("clients"."id" = "haircodes"."client_id"))))))));

CREATE POLICY "Allow users to read their notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));

CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));

ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."haircode_media" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."haircodes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."hairdresser_clients" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."hairdressers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."inspirations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."add_hairdresser_client_relationship"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_hairdresser_client_relationship"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_hairdresser_client_relationship"() TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_user_insert()"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_insert()"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_insert()"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_hairdresser_of_new_client()"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_hairdresser_of_new_client()"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_hairdresser_of_new_client()"() TO "service_role";

GRANT ALL ON FUNCTION "public"."sync_hairdresser_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_hairdresser_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_hairdresser_info"() TO "service_role";

GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";

GRANT ALL ON TABLE "public"."haircode_media" TO "anon";
GRANT ALL ON TABLE "public"."haircode_media" TO "authenticated";
GRANT ALL ON TABLE "public"."haircode_media" TO "service_role";

GRANT ALL ON TABLE "public"."haircodes" TO "anon";
GRANT ALL ON TABLE "public"."haircodes" TO "authenticated";
GRANT ALL ON TABLE "public"."haircodes" TO "service_role";

GRANT ALL ON TABLE "public"."hairdresser_clients" TO "anon";
GRANT ALL ON TABLE "public"."hairdresser_clients" TO "authenticated";
GRANT ALL ON TABLE "public"."hairdresser_clients" TO "service_role";

GRANT ALL ON TABLE "public"."hairdressers" TO "anon";
GRANT ALL ON TABLE "public"."hairdressers" TO "authenticated";
GRANT ALL ON TABLE "public"."hairdressers" TO "service_role";

GRANT ALL ON TABLE "public"."inspirations" TO "anon";
GRANT ALL ON TABLE "public"."inspirations" TO "authenticated";
GRANT ALL ON TABLE "public"."inspirations" TO "service_role";

GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
