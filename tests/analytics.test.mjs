import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function run({saved=null, privacy=false}={}) {
  const calls=[], scripts=[], handlers={};
  const button={focus(){}};
  const panel={hidden:false,setAttribute(){},querySelector(){return button;},addEventListener(name,fn){handlers.choice=fn;}};
  const storage=new Map(saved ? [['mas-analytics-consent-v1', JSON.stringify(saved)]] : []);
  const ph={init(...args){calls.push(['init',...args]);},capture(...args){calls.push(['capture',...args]);},opt_in_capturing(){calls.push(['optin']);},opt_out_capturing(){calls.push(['optout']);}};
  const context={POSTHOG_TOKEN:'phc_test',POSTHOG_HOST:'https://eu.i.posthog.com',posthog:ph,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    navigator:{globalPrivacyControl:privacy},location:{origin:'https://example.test',pathname:'/products/vaultic/',reload(){calls.push(['reload']);}},
    document:{createElement:tag=>tag==='section'?panel:{},body:{append(){}},head:{append:s=>scripts.push(s)},addEventListener:(name,fn)=>handlers[name]=fn,querySelectorAll:()=>[]},window:{},URL};
  const code=readFileSync('scripts/analytics.js','utf8').replace(/^import .*;\n/,'');
  vm.runInNewContext(code,context);
  return {calls,scripts,handlers,panel,storage,choose:value=>handlers.choice({target:{dataset:{choice:value}}})};
}
test('no tracker initialization or external scripts before choice or after rejection',()=>{
  const r=run();assert.equal(r.calls.length,0);assert.equal(r.scripts.length,0);assert.equal(r.panel.hidden,false);
  r.choose('rejected');assert.equal(r.calls.length,0);assert.equal(r.scripts.length,0);
});
test('accept initializes once and captures a pageview; explicit repeat does not duplicate',()=>{
  const r=run();r.choose('accepted');r.choose('accepted');
  assert.equal(r.calls.filter(c=>c[0]==='init').length,1);
  assert.equal(r.calls.filter(c=>c[0]==='capture'&&c[1]==='$pageview').length,1);
  assert.equal(r.scripts.length,1);
});
test('privacy signal overrides previously accepted analytics',()=>{
  const r=run({saved:{value:'accepted',time:Date.now()},privacy:true});assert.equal(r.calls.length,0);assert.equal(r.scripts.length,0);
});
test('expired consent prompts again without analytics',()=>{
  const r=run({saved:{value:'accepted',time:0}});assert.equal(r.calls.length,0);assert.equal(r.panel.hidden,false);
});
test('withdraw stops capture and reloads to remove the prior counter',()=>{
  const r=run();r.choose('accepted');r.choose('rejected');
  assert.ok(r.calls.some(c=>c[0]==='optout'));assert.ok(r.calls.some(c=>c[0]==='reload'));
});
test('event filter strips arbitrary values, full URLs and form data',()=>{
  const r=run();r.choose('accepted');const config=r.calls.find(c=>c[0]==='init')[2];
  const event=config.before_send({event:'$pageview',properties:{distinct_id:'random',email:'private', '$current_url':'https://x.test/?token=secret',page_path:'/'}});
  assert.equal(event.properties.email,undefined);assert.equal(event.properties.$current_url,'https://example.test/products/vaultic/');
  assert.equal(config.before_send({event:'$autocapture',properties:{}}),null);
  assert.equal(config.disable_session_recording,true);assert.equal(config.autocapture,false);
});

test('checkout click sends a permitted event immediately before navigation',()=>{
  const r=run();r.choose('accepted');
  r.handlers.click({target:{closest:()=>({href:'https://morrisonsaisolutions.lemonsqueezy.com/checkout/buy/example'})}});
  const capture=r.calls.find(c=>c[0]==='capture'&&c[1]==='checkout_clicked');
  assert.ok(capture);assert.equal(capture[3].send_instantly,true);assert.equal(capture[3].transport,'sendBeacon');
});
