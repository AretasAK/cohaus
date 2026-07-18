-- Permite elegir un icono simple para el grupo (alternativa a subir una foto de portada)
alter table groups add column if not exists icon text;
