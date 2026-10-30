// Run: node --experimental-strip-types src/lib/ui/mic.test.ts
import assert from "node:assert/strict";
import { micVerdict, rms } from "./mic.ts";

assert.equal(rms(new Float32Array(0)), 0);
assert.equal(rms(new Float32Array([0.5, -0.5])), 0.5);
assert.equal(micVerdict(500, 0.3), "short");
assert.equal(micVerdict(3000, 0.001), "silent");
assert.equal(micVerdict(3000, 0.1), "ok");
console.log("mic ok");
