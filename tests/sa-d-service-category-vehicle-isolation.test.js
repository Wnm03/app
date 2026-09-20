const test = require('node:test');
const assert = require('node:assert/strict');

function resolveLinkedCategory({ logs, cats, service, vehicleId }) {
  const preferred = service.categoryId && cats.find(c => c && c.id === service.categoryId && (!c.vehicleId || c.vehicleId === vehicleId));
  return preferred || cats.find(c => !c.vehicleId && c.name.toLowerCase() === String(service.item || '').toLowerCase()) || null;
}

test('categoryId khusus kendaraan lain tidak boleh dipakai', () => {
  const cats = [
    { id: 'cat-a', name: 'Oli', vehicleId: 'vehicle-a' },
    { id: 'cat-b', name: 'Oli', vehicleId: 'vehicle-b' },
  ];
  const resolved = resolveLinkedCategory({ cats, service: { categoryId: 'cat-a', item: 'Oli' }, vehicleId: 'vehicle-b' });
  assert.equal(resolved, null);
});

test('kategori global tetap dapat dipakai lintas kendaraan', () => {
  const global = { id: 'cat-global', name: 'Oli' };
  const resolved = resolveLinkedCategory({ cats: [global], service: { categoryId: 'cat-global', item: 'Oli' }, vehicleId: 'vehicle-b' });
  assert.equal(resolved.id, 'cat-global');
});
