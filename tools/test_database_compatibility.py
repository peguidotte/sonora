"""Regressões de limites/direção e inspeção real de PostgreSQL, sem analisar SQL por regex."""
from contextlib import redirect_stdout
import io
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import uuid

import check_database_compatibility as checker
from check_database_compatibility import field_errors, inspect_database, validate


def column(limit=None, typ='varchar', name='name', **overrides):
    return {'column': name, 'type': typ, 'maxLength': limit, 'notNull': True,
            'hasDefault': False, 'kind': 'r', 'typeKind': 'b', 'enumValues': None, **overrides}


def contracts(limit=200, schema='sonora'):
    request = {'type': 'object', 'properties': {'name': {'type': 'string', 'maxLength': limit}}, 'required': ['name']}
    docs = {
        'soa': {'components': {'schemas': {'Request': request}}, 'paths': {'/items': {
            'post': {'requestBody': {'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Request'}}}}}}}},
        'csharp': {'components': {'schemas': {'Response': {'type': 'object', 'properties': {'name': {'type': 'string'}}, 'required': ['name']}}}, 'paths': {}}}
    database = {'storageSchema': schema, 'readSchema': schema, 'readViews': {}, 'writeModels': {
        'item': {'service': 'soa', 'requestSchema': 'Request', 'table': 'items',
                 'fields': {'name': 'name'}, 'serverProvidedColumns': ['id']}}}
    return database, docs


class CompatibilityTests(unittest.TestCase):
    def test_published_migration_cannot_be_edited_or_removed(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            path = root / 'V1__test.sql'
            path.write_bytes(b'SELECT 1;\n')
            previous = {'V1__test.sql': b'SELECT 1;\n'}
            self.assertEqual(checker.compare_migration_files(previous, root), [])
            (root / 'V2__new.sql').write_bytes(b'SELECT 2;\n')
            self.assertEqual(checker.compare_migration_files(previous, root), [])
            path.write_bytes(b'SELECT 3;\n')
            self.assertTrue(checker.compare_migration_files(previous, root))
            path.unlink()
            self.assertTrue(checker.compare_migration_files(previous, root))

    def test_cli_failure_exit_code_blocks_ci(self):
        db, docs = contracts(200)
        with patch.object(checker, 'load_contracts', return_value=(db, docs)), \
             patch.object(checker, 'inspect_database', return_value={('sonora', 'items'): {'name': column(100)}}), \
             patch('sys.argv', ['check_database_compatibility.py']), redirect_stdout(io.StringIO()) as output:
            self.assertEqual(checker.main(), 1)
        self.assertIn('maxLength=200', output.getvalue())

    def test_api_200_does_not_fit_sql_100(self):
        errors = field_errors({'type': 'string', 'maxLength': 200}, column(100), 'write')
        self.assertTrue(any('200' in e and '100' in e for e in errors))

    def test_unbounded_api_does_not_fit_bounded_sql(self):
        self.assertTrue(field_errors({'type': 'string'}, column(100), 'write'))

    def test_wider_database_accepts_smaller_api_inputs(self):
        self.assertEqual(field_errors({'type': 'string', 'maxLength': 100}, column(200), 'write'), [])
        self.assertEqual(field_errors({'type': 'string'}, column(typ='text'), 'write'), [])

    def test_response_capacity_has_the_opposite_direction(self):
        self.assertTrue(field_errors({'type': 'string', 'maxLength': 100}, column(200), 'read'))
        self.assertEqual(field_errors({'type': 'string', 'maxLength': 200}, column(100), 'read'), [])

    def test_explicit_null_cannot_use_a_not_null_default(self):
        self.assertTrue(field_errors({'type': ['string', 'null']}, column(100, hasDefault=True), 'write'))

    def test_optional_field_needs_nullable_column_or_default(self):
        db, docs = contracts()
        docs['soa']['components']['schemas']['Request']['required'] = []
        self.assertTrue(validate(db, docs, {('sonora', 'items'): {'name': column(200)}})['errors'])
        self.assertFalse(validate(db, docs, {('sonora', 'items'): {'name': column(200, hasDefault=True)}})['errors'])

    def test_unmapped_required_sql_column_blocks_writes(self):
        db, docs = contracts()
        result = validate(db, docs, {('sonora', 'items'): {'name': column(200), 'new_required': column(name='new_required')}})
        self.assertTrue(any('new_required' in e for e in result['errors']))

    def test_new_api_property_cannot_silently_escape_mapping(self):
        db, docs = contracts()
        docs['soa']['components']['schemas']['Request']['properties']['newField'] = {'type': 'string'}
        result = validate(db, docs, {}, allow_unimplemented=True)
        self.assertTrue(result['errors'])
        self.assertTrue(result['pending'])

    def test_changing_api_and_sql_together_still_breaks_old_contract(self):
        db, current = contracts(100)
        _, previous = contracts(200)
        relations = {('sonora', 'items'): {'name': column(100)}}
        self.assertFalse(validate(db, current, relations)['errors'])
        self.assertTrue(validate(db, previous, relations)['errors'])

    def test_missing_table_is_error_except_explicit_bootstrap_mode(self):
        db, docs = contracts()
        self.assertTrue(validate(db, docs, {})['errors'])
        result = validate(db, docs, {}, allow_unimplemented=True)
        self.assertFalse(result['errors'])
        self.assertEqual(result['checkedFields'], 0)
        self.assertEqual(len(result['pending']), 1)

    def test_wrong_type_and_integer_range_fail(self):
        self.assertTrue(field_errors({'type': 'number'}, column(typ='int4'), 'write'))
        self.assertTrue(field_errors({'type': 'integer', 'minimum': 0, 'maximum': 100000}, column(typ='int2'), 'write'))
        self.assertTrue(field_errors({'type': 'string'}, column(typ='uuid'), 'write'))

    def test_enum_directions_are_checked(self):
        enum = column(typ='status', typeKind='e', enumValues=['a', 'b'])
        self.assertFalse(field_errors({'type': 'string', 'enum': ['a']}, enum, 'write'))
        self.assertTrue(field_errors({'type': 'string', 'enum': ['a', 'c']}, enum, 'write'))
        self.assertTrue(field_errors({'type': 'string', 'enum': ['a']}, enum, 'read'))


@unittest.skipUnless(os.environ.get('SONORA_DATABASE_TESTS') == '1', 'Requer PostgreSQL descartável e SONORA_DATABASE_TESTS=1.')
class LiveCompatibilityTests(unittest.TestCase):
    def sql(self, query):
        subprocess.run(['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-q', '-c', query],
                       check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)

    def setUp(self):
        self.schema = 'compat_' + uuid.uuid4().hex
        self.sql(f'CREATE SCHEMA {self.schema}; CREATE TABLE {self.schema}.items(name varchar(200) NOT NULL);')
        self.db, self.docs = contracts(schema=self.schema)

    def tearDown(self):
        self.sql(f'DROP SCHEMA {self.schema} CASCADE;')

    def test_real_catalog_detects_shrinking_column_to_100(self):
        self.assertFalse(validate(self.db, self.docs, inspect_database([self.schema]))['errors'])
        self.sql(f'ALTER TABLE {self.schema}.items ALTER COLUMN name TYPE varchar(100);')
        result = validate(self.db, self.docs, inspect_database([self.schema]))
        self.assertTrue(any('maxLength=200' in e and 'maxLength=100' in e for e in result['errors']))
        del self.docs['soa']['components']['schemas']['Request']['properties']['name']['maxLength']
        result = validate(self.db, self.docs, inspect_database([self.schema]))
        self.assertTrue(any('unbounded' in e for e in result['errors']))

    def test_real_catalog_detects_new_not_null_column(self):
        self.sql(f'ALTER TABLE {self.schema}.items ADD COLUMN unprovided text NOT NULL;')
        result = validate(self.db, self.docs, inspect_database([self.schema]))
        self.assertTrue(any('unprovided' in e for e in result['errors']))

    def test_real_catalog_detects_view_column_rename(self):
        self.sql(f'CREATE VIEW {self.schema}.item_view AS SELECT name FROM {self.schema}.items;')
        self.db['readViews']['item_view'] = {'responseSchema': 'Response', 'columns': [
            {'name': 'name', 'jsonField': 'name', 'postgresType': 'text', 'nullable': False}]}
        self.assertFalse(validate(self.db, self.docs, inspect_database([self.schema]))['errors'])
        self.sql(f'DROP VIEW {self.schema}.item_view; CREATE VIEW {self.schema}.item_view AS SELECT name AS renamed FROM {self.schema}.items;')
        result = validate(self.db, self.docs, inspect_database([self.schema]))
        self.assertTrue(any('missing SQL column name' in e for e in result['errors']))
        self.assertTrue(any('undeclared SQL columns' in e for e in result['errors']))


if __name__ == '__main__':
    unittest.main()
