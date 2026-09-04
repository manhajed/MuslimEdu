// Offline QR encoder — replaces the api.qrserver.com round-trip that
// idCardQrImgUrl() used to make, so student/staff ID cards still render
// their codes with no network. Byte mode, error-correction level M,
// versions 1-10 (enough for 213 bytes; ID payloads run ~25-40).
//
// Exposes window.MuslimEduQR.toDataURL(text, opts) -> an SVG data: URL,
// which the pages' `img-src 'self' data:` CSP already allows.
(function (global) {
  'use strict';

  // ---- GF(256) arithmetic, primitive polynomial 0x11D ----------------
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    for (var i = 0, x = 1; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function mul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  // Generator polynomial for `deg` error-correction codewords.
  function genPoly(deg) {
    var p = [1];
    for (var i = 0; i < deg; i++) {
      var next = new Array(p.length + 1).fill(0);
      for (var j = 0; j < p.length; j++) {
        next[j] ^= p[j];
        next[j + 1] ^= mul(p[j], EXP[i]);
      }
      p = next;
    }
    return p;
  }

  function ecCodewords(data, ecLen) {
    var g = genPoly(ecLen);
    var rem = new Array(ecLen).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ rem[0];
      rem.shift(); rem.push(0);
      for (var j = 0; j < ecLen; j++) rem[j] ^= mul(g[j + 1], factor);
    }
    return rem;
  }

  // ---- Version tables, error-correction level M ----------------------
  // [ecPerBlock, blocksG1, dataPerBlockG1, blocksG2, dataPerBlockG2]
  var EC_M = {
    1: [10, 1, 16, 0, 0], 2: [16, 1, 28, 0, 0], 3: [26, 1, 44, 0, 0],
    4: [18, 2, 32, 0, 0], 5: [24, 2, 43, 0, 0], 6: [16, 4, 27, 0, 0],
    7: [18, 4, 31, 0, 0], 8: [22, 2, 38, 2, 39], 9: [22, 3, 36, 2, 37],
    10: [26, 4, 43, 1, 44]
  };
  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };
  function dataCapacity(v) {
    var e = EC_M[v];
    return e[1] * e[2] + e[3] * e[4];
  }

  // ---- Bit buffer ----------------------------------------------------
  function BitBuf() { this.bits = []; }
  BitBuf.prototype.put = function (val, len) {
    for (var i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1);
  };

  function encodeData(bytes, version) {
    var buf = new BitBuf();
    buf.put(4, 4);                                   // byte mode
    buf.put(bytes.length, version < 10 ? 8 : 16);    // character count
    for (var i = 0; i < bytes.length; i++) buf.put(bytes[i], 8);

    var capBits = dataCapacity(version) * 8;
    if (buf.bits.length > capBits) return null;

    // Terminator, then pad to a byte boundary, then alternating pad bytes.
    buf.put(0, Math.min(4, capBits - buf.bits.length));
    while (buf.bits.length % 8) buf.bits.push(0);

    var cw = [];
    for (var b = 0; b < buf.bits.length; b += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | buf.bits[b + k];
      cw.push(v);
    }
    var pads = [0xec, 0x11], pi = 0;
    while (cw.length < dataCapacity(version)) cw.push(pads[pi++ % 2]);
    return cw;
  }

  // Split into blocks, append per-block EC, then interleave both.
  function interleave(cw, version) {
    var e = EC_M[version], ecLen = e[0];
    var blocks = [], ecBlocks = [], p = 0, i, j;
    for (i = 0; i < e[1]; i++) { blocks.push(cw.slice(p, p + e[2])); p += e[2]; }
    for (i = 0; i < e[3]; i++) { blocks.push(cw.slice(p, p + e[4])); p += e[4]; }
    for (i = 0; i < blocks.length; i++) ecBlocks.push(ecCodewords(blocks[i], ecLen));

    var out = [], maxData = Math.max(e[2], e[4]);
    for (j = 0; j < maxData; j++)
      for (i = 0; i < blocks.length; i++)
        if (j < blocks[i].length) out.push(blocks[i][j]);
    for (j = 0; j < ecLen; j++)
      for (i = 0; i < ecBlocks.length; i++) out.push(ecBlocks[i][j]);
    return out;
  }

  // ---- Matrix construction -------------------------------------------
  function buildMatrix(version) {
    var n = version * 4 + 17;
    var m = [], reserved = [], i, j;
    for (i = 0; i < n; i++) {
      m.push(new Array(n).fill(0));
      reserved.push(new Array(n).fill(false));
    }
    function setFn(r, c, v) { m[r][c] = v; reserved[r][c] = true; }

    function finder(r0, c0) {
      for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
        var rr = r0 + r, cc = c0 + c;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        var on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                 (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        setFn(rr, cc, on ? 1 : 0);
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);

    for (i = 8; i < n - 8; i++) {           // timing patterns
      setFn(6, i, i % 2 === 0 ? 1 : 0);
      setFn(i, 6, i % 2 === 0 ? 1 : 0);
    }

    var ap = ALIGN[version];                 // alignment patterns
    for (i = 0; i < ap.length; i++) for (j = 0; j < ap.length; j++) {
      var ar = ap[i], ac = ap[j];
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= n - 9) || (ar >= n - 9 && ac <= 8)) continue;
      for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++)
        setFn(ar + dr, ac + dc,
          (Math.max(Math.abs(dr), Math.abs(dc)) !== 1) ? 1 : 0);
    }

    setFn(n - 8, 8, 1);                      // dark module

    for (i = 0; i < 9; i++) {                // reserve format-info areas
      if (!reserved[8][i]) setFn(8, i, 0);
      if (!reserved[i][8]) setFn(i, 8, 0);
    }
    for (i = 0; i < 8; i++) {
      if (!reserved[8][n - 1 - i]) setFn(8, n - 1 - i, 0);
      if (!reserved[n - 1 - i][8]) setFn(n - 1 - i, 8, 0);
    }

    if (version >= 7) {                      // reserve version-info areas
      for (i = 0; i < 6; i++) for (j = 0; j < 3; j++) {
        setFn(n - 11 + j, i, 0);
        setFn(i, n - 11 + j, 0);
      }
    }
    return { m: m, reserved: reserved, n: n };
  }

  function placeData(grid, cw) {
    var m = grid.m, reserved = grid.reserved, n = grid.n;
    var bitIdx = 0, total = cw.length * 8;
    function bitAt(i) { return i < total ? (cw[i >> 3] >> (7 - (i & 7))) & 1 : 0; }

    var col = n - 1, up = true;
    while (col > 0) {
      if (col === 6) col--;                  // skip the vertical timing column
      for (var t = 0; t < n; t++) {
        var row = up ? n - 1 - t : t;
        for (var k = 0; k < 2; k++) {
          var c = col - k;
          if (reserved[row][c]) continue;
          m[row][c] = bitAt(bitIdx++);
        }
      }
      up = !up; col -= 2;
    }
  }

  var MASKS = [
    function (r, c) { return (r + c) % 2 === 0; },
    function (r) { return r % 2 === 0; },
    function (r, c) { return c % 3 === 0; },
    function (r, c) { return (r + c) % 3 === 0; },
    function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
    function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; },
    function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; },
    function (r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }
  ];

  // 15-bit BCH(15,5) format information, level M => indicator 00.
  function formatBits(mask) {
    var data = (0 << 3) | mask;              // 00 = level M
    var v = data << 10;
    for (var i = 4; i >= 0; i--) if ((v >> (i + 10)) & 1) v ^= 0x537 << i;
    return ((data << 10) | v) ^ 0x5412;
  }

  // 18-bit BCH(18,6) version information, versions 7+.
  function versionBits(version) {
    var v = version << 12;
    for (var i = 5; i >= 0; i--) if ((v >> (i + 12)) & 1) v ^= 0x1f25 << i;
    return (version << 12) | v;
  }

  // Format info is written most-significant bit first: bit 14 lands at
  // (8,0) and bit 0 at (0,8). Copy 2 runs bits 14..8 up the lower-left
  // strip and bits 7..0 along the upper-right run; (n-8,8) is the dark
  // module, not a format cell.
  function applyFormat(m, n, mask) {
    var f = formatBits(mask), i;
    function bit(k) { return (f >> k) & 1; }

    for (i = 0; i <= 5; i++) m[8][i] = bit(14 - i);
    m[8][7] = bit(8);
    m[8][8] = bit(7);
    m[7][8] = bit(6);
    for (i = 0; i <= 5; i++) m[i][8] = bit(i);

    for (i = 0; i <= 6; i++) m[n - 1 - i][8] = bit(14 - i);
    for (i = 0; i <= 7; i++) m[8][n - 8 + i] = bit(7 - i);
    m[n - 8][8] = 1;                          // dark module stays set
  }

  function applyVersion(m, n, version) {
    if (version < 7) return;
    var v = versionBits(version);
    for (var i = 0; i < 18; i++) {
      var bit = (v >> i) & 1;
      var r = Math.floor(i / 3), c = i % 3;
      m[n - 11 + c][r] = bit;
      m[r][n - 11 + c] = bit;
    }
  }

  // Standard penalty rules 1-4, used to pick the least-noisy mask.
  function penalty(m, n) {
    var score = 0, r, c, i, run, dark = 0;

    for (r = 0; r < n; r++) {                 // rule 1: runs of 5+
      run = 1;
      for (c = 1; c < n; c++) {
        if (m[r][c] === m[r][c - 1]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
    }
    for (c = 0; c < n; c++) {
      run = 1;
      for (r = 1; r < n; r++) {
        if (m[r][c] === m[r - 1][c]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
    }
    for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) {  // rule 2: 2x2 blocks
      var s = m[r][c] + m[r][c + 1] + m[r + 1][c] + m[r + 1][c + 1];
      if (s === 0 || s === 4) score += 3;
    }
    var P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function matches(get, at) {
      var a = true, b = true;
      for (var k = 0; k < 11; k++) {
        var val = get(at + k);
        if (val !== P1[k]) a = false;
        if (val !== P2[k]) b = false;
      }
      return a || b;
    }
    for (r = 0; r < n; r++) for (c = 0; c + 11 <= n; c++)       // rule 3: finder-like
      if (matches(function (x) { return m[r][x]; }, c)) score += 40;
    for (c = 0; c < n; c++) for (r = 0; r + 11 <= n; r++)
      if (matches(function (x) { return m[x][c]; }, r)) score += 40;

    for (r = 0; r < n; r++) for (c = 0; c < n; c++) dark += m[r][c];  // rule 4: balance
    score += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10;
    return score;
  }

  function utf8Bytes(str) {
    var out = [], s = encodeURIComponent(str);
    for (var i = 0; i < s.length; i++) {
      if (s[i] === '%') { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else out.push(s.charCodeAt(i));
    }
    return out;
  }

  function encode(text) {
    var bytes = utf8Bytes(text), version = 0, cw = null;
    for (var v = 1; v <= 10; v++) {
      cw = encodeData(bytes, v);
      if (cw) { version = v; break; }
    }
    if (!version) throw new Error('QR payload too long (max 213 bytes at level M)');

    var final = interleave(cw, version);
    var best = null;
    for (var mask = 0; mask < 8; mask++) {
      var grid = buildMatrix(version);
      placeData(grid, final);
      for (var r = 0; r < grid.n; r++) for (var c = 0; c < grid.n; c++)
        if (!grid.reserved[r][c] && MASKS[mask](r, c)) grid.m[r][c] ^= 1;
      applyFormat(grid.m, grid.n, mask);
      applyVersion(grid.m, grid.n, version);
      var p = penalty(grid.m, grid.n);
      if (!best || p < best.p) best = { p: p, m: grid.m, n: grid.n };
    }
    return { modules: best.m, size: best.n, version: version };
  }

  // Renders as one SVG <path>, which stays crisp at any display size.
  function toSvg(text, opts) {
    opts = opts || {};
    var quiet = opts.margin == null ? 4 : opts.margin;
    var dark = opts.dark || '#000000';
    var light = opts.light || '#ffffff';
    var q = encode(text), n = q.size, dim = n + quiet * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++)
      if (q.modules[r][c]) d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim +
      '" shape-rendering="crispEdges"><rect width="' + dim + '" height="' + dim +
      '" fill="' + light + '"/><path d="' + d + '" fill="' + dark + '"/></svg>';
  }

  function toDataURL(text, opts) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(toSvg(text, opts));
  }

  global.MuslimEduQR = { encode: encode, toSvg: toSvg, toDataURL: toDataURL };
})(typeof self !== 'undefined' ? self : this);
