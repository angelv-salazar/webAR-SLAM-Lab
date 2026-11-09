-- Estudio SLAM · instalación desde cero en un proyecto Supabase NUEVO.
-- Script generado a partir de la estructura funcional (sin obras, usuarios ni claves).
-- PASO PREVIO: crear proyecto Supabase; habilitar Authentication > Anonymous Sign-Ins.
-- PASO POSTERIOR: agregar el email de coordinación en slam_private.coordinators.
-- Ejecutar UNA sola vez desde SQL Editor. No usarlo sobre proyectos existentes.
begin;
create schema if not exists slam_private;
revoke all on schema slam_private from PUBLIC, anon, authenticated;
grant usage on schema public to authenticated;

-- "slam_private"."coordinators"
create table "slam_private"."coordinators" (
  "email" text not null,
  "created_at" timestamp with time zone not null default now(),
  constraint "coordinators_email_check" CHECK (((email = lower(email)) AND (POSITION(('@'::text) IN (email)) > 1))),
  constraint "coordinators_pkey" PRIMARY KEY (email)
);

-- "public"."slam_projects"
create table "public"."slam_projects" (
  "id" uuid not null default gen_random_uuid(),
  "route_id" text not null,
  "title" text not null,
  "created_by" uuid not null,
  "state" text not null default 'draft'::text,
  "created_at" timestamp with time zone not null default now(),
  "description" text not null default ''::text,
  constraint "slam_projects_description_check" CHECK ((char_length(description) <= 500)),
  constraint "slam_projects_pkey" PRIMARY KEY (id),
  constraint "slam_projects_route_id_check" CHECK ((route_id ~ '^id-[a-z0-9-]{8,60}$'::text)),
  constraint "slam_projects_route_id_key" UNIQUE (route_id),
  constraint "slam_projects_state_check" CHECK ((state = ANY (ARRAY['draft'::text, 'locked'::text]))),
  constraint "slam_projects_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 100)))
);

-- "public"."slam_members"
create table "public"."slam_members" (
  "project_id" uuid not null,
  "user_id" uuid not null,
  "role" text not null,
  "display_name" text not null,
  "joined_at" timestamp with time zone not null default now(),
  constraint "slam_members_display_name_check" CHECK (((char_length(display_name) >= 1) AND (char_length(display_name) <= 80))),
  constraint "slam_members_pkey" PRIMARY KEY (project_id, user_id),
  constraint "slam_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'contributor'::text])))
);

-- "public"."slam_entries"
create table "public"."slam_entries" (
  "id" uuid not null default gen_random_uuid(),
  "project_id" uuid not null,
  "user_id" uuid not null,
  "source_entry_id" text not null,
  "author_label" text not null,
  "title" text not null,
  "description" text not null default ''::text,
  "model_path" text not null,
  "marker_image_path" text not null,
  "marker_print_path" text not null,
  "patt_path" text not null,
  "x_cm" numeric not null default 0,
  "y_cm" numeric not null default 0,
  "z_cm" numeric not null default 0,
  "size_cm" numeric not null default 12,
  "rotation_deg" numeric not null default 0,
  "rotation_vertical_deg" numeric not null default 0,
  "animation" text not null default 'none'::text,
  "updated_at" timestamp with time zone not null default now(),
  constraint "slam_entries_animation_check" CHECK ((animation = ANY (ARRAY['none'::text, 'spin'::text, 'float'::text, 'pulse'::text, 'orbit'::text, 'metamorphosis'::text, 'embedded'::text]))),
  constraint "slam_entries_author_label_check" CHECK (((char_length(author_label) >= 1) AND (char_length(author_label) <= 80))),
  constraint "slam_entries_description_check" CHECK ((char_length(description) <= 500)),
  constraint "slam_entries_pkey" PRIMARY KEY (id),
  constraint "slam_entries_project_id_user_id_source_entry_id_key" UNIQUE (project_id, user_id, source_entry_id),
  constraint "slam_entries_size_cm_check" CHECK (((size_cm >= (1)::numeric) AND (size_cm <= (300)::numeric))),
  constraint "slam_entries_source_entry_id_check" CHECK ((source_entry_id ~ '^id-[a-z0-9-]{8,60}$'::text)),
  constraint "slam_entries_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 100))),
  constraint "slam_paths_owner" CHECK (((model_path = ((((((project_id)::text || '/'::text) || (user_id)::text) || '/'::text) || source_entry_id) || '/model.glb'::text)) AND (marker_image_path = ((((((project_id)::text || '/'::text) || (user_id)::text) || '/'::text) || source_entry_id) || '/art.png'::text)) AND (marker_print_path = ((((((project_id)::text || '/'::text) || (user_id)::text) || '/'::text) || source_entry_id) || '/print.png'::text)) AND (patt_path = ((((((project_id)::text || '/'::text) || (user_id)::text) || '/'::text) || source_entry_id) || '/pattern.patt'::text))))
);

-- "slam_private"."invites"
create table "slam_private"."invites" (
  "project_id" uuid not null,
  "token_hash" bytea not null,
  "created_at" timestamp with time zone not null default now(),
  constraint "invites_pkey" PRIMARY KEY (project_id),
  constraint "invites_token_hash_key" UNIQUE (token_hash)
);

-- "slam_private"."preview_links"
create table "slam_private"."preview_links" (
  "entry_id" uuid not null,
  "token_hash" bytea not null,
  "created_by" uuid not null,
  "created_at" timestamp with time zone not null default now(),
  "expires_at" timestamp with time zone not null,
  constraint "preview_links_pkey" PRIMARY KEY (entry_id),
  constraint "preview_links_token_hash_key" UNIQUE (token_hash)
);

-- Foreign keys are added after every base table exists.
alter table "public"."slam_entries" add constraint "slam_entries_project_id_fkey" FOREIGN KEY (project_id) REFERENCES slam_projects(id) ON DELETE CASCADE;
alter table "public"."slam_entries" add constraint "slam_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "public"."slam_entries" add constraint "slam_entry_member_fk" FOREIGN KEY (project_id, user_id) REFERENCES slam_members(project_id, user_id) ON DELETE CASCADE;
alter table "public"."slam_members" add constraint "slam_members_project_id_fkey" FOREIGN KEY (project_id) REFERENCES slam_projects(id) ON DELETE CASCADE;
alter table "public"."slam_members" add constraint "slam_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "public"."slam_projects" add constraint "slam_projects_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "slam_private"."invites" add constraint "invites_project_id_fkey" FOREIGN KEY (project_id) REFERENCES slam_projects(id) ON DELETE CASCADE;
alter table "slam_private"."preview_links" add constraint "preview_links_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "slam_private"."preview_links" add constraint "preview_links_entry_id_fkey" FOREIGN KEY (entry_id) REFERENCES slam_entries(id) ON DELETE CASCADE;

CREATE INDEX slam_entries_project_idx ON public.slam_entries USING btree (project_id, updated_at DESC);
CREATE INDEX slam_members_user_idx ON public.slam_members USING btree (user_id);

-- Private tables are accessed only by security-definer routines.
alter table slam_private.coordinators enable row level security;
alter table slam_private.invites enable row level security;
alter table slam_private.preview_links enable row level security;
revoke all on all tables in schema slam_private from PUBLIC, anon, authenticated;

-- slam_private.enforce_entry_limit
CREATE OR REPLACE FUNCTION slam_private.enforce_entry_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform 1 from public.slam_projects p
  where p.id=new.project_id for update;
  if not found then raise exception 'Recorrido compartido inexistente'; end if;

  if exists(
    select 1 from public.slam_entries e
    where e.project_id=new.project_id
      and e.source_entry_id=new.source_entry_id
  ) then
    raise exception 'Este marcador ya existe en el recorrido. Editá la aportación original en vez de crear una copia.';
  end if;
  if (select count(*) from public.slam_entries e
      where e.project_id=new.project_id)>=20 then
    raise exception 'Este recorrido ya tiene 20 obras; no se admiten más marcadores';
  end if;
  return new;
end
$function$;

-- slam_private.is_slam_coordinator
CREATE OR REPLACE FUNCTION slam_private.is_slam_coordinator(p_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1 from auth.users u join slam_private.coordinators c
      on c.email=lower(u.email)
    where u.id=p_uid and u.email_confirmed_at is not null and u.is_anonymous=false
  );
$function$;

-- slam_private.slam_keep_original_attribution
CREATE OR REPLACE FUNCTION slam_private.slam_keep_original_attribution()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.project_id is distinct from old.project_id
     or new.user_id is distinct from old.user_id
     or new.source_entry_id is distinct from old.source_entry_id then
    raise exception 'La obra conserva su recorrido, autor e identificador original';
  end if;
  return new;
end;
$function$;

-- public.slam_claim_legacy_project
CREATE OR REPLACE FUNCTION public.slam_claim_legacy_project(p_invite_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid := (select auth.uid());v_project uuid;v_old_owner uuid;
begin
  if v_user is null or not slam_private.is_slam_coordinator(v_user)
    then raise exception 'Solo coordinadores verificados pueden recuperar recorridos'; end if;
  if length(p_invite_token) not between 40 and 180
    then raise exception 'Código de invitación inválido'; end if;
  select p.id,p.created_by into v_project,v_old_owner
    from slam_private.invites i
    join public.slam_projects p on p.id=i.project_id
    where i.token_hash=sha256(convert_to(p_invite_token,'utf8'))
    for update of p;
  if v_project is null then raise exception 'Invitación no encontrada'; end if;
  if v_old_owner=v_user then return v_project; end if;
  if not exists(select 1 from auth.users u
      where u.id=v_old_owner and u.is_anonymous=true)
     then raise exception 'Este recorrido pertenece a otro coordinador'; end if;
  update public.slam_projects set created_by=v_user where id=v_project;
  update public.slam_members set role='contributor'
      where project_id=v_project and user_id=v_old_owner and role='owner';
  insert into public.slam_members(project_id,user_id,role,display_name)
    values(v_project,v_user,'owner','Organizador')
    on conflict(project_id,user_id) do update set role='owner',display_name='Organizador';
  return v_project;
end;
$function$;

-- public.slam_create_preview_link
CREATE OR REPLACE FUNCTION public.slam_create_preview_link(p_entry_id uuid, p_token text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_project uuid;
  v_author uuid;
  v_expires timestamptz := now() + interval '7 days';
begin
  if v_uid is null then raise exception 'Ingresá al recorrido para generar una prueba.'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64,128}$'
    then raise exception 'Código temporal inválido'; end if;

  select e.project_id, e.user_id into v_project, v_author
  from public.slam_entries e where e.id=p_entry_id;

  if v_project is null then raise exception 'Guardá primero la obra en la nube'; end if;

  if v_uid <> v_author and not exists (
    select 1 from public.slam_members m
    where m.project_id=v_project and m.user_id=v_uid and m.role='owner'
  ) then
    raise exception 'No tenés permiso para crear una prueba de esta obra';
  end if;

  insert into slam_private.preview_links(entry_id, token_hash, created_by, expires_at)
  values(p_entry_id,sha256(convert_to(p_token,'utf8')),v_uid,v_expires)
  on conflict(entry_id) do update
  set token_hash=excluded.token_hash,
      created_by=excluded.created_by,
      created_at=now(),
      expires_at=excluded.expires_at;

  return v_expires;
end;
$function$;

-- public.slam_create_project
CREATE OR REPLACE FUNCTION public.slam_create_project(p_title text, p_route_id text, p_invite_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid := (select auth.uid());v_project uuid;
begin
  if v_user is null or not slam_private.is_slam_coordinator(v_user)
    then raise exception 'Solo coordinadores verificados pueden crear recorridos'; end if;
  if length(trim(p_title)) not between 1 and 100
     or p_route_id !~ '^id-[a-z0-9-]{8,60}$'
     or length(p_invite_token) not between 40 and 180
     then raise exception 'Datos de proyecto inválidos'; end if;
  if (select count(*) from public.slam_projects where created_by=v_user)>=5
    then raise exception 'Límite de cinco proyectos por organizador'; end if;
  insert into public.slam_projects(route_id,title,created_by)
    values(p_route_id,trim(p_title),v_user) returning id into v_project;
  insert into slam_private.invites(project_id,token_hash)
    values(v_project,sha256(convert_to(p_invite_token,'utf8')));
  insert into public.slam_members(project_id,user_id,role,display_name)
    values(v_project,v_user,'owner','Organizador');
  return v_project;
end;
$function$;

-- public.slam_is_coordinator
CREATE OR REPLACE FUNCTION public.slam_is_coordinator()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return coalesce(slam_private.is_slam_coordinator((select auth.uid())),false);
end;
$function$;

-- public.slam_join_project
CREATE OR REPLACE FUNCTION public.slam_join_project(p_invite_token text, p_display_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid := (select auth.uid()); v_project uuid; v_state text;
begin
  if v_user is null then raise exception 'Se requiere una sesión anónima'; end if;
  if length(p_invite_token) not between 40 and 180 or length(trim(p_display_name)) not between 1 and 80
  then raise exception 'Invitación o nombre inválidos'; end if;
  select p.id,p.state into v_project,v_state
  from slam_private.invites i join public.slam_projects p on p.id=i.project_id
  where i.token_hash=sha256(convert_to(p_invite_token,'utf8'));
  if v_project is null then raise exception 'No se encontró esta invitación'; end if;
  if v_state<>'draft' then raise exception 'Este recorrido está cerrado a nuevas aportaciones'; end if;
  if (select count(*) from public.slam_members where project_id=v_project)>=21 and
     not exists(select 1 from public.slam_members where project_id=v_project and user_id=v_user)
     then raise exception 'El recorrido ya tiene demasiados participantes'; end if;
  insert into public.slam_members(project_id,user_id,role,display_name)
  values(v_project,v_user,'contributor',trim(p_display_name))
  on conflict(project_id,user_id) do update set
     display_name=case when public.slam_members.role='owner' then public.slam_members.display_name else excluded.display_name end;
  return v_project;
end;
$function$;

-- public.slam_resolve_preview_link
CREATE OR REPLACE FUNCTION public.slam_resolve_preview_link(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64,128}$' then return null; end if;
  select
    p.route_id, p.title as project_title,
    e.id,e.project_id,e.source_entry_id,e.title,e.description,e.model_path,
    e.marker_print_path,e.x_cm,e.y_cm,e.z_cm,e.size_cm,
    e.rotation_deg,e.rotation_vertical_deg,e.animation,
    l.expires_at
  into r
  from slam_private.preview_links l
    join public.slam_entries e on e.id=l.entry_id
    join public.slam_projects p on p.id=e.project_id
  where l.token_hash=sha256(convert_to(p_token,'utf8'))
    and l.expires_at>now();
  if not found then return null; end if;

  return jsonb_build_object(
    'routeId',r.route_id,
    'projectName',r.project_title,
    'entryId',r.id,
    'sourceEntryId',r.source_entry_id,
    'title',r.title,
    'description',r.description,
    'modelPath',r.model_path,
    'printPath',r.marker_print_path,
    'xCm',r.x_cm,'yCm',r.y_cm,'zCm',r.z_cm,'sizeCm',r.size_cm,
    'rotationDeg',r.rotation_deg,
    'verticalRotationDeg',r.rotation_vertical_deg,
    'animation',r.animation,
    'expiresAt',r.expires_at
  );
end;
$function$;

CREATE TRIGGER slam_keep_original_attribution BEFORE UPDATE ON public.slam_entries FOR EACH ROW EXECUTE FUNCTION slam_private.slam_keep_original_attribution();
CREATE TRIGGER slam_limit_contributions BEFORE INSERT ON public.slam_entries FOR EACH ROW EXECUTE FUNCTION slam_private.enforce_entry_limit();

-- Public tables are SELECTed/modified by signed-in members subject to RLS.
alter table public.slam_projects enable row level security;
alter table public.slam_members enable row level security;
alter table public.slam_entries enable row level security;
revoke all on public.slam_projects,public.slam_members,public.slam_entries from anon;
grant select,insert,update,delete on public.slam_projects,public.slam_members,public.slam_entries to authenticated;

create policy "Contributor adds own entry" on "public"."slam_entries" for insert to authenticated with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM slam_members m
  WHERE ((m.project_id = slam_entries.project_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM slam_projects p
  WHERE ((p.id = slam_entries.project_id) AND (p.state = 'draft'::text))))));
create policy "Contributor edits only own entry" on "public"."slam_entries" for update to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM slam_projects p
  WHERE ((p.id = slam_entries.project_id) AND (p.state = 'draft'::text)))))) with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM slam_projects p
  WHERE ((p.id = slam_entries.project_id) AND (p.state = 'draft'::text))))));
create policy "Contributor or owner removes entry" on "public"."slam_entries" for delete to authenticated using ((((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM slam_members m
  WHERE ((m.project_id = slam_entries.project_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'owner'::text))))) AND (EXISTS ( SELECT 1
   FROM slam_projects p
  WHERE ((p.id = slam_entries.project_id) AND (p.state = 'draft'::text))))));
create policy "Members read contributions" on "public"."slam_entries" for select to authenticated using ((EXISTS ( SELECT 1
   FROM slam_members m
  WHERE ((m.project_id = slam_entries.project_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Organizer updates invited contributions" on "public"."slam_entries" for update to authenticated using ((EXISTS ( SELECT 1
   FROM (slam_members m
     JOIN slam_projects p ON ((p.id = m.project_id)))
  WHERE ((m.project_id = slam_entries.project_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'owner'::text) AND (p.state = 'draft'::text))))) with check ((EXISTS ( SELECT 1
   FROM (slam_members m
     JOIN slam_projects p ON ((p.id = m.project_id)))
  WHERE ((m.project_id = slam_entries.project_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'owner'::text) AND (p.state = 'draft'::text)))));
create policy "Members see their own membership" on "public"."slam_members" for select to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Members read project" on "public"."slam_projects" for select to authenticated using ((EXISTS ( SELECT 1
   FROM slam_members m
  WHERE ((m.project_id = slam_projects.id) AND (m.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Owner edits title and lock" on "public"."slam_projects" for update to authenticated using ((created_by = ( SELECT auth.uid() AS uid))) with check ((created_by = ( SELECT auth.uid() AS uid)));
create policy "Contributors delete own media" on "storage"."objects" for delete to authenticated using (((bucket_id = 'slam-colaboraciones'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text)));
create policy "Contributors replace own media" on "storage"."objects" for update to authenticated using (((bucket_id = 'slam-colaboraciones'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM (slam_members m
     JOIN slam_projects p ON ((p.id = m.project_id)))
  WHERE (((m.project_id)::text = (storage.foldername(objects.name))[1]) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (p.state = 'draft'::text)))))) with check (((bucket_id = 'slam-colaboraciones'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (storage.filename(name) = ANY (ARRAY['model.glb'::text, 'art.png'::text, 'print.png'::text, 'pattern.patt'::text]))));
create policy "Contributors upload own private media" on "storage"."objects" for insert to authenticated with check (((bucket_id = 'slam-colaboraciones'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (storage.filename(name) = ANY (ARRAY['model.glb'::text, 'art.png'::text, 'print.png'::text, 'pattern.patt'::text])) AND (EXISTS ( SELECT 1
   FROM (slam_members m
     JOIN slam_projects p ON ((p.id = m.project_id)))
  WHERE (((m.project_id)::text = (storage.foldername(objects.name))[1]) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (p.state = 'draft'::text))))));
create policy "Organizer replaces guest media" on "storage"."objects" for update to authenticated using (((bucket_id = 'slam-colaboraciones'::text) AND (EXISTS ( SELECT 1
   FROM ((slam_entries e
     JOIN slam_members m ON ((m.project_id = e.project_id)))
     JOIN slam_projects p ON ((p.id = e.project_id)))
  WHERE (((e.project_id)::text = (storage.foldername(objects.name))[1]) AND ((e.user_id)::text = (storage.foldername(objects.name))[2]) AND (e.source_entry_id = (storage.foldername(objects.name))[3]) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'owner'::text) AND (p.state = 'draft'::text)))))) with check (((bucket_id = 'slam-colaboraciones'::text) AND (storage.filename(name) = ANY (ARRAY['model.glb'::text, 'art.png'::text, 'print.png'::text, 'pattern.patt'::text])) AND (EXISTS ( SELECT 1
   FROM ((slam_entries e
     JOIN slam_members m ON ((m.project_id = e.project_id)))
     JOIN slam_projects p ON ((p.id = e.project_id)))
  WHERE (((e.project_id)::text = (storage.foldername(objects.name))[1]) AND ((e.user_id)::text = (storage.foldername(objects.name))[2]) AND (e.source_entry_id = (storage.foldername(objects.name))[3]) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'owner'::text) AND (p.state = 'draft'::text))))));
create policy "Organizer uploads revisions of guest media" on "storage"."objects" for insert to authenticated with check (((bucket_id = 'slam-colaboraciones'::text) AND (storage.filename(name) = ANY (ARRAY['model.glb'::text, 'art.png'::text, 'print.png'::text, 'pattern.patt'::text])) AND (EXISTS ( SELECT 1
   FROM ((slam_entries e
     JOIN slam_members m ON ((m.project_id = e.project_id)))
     JOIN slam_projects p ON ((p.id = e.project_id)))
  WHERE (((e.project_id)::text = (storage.foldername(objects.name))[1]) AND ((e.user_id)::text = (storage.foldername(objects.name))[2]) AND (e.source_entry_id = (storage.foldername(objects.name))[3]) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'owner'::text) AND (p.state = 'draft'::text))))));
create policy "Workspace members download media" on "storage"."objects" for select to authenticated using (((bucket_id = 'slam-colaboraciones'::text) AND (EXISTS ( SELECT 1
   FROM slam_members m
  WHERE (((m.project_id)::text = (storage.foldername(objects.name))[1]) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));

-- Public endpoints: deny unauthenticated RPC, except service-only resolver.
revoke all on function slam_private.enforce_entry_limit() from PUBLIC, anon, authenticated;
revoke all on function slam_private.is_slam_coordinator(p_uid uuid) from PUBLIC, anon, authenticated;
revoke all on function slam_private.slam_keep_original_attribution() from PUBLIC, anon, authenticated;
revoke all on function public.slam_claim_legacy_project(p_invite_token text) from PUBLIC, anon, authenticated;
grant execute on function public.slam_claim_legacy_project(p_invite_token text) to authenticated;
revoke all on function public.slam_create_preview_link(p_entry_id uuid, p_token text) from PUBLIC, anon, authenticated;
grant execute on function public.slam_create_preview_link(p_entry_id uuid, p_token text) to authenticated;
revoke all on function public.slam_create_project(p_title text, p_route_id text, p_invite_token text) from PUBLIC, anon, authenticated;
grant execute on function public.slam_create_project(p_title text, p_route_id text, p_invite_token text) to authenticated;
revoke all on function public.slam_is_coordinator() from PUBLIC, anon, authenticated;
grant execute on function public.slam_is_coordinator() to authenticated;
revoke all on function public.slam_join_project(p_invite_token text, p_display_name text) from PUBLIC, anon, authenticated;
grant execute on function public.slam_join_project(p_invite_token text, p_display_name text) to authenticated;
revoke all on function public.slam_resolve_preview_link(p_token text) from PUBLIC, anon, authenticated;
grant execute on function public.slam_resolve_preview_link(p_token text) to service_role;

-- Private uploads and public, versioned publication.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('slam-colaboraciones','slam-colaboraciones',false,20971520,
   array['model/gltf-binary','application/octet-stream','image/png','text/plain']),
  ('slam-publicaciones','slam-publicaciones',true,20971520,
   array['model/gltf-binary','application/octet-stream','image/png','application/json']);

-- Only Edge Functions holding the Supabase secret can write publications.
-- The Storage policies listed above grant writes ONLY to slam-colaboraciones.
commit;