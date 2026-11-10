"""Integração de migrations em PostgreSQL descartável; opt-in e sem apps Java/C#."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(os.environ.get('SONORA_DATABASE_TESTS') == '1', 'Requer PostgreSQL descartável e SONORA_DATABASE_TESTS=1.')
class DatabaseMigrationTests(unittest.TestCase):
    def migrate(self, root=ROOT / 'database', action='migrate'):
        return subprocess.run(['bash', str(root / 'migrate.sh'), action],
                              capture_output=True, text=True, timeout=60)

    def sql(self, query):
        return subprocess.check_output(['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query], text=True).strip()

    def test_a_migrate_twice_preserves_history(self):
        first = self.migrate()
        self.assertEqual(first.returncode, 0, first.stderr)
        count = self.sql('SELECT count(*) FROM sonora_meta.flyway_schema_history WHERE success AND type=\'SQL\'')
        second = self.migrate()
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(count, self.sql('SELECT count(*) FROM sonora_meta.flyway_schema_history WHERE success AND type=\'SQL\''))
        self.assertGreaterEqual(int(count), 1)

    def test_b_namespace_permissions_and_default_grants(self):
        self.assertEqual(self.sql("SELECT has_schema_privilege('sonora_ingest','sonora','USAGE'), "
                                 "has_schema_privilege('sonora_query','sonora','USAGE'), "
                                 "has_schema_privilege('sonora_query','sonora_read','USAGE'), "
                                 "has_schema_privilege('sonora_query','sonora_read','CREATE')"), 't|f|t|f')
        result = self.sql("BEGIN; CREATE TABLE sonora.permission_probe (id integer); "
                          "CREATE VIEW sonora_read.permission_probe AS SELECT id FROM sonora.permission_probe; "
                          "SELECT has_table_privilege('sonora_ingest','sonora.permission_probe','INSERT'), "
                          "has_table_privilege('sonora_query','sonora.permission_probe','SELECT'), "
                          "has_table_privilege('sonora_query','sonora_read.permission_probe','SELECT'), "
                          "has_table_privilege('sonora_query','sonora_read.permission_probe','INSERT'); ROLLBACK;")
        self.assertIn('t|f|t|f', result)
        self.assertEqual(self.sql("SELECT to_regclass('sonora.permission_probe') IS NULL"), 't')

    def test_c_modified_applied_migration_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            module = Path(folder) / 'database'
            shutil.copytree(ROOT / 'database', module)
            migration = module / 'migrations/V1__create_namespaces.sql'
            with migration.open('a') as output:
                output.write('\n-- checksum test only\n')
            result = self.migrate(module, 'validate')
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('checksum', (result.stdout + result.stderr).lower())

    def test_d_failed_sql_transaction_leaves_no_partial_table(self):
        with tempfile.TemporaryDirectory() as folder:
            module = Path(folder) / 'database'
            shutil.copytree(ROOT / 'database', module)
            (module / 'migrations/V999999__controlled_failure.sql').write_text(
                'CREATE TABLE sonora.must_rollback(id integer); SELECT 1/0;\n')
            result = self.migrate(module)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(self.sql("SELECT to_regclass('sonora.must_rollback') IS NULL"), 't')
            self.assertEqual(self.sql("SELECT count(*) FROM sonora_meta.flyway_schema_history WHERE version='999999'"), '0')

    def test_e_dangerous_commands_are_not_exposed(self):
        for action in ('clean', 'repair', 'baseline'):
            with self.subTest(action=action):
                result = self.migrate(action=action)
                self.assertEqual(result.returncode, 2)


if __name__ == '__main__':
    unittest.main()
