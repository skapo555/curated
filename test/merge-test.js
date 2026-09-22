/* Merge rule tests. Run by opening /test/ in the browser (see index.html). */
import * as S from '../js/store.js';

const results = [];
const eq = (name, got, want) => results.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want });

function reset(initial = {}) {
  localStorage.removeItem('curated.state.v1');
  localStorage.setItem('curated.state.v2', JSON.stringify({
    progress: {}, opened: {}, completed: {}, saved: {}, feedback: {}, notes: {},
    followed: {}, settings: { archiveDays: 7, completion: 'auto', theme: 'system', textSize: 'm' },
    liveSynced: true, at: { items: {}, followed: {}, notes: {}, settings: {} }, syncedAt: 0,
    ...initial,
  }));
  location.reload();
}

export function run() {
  const s = S.getState();

  // --- 1. A stale device must never rewind progress
  s.progress['a'] = 0.8; s.at.items['a'] = { progress: 5000 };
  S.mergeRemote({ items: [{ item_id: 'a', progress: 0.2, at: { progress: 9000 } }] });
  eq('stale device cannot rewind progress (newer but lower)', S.getState().progress['a'], 0.8);

  // --- 2. Further progress from elsewhere is adopted
  S.mergeRemote({ items: [{ item_id: 'a', progress: 0.95, at: { progress: 9500 } }] });
  eq('further progress is adopted', S.getState().progress['a'], 0.95);

  // --- 3. Completion is sticky
  s.completed['b'] = 1000; s.at.items['b'] = { completed: 1000 };
  S.mergeRemote({ items: [{ item_id: 'b', completed_at: null, at: { completed: 9999 } }] });
  eq('completion is sticky', !!S.getState().completed['b'], true);

  // --- 4. Completing elsewhere arrives, and pins progress to 1
  S.mergeRemote({ items: [{ item_id: 'c', completed_at: 4242, progress: 1, at: { completed: 8000, progress: 8000 } }] });
  eq('remote completion arrives', S.getState().completed['c'], 4242);
  eq('remote completion sets progress to 1', S.getState().progress['c'], 1);

  // --- 5. Unsaving on a newer device wins
  s.saved['d'] = 100; s.at.items['d'] = { saved: 100 };
  S.mergeRemote({ items: [{ item_id: 'd', saved_at: null, at: { saved: 500 } }] });
  eq('newer unsave wins', S.getState().saved['d'], undefined);

  // --- 6. An older unsave loses
  s.saved['e'] = 900; s.at.items['e'] = { saved: 900 };
  S.mergeRemote({ items: [{ item_id: 'e', saved_at: null, at: { saved: 100 } }] });
  eq('older unsave loses', S.getState().saved['e'], 900);

  // --- 7. Notes: newer wins
  s.notes['f'] = 'mine'; s.at.notes['f'] = 100; s.syncedAt = 200;
  S.mergeRemote({ notes: [{ item_id: 'f', body: 'theirs', at: 300 }] });
  eq('newer note wins', S.getState().notes['f'], 'theirs');

  // --- 8. Notes: a genuine conflict keeps both
  s.syncedAt = 1000; s.notes['g'] = 'written on phone'; s.at.notes['g'] = 2000;
  const c = S.mergeRemote({ notes: [{ item_id: 'g', body: 'written on ipad', at: 1500 }] });
  eq('conflicting note is preserved, not dropped', S.getState().notes['g'].includes('written on ipad') && S.getState().notes['g'].includes('written on phone'), true);
  eq('conflict is counted', c.conflicts, 1);

  // --- 9. An older note does not overwrite, and does not falsely conflict
  s.syncedAt = 5000; s.notes['h'] = 'current'; s.at.notes['h'] = 6000;
  const c2 = S.mergeRemote({ notes: [{ item_id: 'h', body: 'ancient', at: 1000 }] });
  eq('older note is ignored', S.getState().notes['h'], 'current');
  eq('no false conflict for an old note', c2.conflicts, 0);

  // --- 10. Follows and settings: newest wins
  s.followed['x'] = true; s.at.followed['x'] = 100;
  S.mergeRemote({ follows: [{ source_id: 'x', followed: false, at: 900 }] });
  eq('newer unfollow wins', S.getState().followed['x'], false);
  s.at.settings['archiveDays'] = 100;
  S.mergeRemote({ settings: { archiveDays: 30 }, settingsAt: { archiveDays: 900 } });
  eq('newer setting wins', S.getState().settings.archiveDays, 30);
  S.mergeRemote({ settings: { archiveDays: 3 }, settingsAt: { archiveDays: 400 } });
  eq('older setting loses', S.getState().settings.archiveDays, 30);

  // --- 11. pending() only reports changes since the last sync
  s.syncedAt = 10000;
  s.progress['z'] = 0.5; s.at.items['z'] = { progress: 10001 };
  s.progress['y'] = 0.5; s.at.items['y'] = { progress: 9999 };
  const p = S.pending(10000);
  eq('pending includes the new change', p.items.map(i => i.item_id).includes('z'), true);
  eq('pending excludes the already-synced change', p.items.map(i => i.item_id).includes('y'), false);

  return results;
}
window.__reset = reset;
