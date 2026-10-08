'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {stripJsComments,findInlineEventAttrs}=require('../scripts/verify-no-inline-event-attrs.js');

test('S2525 CSP verifier ignores JavaScript comments containing inline-handler examples',()=>{
 const src='// <input onchange="fake()">\nconst x=1; /* <div onclick="fake()"> */';
 assert.deepEqual(findInlineEventAttrs(src),[]);
});

test('S2525 CSP verifier keeps HTML inside runtime strings inspectable',()=>{
 const src='const html=`<input onchange="fake()">`;';
 assert.deepEqual(findInlineEventAttrs(src),['onchange']);
});

test('S2525 CSP verifier still fails on an actual inline handler',()=>{
 const src='const html="<input onchange=\"fake()\">";';
 assert.deepEqual(findInlineEventAttrs(src),['onchange']);
});

test('S2525 CSP verifier accepts data-* event attributes',()=>{
 const src='const html="<input data-onchange=\"fake\">";';
 assert.deepEqual(findInlineEventAttrs(src),[]);
});

test('S2525 comment stripper preserves quoted comment-like text',()=>{
 const src='const x="// not a comment"; const y=`/* not a comment */`;';
 const stripped=stripJsComments(src);
 assert.equal(stripped,src);
});
