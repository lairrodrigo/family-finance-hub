-- Repair category labels that were stored after UTF-8 text was decoded as Latin-1.
create or replace function pg_temp.fix_latin1_mojibake(value text)
returns text
language plpgsql
as $$
begin
  return convert_from(convert_to(value, 'LATIN1'), 'UTF8');
exception
  when others then
    return value;
end;
$$;

update public.categories
set name = pg_temp.fix_latin1_mojibake(name)
where name like U&'%\00C3%'
   or name like U&'%\00C2%';

update public.subcategories
set name = pg_temp.fix_latin1_mojibake(name)
where name like U&'%\00C3%'
   or name like U&'%\00C2%';
