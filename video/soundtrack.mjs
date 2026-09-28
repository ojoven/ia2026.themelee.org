#!/usr/bin/env node
// Synthesises the showreel soundtrack (48 kHz stereo WAV), locked to the same
// pacing as video/showreel.html (video/timeline.json): 120 BPM, drop at 2 s.
//
//   node video/soundtrack.mjs out.wav
import { readFile, writeFile } from "node:fs/promises";

const TIMELINE = JSON.parse(await readFile(new URL("./timeline.json", import.meta.url), "utf8"));
// real time at which the showreel's base clock reaches `base`
function Tn(base) {
	let shift = 0;
	for (const [a, b, len] of TIMELINE.segments) {
		if (base < a) break;
		if (b > a && base < b) return a + shift + ((base - a) * len) / (b - a);
		shift += len - (b - a);
	}
	return base + shift;
}
const SR = 48000;
const DUR = TIMELINE.duration;
const N = SR * DUR;
const BEAT = 0.5;
const out = process.argv[2] ?? "soundtrack.wav";

// ---------- primitives ----------
let seed = 20261002;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const noise = () => rnd() * 2 - 1;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

function coef(type, f, q = 0.707) {
	const w = (2 * Math.PI * Math.min(Math.max(f, 10), SR * 0.45)) / SR;
	const c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
	let b0, b1, b2;
	if (type === "lp") [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
	else if (type === "hp") [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
	else [b0, b1, b2] = [a, 0, -a];
	const a0 = 1 + a;
	return [b0 / a0, b1 / a0, b2 / a0, (-2 * c) / a0, (1 - a) / a0];
}
class Biquad {
	x1 = 0; x2 = 0; y1 = 0; y2 = 0;
	run(x, k) {
		const y = k[0] * x + k[1] * this.x1 + k[2] * this.x2 - k[3] * this.y1 - k[4] * this.y2;
		this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
		return y;
	}
}
// filter a mono signal with a cutoff that may change over time (f(u), u = 0..1)
function filt(sig, type, f, q = 0.707) {
	const bq = new Biquad(), bq2 = new Biquad();
	let k = coef(type, typeof f === "function" ? f(0) : f, q);
	const o = new Float32Array(sig.length);
	for (let i = 0; i < sig.length; i++) {
		if (typeof f === "function" && i % 16 === 0) k = coef(type, f(i / sig.length), q);
		o[i] = bq2.run(bq.run(sig[i], k), k);
	}
	return o;
}
const blep = (t, dt) => (t < dt ? ((t /= dt), t + t - t * t - 1) : t > 1 - dt ? ((t = (t - 1) / dt), t * t + t + t + 1) : 0);
function gen(len, fn) {
	const n = Math.floor(len * SR), s = new Float32Array(n);
	for (let i = 0; i < n; i++) s[i] = fn(i / SR, i);
	return s;
}

// ---------- buses ----------
const bus = () => [new Float32Array(N), new Float32Array(N)];
const drums = bus(), tonal = bus(), fx = bus(), send = bus(), delaySend = bus();
function put(target, sig, t0, { gain = 1, pan = 0, verb = 0, delay = 0 } = {}) {
	const i0 = Math.round(t0 * SR);
	for (let k = 0; k < sig.length; k++) {
		const i = i0 + k;
		if (i < 0 || i >= N) continue;
		const p = typeof pan === "function" ? pan(k / sig.length) : pan;
		const l = Math.cos(((p + 1) * Math.PI) / 4) * gain * sig[k];
		const r = Math.sin(((p + 1) * Math.PI) / 4) * gain * sig[k];
		target[0][i] += l; target[1][i] += r;
		if (verb) { send[0][i] += l * verb; send[1][i] += r * verb; }
		if (delay) { delaySend[0][i] += l * delay; delaySend[1][i] += r * delay; }
	}
}

const cue = (target, sig, base, opts) => put(target, sig, Tn(base), opts);

// ---------- instruments ----------
const kick = (pitch = 1, len = 0.45) =>
	(() => {
		let ph = 0;
		const s = gen(len, (t, i) => {
			ph += (2 * Math.PI * (52 + 130 * Math.exp(-t * 28) + 80 * Math.exp(-t * 220)) * pitch) / SR;
			return Math.tanh(1.8 * Math.sin(ph) * Math.exp(-t * 9) * Math.min(1, i / 60));
		});
		for (let i = 0; i < 0.004 * SR; i++) s[i] += noise() * 0.3 * (1 - i / (0.004 * SR));
		return s;
	})();
const hat = (open = false) => filt(gen(open ? 0.3 : 0.07, (t) => noise() * Math.exp(-t * (open ? 14 : 62))), "hp", 7800, 0.8);
const clap = () => {
	const s = gen(0.4, (t) => {
		const bursts = [0, 0.011, 0.023].reduce((a, d) => a + (t >= d ? Math.exp(-(t - d) * 280) : 0), 0);
		return noise() * (bursts * 0.8 + (t > 0.023 ? Math.exp(-(t - 0.023) * 15) * 0.5 : 0));
	});
	return filt(s, "bp", 1400, 0.9);
};
const crash = () => filt(gen(1.6, (t) => noise() * Math.exp(-t * 2.6)), "hp", 5200, 0.7);
function bassNote(f, len) {
	let ph = 0;
	const raw = gen(len, (t, i) => {
		ph = (ph + f / SR) % 1;
		const saw = 2 * ph - 1 - blep(ph, f / SR);
		const env = Math.min(1, i / 120) * clamp((len - t) / 0.03);
		return (saw * 0.8 + Math.sin(2 * Math.PI * ph) * 0.5) * env;
	});
	return filt(raw, "lp", (u) => 240 + 1500 * Math.exp(-u * len * 14), 1.2);
}
function pluck(f, len = 0.22) {
	let ph = 0;
	const raw = gen(len, (t) => {
		ph = (ph + f / SR) % 1;
		return (2 * ph - 1 - blep(ph, f / SR)) * Math.exp(-t * 14);
	});
	return filt(raw, "lp", (u) => 700 + 3400 * Math.exp(-u * len * 22), 0.9);
}
function padChord(notes, len, { attack = 0.08, release = 0.35, cutoff = 2100 } = {}) {
	const total = len + release;
	const phases = notes.flatMap(() => [rnd(), rnd(), rnd()]);
	const L = gen(total, () => 0), R = gen(total, () => 0);
	notes.forEach((m, ni) => {
		[-9, 0, 9].forEach((cents, vi) => {
			const f = midi(m) * 2 ** (cents / 1200);
			let ph = phases[ni * 3 + vi];
			const pan = vi - 1;
			for (let i = 0; i < L.length; i++) {
				const t = i / SR;
				ph = (ph + f / SR) % 1;
				const env = Math.min(1, t / attack) * (t > len ? Math.exp(-(t - len) / (release / 3)) : 1);
				const v = (2 * ph - 1 - blep(ph, f / SR)) * env;
				L[i] += v * (pan < 0 ? 1 : pan === 0 ? 0.6 : 0.15);
				R[i] += v * (pan > 0 ? 1 : pan === 0 ? 0.6 : 0.15);
			}
		});
	});
	const c = typeof cutoff === "function" ? cutoff : () => cutoff;
	return [filt(L, "lp", c, 0.6), filt(R, "lp", c, 0.6)];
}
const whoosh = (len, f0, f1, { peak = 0.65, q = 1.3 } = {}) =>
	filt(
		gen(len, (t) => {
			const u = t / len;
			const env = u < peak ? Math.sin((u / peak) * Math.PI * 0.5) ** 2 : Math.cos(((u - peak) / (1 - peak)) * Math.PI * 0.5) ** 2;
			return noise() * env;
		}),
		"bp",
		(u) => f0 * (f1 / f0) ** u,
		q,
	);
const riser = (len) => {
	const n = filt(gen(len, (t) => noise() * (t / len) ** 2.2), "hp", (u) => 400 * 12 ** u, 0.9);
	let ph = 0;
	const tone = gen(len, (t) => {
		const u = t / len;
		ph += (2 * Math.PI * 180 * 6 ** (u * u)) / SR;
		return Math.sin(ph + Math.sin(t * 40) * 0.4) * u ** 2.5 * 0.35;
	});
	return n.map((v, i) => v + tone[i]);
};
const impact = (len = 1.6) => {
	let ph = 0;
	const sub = gen(len, (t) => {
		ph += (2 * Math.PI * (32 + 50 * Math.exp(-t * 7))) / SR;
		return Math.sin(ph) * Math.exp(-t * 2.6) * Math.min(1, t * 400);
	});
	const body = filt(gen(0.6, (t) => noise() * Math.exp(-t * 9)), "lp", (u) => 2600 * 0.15 ** u, 0.8);
	return sub.map((v, i) => Math.tanh(1.4 * v + (body[i] ?? 0) * 0.9));
};
const thud = () => {
	let ph = 0;
	const s = gen(0.35, (t) => {
		ph += (2 * Math.PI * (48 + 90 * Math.exp(-t * 28))) / SR;
		return Math.sin(ph) * Math.exp(-t * 11);
	});
	const n = filt(gen(0.08, (t) => noise() * Math.exp(-t * 60)), "lp", 1800);
	return s.map((v, i) => v + (n[i] ?? 0) * 0.8);
};
const pop = (f = 700) => {
	let ph = 0;
	return gen(0.12, (t) => {
		ph += (2 * Math.PI * f * (1 + 0.9 * Math.exp(-t * 60))) / SR;
		return Math.sin(ph) * Math.exp(-t * 34) * Math.min(1, t * 2000);
	});
};
const ping = (f, len = 0.35) => gen(len, (t) => (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * Math.exp(-t * 13) * Math.min(1, t * 3000));
const tick = (f = 5200) => filt(gen(0.012, (t) => noise() * Math.exp(-t * 700)), "bp", f, 1.4);
const clink = (base = 1) => {
	const parts = [[2637, 3.2], [3961, 4.5], [5279, 5.5], [6703, 7], [8190, 8]];
	return gen(0.9, (t) => parts.reduce((a, [f, d], k) => a + Math.sin(2 * Math.PI * f * base * t + k) * Math.exp(-t * d) / (k + 1.5), 0) * Math.min(1, t * 6000));
};
const scribble = (len, rate = 11) => {
	const strokes = [];
	for (let t = 0; t < len; t += 1 / rate) strokes.push([t, 0.4 + rnd() * 0.6, 0.5 + rnd() * 0.8]);
	const s = gen(len, (t) => {
		const k = Math.min(strokes.length - 1, Math.floor(t * rate));
		const [t0, a, sp] = strokes[k];
		const u = (t - t0) * rate;
		return noise() * a * Math.sin(Math.PI * clamp(u * sp)) ** 2;
	});
	return filt(s, "bp", 3200, 0.9);
};
const reverse = (sig) => sig.slice().reverse();

// ---------- the score ----------
// arranged in real time; B = when the base clock reaches a moment
const B = Tn;
const DROP = 2, END_HIT = B(13), FINAL = B(14);
// chord per section: [start, end, pad voicing, bass root]
const Dm = [[57, 62, 65, 69], 38], Bb = [[58, 62, 65, 70], 34], F = [[57, 60, 65, 69], 41], C = [[55, 60, 64, 67], 36];
const CHORDS = [[0, DROP, ...Dm]];
{
	// Dm Bb F C, a bar each, from the drop to the fishbowl reveal, then round again
	const cycle = [Dm, Bb, F, C];
	let t = DROP, k = 0;
	const reveal = B(9.97) + 0.03;
	for (; t + 2 <= reveal; t += 2, k++) CHORDS.push([t, t + 2, ...cycle[k % 4]]);
	if (t < reveal) CHORDS.push([t, reveal, ...cycle[k % 4]]);
	const bars = [[reveal, reveal + 2, Dm], [reveal + 2, B(12), F], [B(12), END_HIT, Bb]];
	for (const [a, b, ch] of bars) CHORDS.push([a, b, ...ch]);
	CHORDS.push([END_HIT, FINAL, ...C], [FINAL, DUR, [50, 57, 62, 64, 65, 69], 38]);
}
const chordAt = (t) => CHORDS.find(([a, b]) => t >= a && t < b) ?? CHORDS[CHORDS.length - 1];

// pads
for (const [a, b, notes] of CHORDS) {
	const intro = a === 0, last = a === FINAL;
	const [L, R] = padChord(notes, b - a, {
		attack: intro ? 0.9 : 0.05,
		release: last ? 0.2 : 0.3,
		cutoff: intro ? (u) => 600 + 2000 * u * u : last ? (u) => 3600 * 0.35 ** u : 3200,
	});
	const g = intro ? 0.055 : last ? 0.08 : 0.05;
	put(tonal, L, a, { gain: g, pan: -0.9, verb: 0.35 });
	put(tonal, R, a, { gain: g, pan: 0.9, verb: 0.35 });
}

// drums & bass on the grid
const kickHit = kick(), kickTimes = [];
const hatC = hat(), hatO = hat(true), clapHit = clap();
const GAP = [B(9.45), B(9.97) + 0.5]; // riser into the fishbowl reveal, groove back a beat later
for (let t = DROP; t < FINAL - 1e-6; t += BEAT) {
	const b = Math.round((t - DROP) / BEAT);
	const outro = t >= END_HIT;
	const gap = t >= GAP[0] && t < GAP[1];
	if (!gap) {
		put(drums, kickHit, t, { gain: 0.85 });
		kickTimes.push(t);
	}
	if (b % 2 === 1 && !gap) put(drums, clapHit, t, { gain: 0.55, verb: 0.25 });
	if (!gap) put(drums, b % 4 === 3 ? hatO : hatC, t + 0.25, { gain: b % 4 === 3 ? 0.26 : 0.36, pan: 0.3 });
	if (t >= B(5) && !gap) {
		put(drums, hatC, t + 0.125, { gain: 0.12, pan: -0.35 });
		put(drums, hatC, t + 0.375, { gain: 0.15, pan: -0.35 });
	}
	// offbeat bass
	if (!outro && !gap) {
		const root = chordAt(t + 0.25)[3];
		put(tonal, bassNote(midi(root), 0.2), t + 0.25, { gain: 0.3 });
		if (b % 4 === 3) put(tonal, bassNote(midi(root + 12), 0.1), t + 0.375, { gain: 0.2 });
	}
}
// outro: snare roll into the final hit
for (let k = 0; k < 12; k++) put(drums, clapHit, FINAL - 0.5 + (k / 12) * 0.5, { gain: 0.12 + 0.3 * (k / 12), verb: 0.2 });
put(tonal, bassNote(midi(36), 0.45), END_HIT, { gain: 0.38 });
put(tonal, bassNote(midi(38), 0.9), FINAL, { gain: 0.4 });
// arpeggio in the busy sections: the topics, and from the reveal to the end card
for (const [a, b] of [[B(5), B(7.5)], [B(10), B(12.9)]]) {
	const order = [0, 1, 2, 3, 2, 1, 3, 2];
	for (let t = Math.round(a * 8) / 8, k = 0; t < b - 1e-6; t += 0.125, k++) {
		const notes = chordAt(t)[2];
		const m = notes[order[k % order.length] % notes.length] + 12;
		put(tonal, pluck(midi(m)), t, { gain: 0.055 + (k % 4 === 0 ? 0.02 : 0), pan: k % 2 ? 0.45 : -0.45, delay: 0.35 });
	}
}

// ---------- sound design ----------
// cues are written on the base clock (same numbers as showreel.html)
// 0.0 handwriting, arrow stroke, riser into the logo slam
cue(fx, scribble(0.8), 0.0, { gain: 0.12, pan: -0.1 });
cue(fx, scribble(0.3, 7), 0.74, { gain: 0.09, pan: 0.35 });
cue(fx, riser(0.95), 0.05, { gain: 0.1 });
cue(fx, whoosh(0.2, 300, 1400, { peak: 0.9 }), 0.82, { gain: 0.45 });
// 1.0 slam
cue(fx, impact(1.8), 1.0, { gain: 0.8, verb: 0.3 });
cue(drums, kickHit, 1.0, { gain: 0.8 });
cue(fx, crash(), 1.0, { gain: 0.12, verb: 0.2 });
cue(fx, filt(gen(0.55, (t) => noise() * (0.5 + 0.5 * Math.sin(t * 60)) * Math.sin((t / 0.55) * Math.PI)), "lp", 260), 1.1, { gain: 0.35, pan: (u) => 0.1 - 0.6 * u });
for (let i = 0; i < 9; i++) cue(fx, tick(4200 + i * 180), 1.14 + i * 0.022, { gain: 0.16, pan: -0.4 + i * 0.1 });
cue(fx, pop(820), 1.5, { gain: 0.3, verb: 0.2, pan: 0.45 });
// 1.64 zoom through the dot
cue(fx, riser(0.36), 1.64, { gain: 0.22 });
cue(fx, whoosh(0.38, 200, 3000, { peak: 0.95 }), 1.62, { gain: 0.6 });
// 2.0 drop
cue(fx, crash(), 2.0, { gain: 0.16, verb: 0.3 });
cue(fx, impact(0.9), 2.0, { gain: 0.35 });
// panel wipes
cue(fx, whoosh(0.3, 500, 2600), 2.3, { gain: 0.35, pan: 0 });
cue(fx, whoosh(0.3, 600, 3200), 2.8, { gain: 0.35, pan: (u) => 0.8 - 1.6 * u });
cue(fx, whoosh(0.55, 1800, 400, { peak: 0.5, q: 0.9 }), 3.4, { gain: 0.25 });
cue(fx, ping(midi(81), 0.6), 3.64, { gain: 0.07, verb: 0.5, pan: 0.5 });
cue(fx, pop(520), 3.86, { gain: 0.2, pan: -0.4 });
// typing and send
const Q = 28;
for (let k = 0; k < Q; k++) cue(fx, tick(3000 + rnd() * 2400), 4.0 + ((k + 1) / Q) * 0.46 - 0.012, { gain: 0.14 + rnd() * 0.06, pan: -0.35 + (k / Q) * 0.3 });
cue(fx, pop(980), 4.54, { gain: 0.3, pan: 0.1 });
cue(fx, ping(midi(86), 0.4), 4.58, { gain: 0.07, verb: 0.4 });
// bands in and out
cue(fx, whoosh(0.42, 350, 2400, { peak: 0.8 }), 4.52, { gain: 0.6, pan: (u) => 0.9 - 0.9 * u });
cue(fx, whoosh(0.34, 2400, 400, { peak: 0.3 }), 4.96, { gain: 0.5, pan: (u) => -0.9 * u });
// four whips
for (const c of [5.5, 6.0, 6.5, 7.0]) {
	cue(fx, whoosh(0.26, 700, 3600, { peak: 0.5, q: 1.1 }), c - 0.14, { gain: 0.42, pan: (u) => 0.8 - 1.6 * u });
	cue(fx, tick(2600), c + 0.1, { gain: 0.14, pan: 0.7 });
}
cue(fx, scribble(0.3), 6.97, { gain: 0.05, pan: 0.2 });
// iris into the fishbowl
cue(fx, whoosh(0.35, 3000, 900), 7.26, { gain: 0.18, pan: -0.5 });
cue(fx, reverse(impact(0.5)), 7.45, { gain: 0.35 });
cue(fx, whoosh(0.5, 150, 700, { peak: 0.7, q: 0.8 }), 7.45, { gain: 0.5 });
const PENTA = [74, 77, 79, 81, 84, 86, 89, 91, 93, 96, 98, 101];
for (let j = 0; j < 12; j++) cue(fx, ping(midi(PENTA[j]), 0.25), 7.74 + j * 0.035, { gain: 0.05, pan: Math.sin(j * 0.52) * 0.8, verb: 0.35 });
for (let j = 0; j < 5; j++) cue(fx, pop(midi([69, 72, 74, 76, 77][j]) * 1.0), 7.94 + j * 0.05, { gain: 0.16, pan: Math.cos(j * 1.25) * 0.6, verb: 0.3 });
cue(fx, scribble(0.45), 8.4, { gain: 0.06, pan: 0.4 });
cue(fx, scribble(0.25, 7), 8.58, { gain: 0.05, pan: 0.2 });
cue(fx, whoosh(0.4, 400, 1600, { peak: 0.7 }), 8.92, { gain: 0.25, pan: (u) => 0.3 - 0.4 * u });
cue(fx, ping(midi(74), 0.8), 9.32, { gain: 0.12, verb: 0.5 });
cue(fx, ping(midi(81), 0.8), 9.34, { gain: 0.07, verb: 0.5 });
// zoom into the circle → the fishbowl illustration
cue(fx, riser(0.52), 9.45, { gain: 0.25 });
for (let k = 0; k < 10; k++) cue(drums, clapHit, 9.5 + (k / 10) * 0.45, { gain: 0.08 + 0.22 * (k / 10), verb: 0.2 });
cue(fx, whoosh(0.52, 200, 2600, { peak: 0.9 }), 9.45, { gain: 0.5 });
cue(fx, impact(1.2), 9.97, { gain: 0.55, verb: 0.3 });
cue(drums, kickHit, 9.97, { gain: 0.9 });
cue(fx, crash(), 9.97, { gain: 0.14, verb: 0.3 });
cue(fx, scribble(0.24), 9.98, { gain: 0.05, pan: 0.5 });
cue(fx, scribble(0.14), 10.2, { gain: 0.05, pan: 0.5 });
// card shrink, digit rolls, stamp
cue(fx, whoosh(0.44, 2000, 500, { peak: 0.45, q: 0.9 }), 10.42, { gain: 0.35, pan: (u) => 0.6 * u });
function rollTicks(a, d, steps, gain, pan) {
	let last = 0;
	for (let t = a; t < a + d; t += 0.001) {
		const v = Math.floor(steps * (1 - 2 ** (-10 * ((t - a) / d))));
		if (v > last) {
			cue(fx, tick(3600 + (v % 3) * 500), t, { gain, pan });
			last = v;
		}
	}
}
rollTicks(10.66, 0.8, 27, 0.1, -0.4);
cue(fx, whoosh(0.16, 400, 2000, { peak: 0.95 }), 10.84, { gain: 0.35, pan: 0.7 });
cue(fx, thud(), 11.0, { gain: 0.9, pan: 0.5, verb: 0.2 });
rollTicks(10.9, 0.65, 22, 0.08, 0.6);
// the third half: flip and cheers
cue(fx, whoosh(0.25, 2400, 700, { peak: 0.3 }), 11.72, { gain: 0.25, pan: (u) => -0.3 - 0.5 * u });
cue(fx, whoosh(0.46, 500, 2400, { peak: 0.5, q: 1 }), 11.86, { gain: 0.35, pan: (u) => 0.4 + 0.3 * Math.sin(u * Math.PI) });
cue(fx, clink(1), 12.06, { gain: 0.12, pan: 0.5, verb: 0.3 });
cue(fx, clink(1.06), 12.13, { gain: 0.09, pan: 0.6, verb: 0.3 });
cue(fx, scribble(0.38), 12.3, { gain: 0.05, pan: 0.4 });
// star wipe → end card
put(fx, reverse(crash()).slice(-Math.floor(0.6 * SR)), Tn(13) - 0.6, { gain: 0.14 });
cue(fx, whoosh(0.46, 250, 3200, { peak: 0.75 }), 12.86, { gain: 0.55 });
cue(fx, impact(1.4), 13.0, { gain: 0.6, verb: 0.3 });
cue(drums, kickHit, 13.0, { gain: 0.9 });
cue(fx, crash(), 13.0, { gain: 0.16, verb: 0.3 });
cue(fx, pop(640), 13.16, { gain: 0.26, verb: 0.2 });
for (let i = 0; i < 9; i++) cue(fx, tick(4000 + i * 200), 13.22 + i * 0.024 + 0.05, { gain: 0.1, pan: -0.4 + i * 0.1 });
cue(fx, pop(900), 13.52, { gain: 0.24, pan: 0.4, verb: 0.2 });
cue(fx, pop(560), 13.6, { gain: 0.26, verb: 0.2 });
// final hit, shine, handwriting
cue(fx, impact(1.2), 14.0, { gain: 0.5, verb: 0.35 });
cue(drums, kickHit, 14.0, { gain: 0.9 });
cue(fx, crash(), 14.0, { gain: 0.2, verb: 0.4 });
cue(fx, scribble(0.42), 14.06, { gain: 0.05, pan: 0.5 });
[86, 89, 93, 98].forEach((m, i) => cue(fx, ping(midi(m), 0.5), 14.06 + i * 0.05, { gain: 0.045, pan: -0.3 + i * 0.2, verb: 0.5 }));

// ---------- mix ----------
// sidechain the tonal bus to the kick
const duck = new Float32Array(N).fill(1);
for (const t of kickTimes) {
	const i0 = Math.round(t * SR);
	for (let i = i0; i < Math.min(N, i0 + 0.4 * SR); i++) duck[i] = Math.min(duck[i], 1 - 0.6 * Math.exp(-((i - i0) / SR) * 9));
}
// delay on the arp: dotted eighths, ping-pong
const dl = Math.round(0.375 * SR);
for (let i = dl; i < N; i++) {
	delaySend[0][i] += delaySend[1][i - dl] * 0.38;
	delaySend[1][i] += delaySend[0][i - dl] * 0.38;
}
// fishbowl: music goes underwater, then opens back up for the reveal
const [UW0, UW1, UW2, UW3] = [Tn(7.5), Tn(7.9), Tn(9.45), Tn(9.97)];
const lpCut = (t) =>
	t < UW0 ? 18000 : t < UW1 ? 18000 * (650 / 18000) ** ((t - UW0) / (UW1 - UW0)) : t < UW2 ? 650 : t < UW3 ? 650 * (18000 / 650) ** ((t - UW2) / (UW3 - UW2)) : 18000;
const music = bus();
for (let c = 0; c < 2; c++) {
	const bq = new Biquad(), bq2 = new Biquad();
	let k = coef("lp", 18000);
	for (let i = 0; i < N; i++) {
		if (i % 32 === 0) k = coef("lp", lpCut(i / SR), 0.9);
		const t = i / SR;
		const under = 1 - 0.28 * clamp((t - UW0) * 4) * clamp((UW3 - t) * 4);
		const x = drums[c][i] + tonal[c][i] * duck[i] + delaySend[c][i] * 0.5;
		music[c][i] = bq2.run(bq.run(x, k), k) * under;
	}
}
// freeverb
function freeverb(inL, inR, room = 0.83, damp = 0.3) {
	const sc = SR / 44100;
	const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
	const aps = [556, 441, 341, 225];
	const mk = (len) => ({ buf: new Float32Array(Math.round(len * sc)), i: 0, f: 0 });
	const outL = new Float32Array(N), outR = new Float32Array(N);
	for (const [input, output, spread] of [[inL, outL, 0], [inR, outR, 23]]) {
		const cs = combs.map((l) => mk(l + spread)), as = aps.map((l) => mk(l + spread));
		for (let n = 0; n < N; n++) {
			const x = input[n] * 0.015;
			let y = 0;
			for (const c of cs) {
				const o = c.buf[c.i];
				c.f = o * (1 - damp) + c.f * damp;
				c.buf[c.i] = x + c.f * room;
				c.i = (c.i + 1) % c.buf.length;
				y += o;
			}
			for (const a of as) {
				const o = a.buf[a.i];
				a.buf[a.i] = y + o * 0.5;
				a.i = (a.i + 1) % a.buf.length;
				y = o - y;
			}
			output[n] = y;
		}
	}
	return [outL, outR];
}
const [vL, vR] = freeverb(send[0], send[1]);
const master = bus();
let peak = 0;
const hpK = coef("hp", 32, 0.7), airK = coef("hp", 5000, 0.7);
for (let c = 0; c < 2; c++) {
	const h1 = new Biquad(), h2 = new Biquad(), air = new Biquad();
	for (let i = 0; i < N; i++) {
		const t = i / SR;
		const fade = Math.min(1, t / 0.01) * clamp((DUR - t) / 0.35);
		let v = music[c][i] + fx[c][i] + (c ? vR : vL)[i] * 1.1;
		v = h2.run(h1.run(v, hpK), hpK);
		v = (v + 0.35 * air.run(v, airK)) * fade;
		master[c][i] = v;
		peak = Math.max(peak, Math.abs(v));
	}
}
// glue: gentle saturation, then normalise to -1 dBFS
const drive = 1.35 / peak;
let peak2 = 0;
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) peak2 = Math.max(peak2, Math.abs((master[c][i] = Math.tanh(master[c][i] * drive))));
const norm = 0.891 / peak2;

// ---------- write ----------
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++)
	for (let c = 0; c < 2; c++) buf.writeInt16LE(Math.round(clamp(master[c][i] * norm, -1, 1) * 32767), 44 + i * 4 + c * 2);
await writeFile(out, buf);
console.log(out);
