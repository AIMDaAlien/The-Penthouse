import { sql } from 'drizzle-orm';
import { db } from './services/api/src/db';

const testPatterns = [
  'reg_%', 'dir_%', 'login_%', 'dup_%', 'badpw_%', 'searchme_%',
  'paginate_%', 'profile_%', 'prof_%', 'selfprofile_%', 'dm_from_%',
  'gif_%', 'poll_%', 'newdm_%', 'esc_dm_%', 'conn_%', 'editname_%',
  'chat_%', 'pending_%', 'short_%', 'mismatch_%', 'sess_%', 'logout_%',
  'settings_%', 'slowdown_%'
];

async function cleanup() {
  console.log('🗑️ Cleaning up test/burner accounts...\n');

  for (const pattern of testPatterns) {
    const result = await db.execute(
      sql`DELETE FROM users WHERE username LIKE ${pattern}`
    );
    const count = result.rowCount || 0;
    if (count > 0) console.log(`  ✓ Deleted ${count} account(s) matching "${pattern}"`);
  }

  console.log('\n✅ Cleanup complete');
  process.exit(0);
}

cleanup().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
