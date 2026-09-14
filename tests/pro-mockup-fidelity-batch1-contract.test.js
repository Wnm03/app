const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'pro-ui-layer.css'),'utf8');
test('Pro Dark mockup batch1 keeps vehicle presentation additive and wired to existing contracts',()=>{
  assert.match(html,/class="page pro-vehicle-page" id="page-carnotes"/);
  assert.match(html,/class="pro-vehicle-hero"/);
  assert.match(html,/class="[^"]*pro-odometer-card[^"]*"/);
  assert.match(html,/class="cn-tabs pro-primary-tabs"/);
  assert.match(html,/id="cnTab-servis" class="u-dnone pro-servis-screen"/);
  assert.match(html,/class="[^"]*pro-reminder-card[^"]*" id="servisReminderCard"/);
  assert.match(html,/bbm-stat-grid pro-service-stats/);
  assert.match(html,/class="card pro-history-card"/);
  assert.match(css,/\[data-theme="pro"\] \.pro-vehicle-page/);
  assert.match(css,/\.pro-primary-tabs/);
  assert.match(css,/\.pro-service-stats/);
  assert.match(css,/prefers-reduced-motion/);
});

test('Pro Dark mockup layer contains no script/import dependency',()=>{
  assert.doesNotMatch(css,/(@import|<script|url\()/i);
});
