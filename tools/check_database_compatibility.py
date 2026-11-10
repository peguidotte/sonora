"""Compara contratos HTTP/SQL com o catálogo real do PostgreSQL; não analisa DTOs."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
IDENTIFIER = re.compile(r'^[a-z_][a-z0-9_]*$')


def load_contracts(directory):
    database = json.loads((directory / 'database.json').read_text(encoding='utf-8'))
    documents = {s: json.loads((directory / 'openapi' / f'{s}.openapi.json').read_text(encoding='utf-8'))
                 for s in ('soa', 'csharp')}
    return database, documents


def baseline_contracts(ref):
    sha = subprocess.check_output(['git', 'rev-parse', '--verify', '--end-of-options', ref + '^{commit}'],
                                  cwd=ROOT, text=True, stderr=subprocess.PIPE).strip()
    if not re.fullmatch(r'[0-9a-f]{40,64}', sha):
        raise ValueError('Invalid baseline commit.')
    def read(name):
        return json.loads(subprocess.check_output(['git', 'show', f'{sha}:contracts/{name}'],
                          cwd=ROOT, text=True, encoding='utf-8', stderr=subprocess.PIPE))
    return read('database.json'), {s: read(f'openapi/{s}.openapi.json') for s in ('soa', 'csharp')}


def migration_history_errors(ref):
    sha = subprocess.check_output(['git', 'rev-parse', '--verify', '--end-of-options', ref + '^{commit}'],
                                  cwd=ROOT, text=True, stderr=subprocess.PIPE).strip()
    if not re.fullmatch(r'[0-9a-f]{40,64}', sha):
        raise ValueError('Invalid baseline commit.')
    names = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', sha, '--', 'database/migrations'],
                                    cwd=ROOT, text=True, stderr=subprocess.PIPE).splitlines()
    previous = {name: subprocess.check_output(['git', 'show', f'{sha}:{name}'], cwd=ROOT, stderr=subprocess.PIPE)
                for name in names if Path(name).name.startswith('V') and name.endswith('.sql')}
    return compare_migration_files(previous, ROOT)


def compare_migration_files(previous, root):
    errors = []
    for name, content in previous.items():
        path = (root / name).resolve()
        if not path.is_relative_to(root.resolve()):
            raise ValueError('Migration path leaves checkout.')
        if not path.is_file() or path.read_bytes().replace(b'\r\n', b'\n') != content.replace(b'\r\n', b'\n'):
            errors.append('Published migration changed/removed: ' + name + '; add a new version instead.')
    return errors


def inspect_database(schemas):
    if os.environ.get('PGUSER') != 'sonora_migrator':
        raise ValueError('Inspection requires sonora_migrator to avoid mistaking hidden columns for absent objects.')
    if not schemas or not all(IDENTIFIER.fullmatch(s) for s in schemas):
        raise ValueError('Unsafe schema identifier.')
    names = ','.join("'" + s + "'" for s in sorted(set(schemas)))
    query = f"""
SELECT coalesce(json_agg(json_build_object(
 'schema',n.nspname,'relation',c.relname,'kind',c.relkind,'column',a.attname,
 'type',t.typname,'typeKind',t.typtype,'maxLength',i.character_maximum_length,
 'notNull',a.attnotnull,'hasDefault',(a.atthasdef OR a.attidentity<>'' OR a.attgenerated<>''),
 'enumValues',(SELECT json_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid=t.oid)
) ORDER BY n.nspname,c.relname,a.attnum),'[]')
FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_type t ON t.oid=a.atttypid
JOIN information_schema.columns i ON i.table_schema=n.nspname AND i.table_name=c.relname AND i.column_name=a.attname
WHERE n.nspname IN ({names}) AND c.relkind IN ('r','p','v','m') AND a.attnum>0 AND NOT a.attisdropped;
"""
    env = os.environ | {'PGOPTIONS': '-c default_transaction_read_only=on -c statement_timeout=5000'}
    result = subprocess.run(['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query],
                            capture_output=True, text=True, env=env, timeout=15)
    if result.returncode:
        raise ValueError('Cannot inspect PostgreSQL. Check PG* settings/permissions; no connection details emitted.')
    relations = {}
    for column in json.loads(result.stdout):
        relations.setdefault((column['schema'], column['relation']), {})[column['column']] = column
    return relations


def types(schema):
    value = schema.get('type')
    return set(value if isinstance(value, list) else [value])


def effective_max_length(schema):
    if 'enum' in schema:
        values = [v for v in schema['enum'] if isinstance(v, str)]
        if values:
            return max(map(len, values))
    return schema.get('maxLength', 36 if schema.get('format') == 'uuid' else None)


def field_errors(schema, column, direction):
    """Compatibilidade direcional: entradas cabem no banco; saídas cabem no HTTP."""
    errors = []
    typ = column['type']
    accepted = types(schema) - {'null'}
    string_types = {'text', 'varchar'}
    formats = {'uuid': 'uuid', 'date': 'date', 'timestamptz': 'date-time'}
    if column.get('typeKind') == 'd':
        return ['PostgreSQL domain constraints are not supported; add explicit validation before adopting this type.']
    if column.get('enumValues') is not None:
        values = set(column['enumValues'])
        api_values = schema.get('enum')
        if accepted != {'string'} or (direction == 'write' and (api_values is None or not set(api_values) <= values)):
            errors.append('API values are not guaranteed to fit the PostgreSQL enum.')
        if direction == 'read' and api_values is not None and not values <= set(api_values):
            errors.append('PostgreSQL enum can produce values outside the API enum.')
    elif typ in string_types:
        if accepted != {'string'}:
            errors.append(f'API type {sorted(accepted)} is incompatible with SQL {typ}.')
        api_max = effective_max_length(schema) if direction == 'write' else schema.get('maxLength')
        db_max = column.get('maxLength')
        if direction == 'write' and db_max is not None and (api_max is None or api_max > db_max):
            errors.append(f'API maxLength={api_max if api_max is not None else "unbounded"} exceeds SQL maxLength={db_max}.')
        if direction == 'read' and api_max is not None and (db_max is None or db_max > api_max):
            errors.append(f'SQL maxLength={db_max if db_max is not None else "unbounded"} can exceed API maxLength={api_max}.')
    elif typ in formats:
        if accepted != {'string'} or schema.get('format') != formats[typ]:
            errors.append(f'SQL {typ} requires API string/format={formats[typ]}.')
    elif typ == 'bool':
        if accepted != {'boolean'}:
            errors.append('SQL boolean requires API boolean.')
    elif typ == 'float8':
        if accepted != {'number'}:
            errors.append('SQL double precision requires API number.')
    elif typ in ('int2', 'int4', 'int8'):
        if accepted != {'integer'}:
            errors.append(f'SQL {typ} cannot preserve arbitrary API numbers.')
        if direction == 'write':
            bits = {'int2': 16, 'int4': 32, 'int8': 64}[typ]
            low, high = -(2 ** (bits - 1)), 2 ** (bits - 1) - 1
            if schema.get('minimum', float('-inf')) < low or schema.get('maximum', float('inf')) > high:
                errors.append(f'API integer range exceeds SQL {typ}.')
    elif typ in ('json', 'jsonb'):
        if not accepted <= {'object', 'array'}:
            errors.append('JSON document SQL column requires API object/array; scalar extraction needs an explicit mapping.')
    else:
        errors.append(f'SQL type {typ} is not supported by this checker; compatibility was not verified.')
    if direction == 'write' and 'null' in types(schema) and column.get('notNull'):
        errors.append('API accepts null but SQL is NOT NULL (defaults do not replace explicit null).')
    return errors


def validate(database, documents, relations, allow_unimplemented=False, fallback_writes=None):
    errors, pending, checked = [], [], 0
    writes = database.get('writeModels', fallback_writes or {})
    mapped_requests = set()
    def relation(schema, name, kind, label):
        columns = relations.get((schema, name))
        if columns is None:
            (pending if allow_unimplemented else errors).append(label + ': SQL relation not implemented.')
        elif any(c['kind'] not in kind for c in columns.values()):
            errors.append(label + ': expected SQL ' + ('table' if kind == {'r', 'p'} else 'view') + '.')
        return columns
    for name, model in writes.items():
        service = model['service']
        definitions = documents[service]['components']['schemas']
        if model['requestSchema'] not in definitions:
            continue  # A new request may not exist in the previous published contract.
        request = definitions[model['requestSchema']]
        mapped_requests.add((service, model['requestSchema']))
        fields = model['fields']
        if set(fields) != set(request['properties']):
            errors.append(name + ': every request property must have an explicit SQL mapping; missing/obsolete fields=' +
                          ','.join(sorted(set(fields) ^ set(request['properties']))))
        table = relation(database['storageSchema'], model['table'], {'r', 'p'}, name)
        if table is None:
            continue
        for field, target in fields.items():
            if field not in request['properties']:
                continue
            if target not in table:
                errors.append(f'{name}.{field}: missing SQL column {target}.')
                continue
            column = table[target]
            checked += 1
            errors += [f'{name}.{field} -> {target}: {e}' for e in field_errors(request['properties'][field], column, 'write')]
            if field not in request.get('required', []) and column['notNull'] and not column['hasDefault']:
                errors.append(f'{name}.{field}: optional API field maps to NOT NULL SQL without a default.')
        provided = set(fields.values()) | set(model.get('serverProvidedColumns', []))
        for column in table.values():
            if column['notNull'] and not column['hasDefault'] and column['column'] not in provided:
                errors.append(f'{name}: required SQL column {column["column"]} has no request/default/server mapping.')
    for service, doc in documents.items():
        for operations in doc['paths'].values():
            for operation in operations.values():
                if 'requestBody' in operation:
                    ref = operation['requestBody']['content']['application/json']['schema'].get('$ref', '')
                    if (service, ref.split('/')[-1]) not in mapped_requests:
                        errors.append(service + ': request has no SQL write mapping: ' + ref)
    for name, model in database['readViews'].items():
        view = relation(database['readSchema'], name, {'v', 'm'}, 'read.' + name)
        if view is None:
            continue
        response = documents['csharp']['components']['schemas'][model['responseSchema']]
        for spec in model['columns']:
            target, field = spec['name'], spec['jsonField']
            if target not in view:
                errors.append(f'read.{name}: missing SQL column {target}.')
                continue
            checked += 1
            expected_types = {'text': {'text', 'varchar'}, 'uuid': {'uuid'}, 'boolean': {'bool'},
                              'date': {'date'}, 'timestamptz': {'timestamptz'},
                              'double precision': {'float8'}, 'jsonb': {'jsonb'}}
            if view[target]['type'] not in expected_types.get(spec['postgresType'], set()):
                errors.append(f'read.{name}.{target}: actual SQL type does not match database.json {spec["postgresType"]}.')
            if 'payloadSchema' in model:
                continue
            if field not in response['properties']:
                errors.append(f'read.{name}.{field}: missing API property.')
                continue
            prop = response['properties'][field]
            errors += [f'read.{name}.{field}: {e}' for e in field_errors(prop, view[target], 'read')]
            if spec['nullable'] and 'null' not in types(prop):
                if not spec.get('omitWhenNull') or field in response.get('required', []):
                    errors.append(f'read.{name}.{field}: SQL contract allows null but API cannot represent/omit it.')
        allowed = {c['name'] for c in model['columns']}
        if set(view) - allowed:
            errors.append('read.' + name + ': undeclared SQL columns exposed: ' + ','.join(sorted(set(view) - allowed)))
    return {'errors': errors, 'pending': pending, 'checkedFields': checked}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-unimplemented', action='store_true', help='Only for the bootstrap stage with no application projects.')
    parser.add_argument('--baseline-ref', help='Also preserve the previous/main published contracts.')
    args = parser.parse_args()
    try:
        database, docs = load_contracts(ROOT / 'contracts')
        checks = [('current', database, docs)]
        history_errors = []
        if args.baseline_ref:
            old_database, old_docs = baseline_contracts(args.baseline_ref)
            checks.append(('baseline', old_database, old_docs))
            history_errors = migration_history_errors(args.baseline_ref)
        schemas = [d[k] for _, d, _ in checks for k in ('storageSchema', 'readSchema')]
        relations = inspect_database(schemas)
        failed = False
        for label, db, documents in checks:
            result = validate(db, documents, relations, args.allow_unimplemented, database['writeModels'])
            if label == 'current':
                result['errors'] += history_errors
            failed |= bool(result['errors'])
            print(json.dumps({'contract': label, **result}, ensure_ascii=False))
        print('Scope: OpenAPI/SQL declarations and live catalog; CHECK expressions, data transforms, view nullability and DTO/HTTP enforcement require application tests.')
        return int(failed)
    except (ValueError, KeyError, OSError, subprocess.SubprocessError) as error:
        # No raw psql errors, credentials, command args or database values.
        print('ERROR compatibility check could not complete: ' + type(error).__name__, file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
