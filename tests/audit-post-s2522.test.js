const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const SRC = fs.readFileSync('modules/shared/modals.js', 'utf8');

const migrated = {
  input: [
    'calcGaji','Payroll.onJenisHariChange','PriceReko.calc','OngkirCalc.calc',
    'onCustomerInputChange','renderOrderItems','EduFund.updatePreview',
    'Renov.syncHargaTotalPreview','RenovCalc.calcMaterial','Tukang.calcSharedBorongan'
  ],
  change: [
    'Payroll.onJenisHariChange','onPProdusenChange','renderOrderItems',
    'toggleOrderDeliveredField','onTargetDanaDaruratToggle','onTargetAccChange',
    'EduFund.updatePreview','toggleBillSharedFields','updateBillSubCatOptions',
    'SewaKios.onStatusChange'
  ]
};

for (const [event, names] of Object.entries(migrated)) {
  for (const name of names) {
    test(`S2522 CSP: ${event} ${name} uses data-${event} without inline handler`, () => {
      assert.ok(SRC.includes(`data-on${event}=\\"${name}\\"`));
      assert.ok(!SRC.includes(`on${event}=\\"${name}()\\"`));
    });
  }
}

// Regression guard: the generic dispatcher must support the data-* event family
// used by this migration; it already resolves $el/$event/$value/$checked.
const dispatcher = fs.readFileSync('modules/shared/features-helpers-global-security.js', 'utf8');
test('S2522 CSP: dispatcher still listens for input/change events', () => {
  assert.match(dispatcher, /document\.addEventListener\('input', _dataActionInputChangeHandler, true\)/);
  assert.match(dispatcher, /document\.addEventListener\('change', _dataActionInputChangeHandler, true\)/);
});
