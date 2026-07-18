-- Añade portada y descripción editables por cualquier miembro del grupo
alter table groups add column if not exists description text;
alter table groups add column if not exists cover_url text;

-- Bucket de almacenamiento para las fotos de portada (público, lectura abierta)
insert into storage.buckets (id, name, public)
values ('group-covers', 'group-covers', true)
on conflict (id) do nothing;

-- Cualquier miembro del grupo puede subir/actualizar/borrar la portada de SU grupo.
-- La ruta esperada es "<group_id>/cover.jpg", así que comprobamos que el primer
-- segmento de la ruta sea un group_id del que el usuario es miembro.
create policy "group_covers_select_public"
  on storage.objects for select
  using (bucket_id = 'group-covers');

create policy "group_covers_insert_members"
  on storage.objects for insert
  with check (
    bucket_id = 'group-covers'
    and is_group_member(((storage.foldername(name))[1])::uuid)
  );

create policy "group_covers_update_members"
  on storage.objects for update
  using (
    bucket_id = 'group-covers'
    and is_group_member(((storage.foldername(name))[1])::uuid)
  );

create policy "group_covers_delete_members"
  on storage.objects for delete
  using (
    bucket_id = 'group-covers'
    and is_group_member(((storage.foldername(name))[1])::uuid)
  );
