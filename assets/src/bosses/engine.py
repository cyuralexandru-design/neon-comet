"""Neon Comet boss pixel engine: shade-index canvas, facet bevels, mirror w/ darker right half, hue outlines."""
import math, random
import numpy as np
from PIL import Image, ImageDraw
S = 112
HALF = S // 2
def H(h): return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255)
# ramps: index 0 darkest .. 5 brightest ; 'o' = outline
RAMPS = {
 'steel':  (['#262b44','#3a4466','#5a6988','#8b9bb4','#c0cbdc','#ffffff'], '#181425'),
 'gun':    (['#181425','#262b44','#3a4466','#5a6988','#8b9bb4','#c0cbdc'], '#0c0a14'),
 'red':    (['#3e2731','#a22633','#e43b44','#f6757a','#ffc0b8','#ffffff'], '#24121a'),
 'gold':   (['#733e39','#be4a2f','#d77643','#feae34','#fee761','#ffffff'], '#3e2731'),
 'sand':   (['#3e2731','#733e39','#b86f50','#e4a672','#ead4aa','#fff6e0'], '#24141c'),
 'purple': (['#2a1730','#4a2450','#7a367b','#a23e8c','#c65197','#f6a0d8'], '#160c1c'),
 'jade':   (['#193c3e','#265c42','#3e8948','#63c74d','#a8e06a','#e6ffd0'], '#0e2224'),
 'white':  (['#2b2e44','#5a6080','#9aa3bf','#d0d6e6','#f2f4fa','#ffffff'], '#181425'),
 # glows (no right-side darkening, no bevel)
 'gcyan':  (['#124e89','#0099db','#2ce8f5','#a0fbff','#ffffff','#ffffff'], '#172038'),
 'gfire':  (['#be4a2f','#f77622','#feae34','#fee761','#ffffff','#ffffff'], '#3e2731'),
 'gred':   (['#a22633','#ff0044','#f6757a','#ffd0d0','#ffffff','#ffffff'], '#3e2731'),
 'ggreen': (['#265c42','#3e8948','#63c74d','#c8ff9a','#ffffff','#ffffff'], '#193c3e'),
 'gmag':   (['#68386c','#b55088','#f6757a','#ffd0e8','#ffffff','#ffffff'], '#2a1730'),
 'ggold':  (['#be4a2f','#f77622','#feae34','#fee761','#fff6c0','#ffffff'], '#3e2731'),
}
GLOW = {k for k in RAMPS if k.startswith('g') and k != 'gun' and k != 'gold'}

class Canvas:
    def __init__(self):
        self.mat = np.full((S, S), '', dtype=object)
        self.sh = np.zeros((S, S), int)
        self.nomirror = np.zeros((S, S), bool)
    def _mask(self, fn):
        im = Image.new('L', (S, S), 0); fn(ImageDraw.Draw(im))
        return np.array(im) > 0
    def apply(self, m, mat, s, bevel=True, seam=True):
        self.mat[m] = mat; self.sh[m] = s
        if not bevel or mat in GLOW: return
        up = np.zeros_like(m); up[1:] = m[:-1]
        lf = np.zeros_like(m); lf[:, 1:] = m[:, :-1]
        dn = np.zeros_like(m); dn[:-1] = m[1:]
        hi = m & (~up | ~lf)
        lo = m & ~dn
        self.sh[hi] = min(s + 1, 5)
        if seam: self.sh[lo] = max(s - 2, 0)
    def poly(self, pts, mat, s, **k):
        self.apply(self._mask(lambda d: d.polygon(pts, fill=255)), mat, s, **k)
    def rect(self, x0, y0, x1, y1, mat, s, **k): self.poly([(x0,y0),(x1,y0),(x1,y1),(x0,y1)], mat, s, **k)
    def ell(self, x0, y0, x1, y1, mat, s, **k):
        self.apply(self._mask(lambda d: d.ellipse([x0,y0,x1,y1], fill=255)), mat, s, **k)
    def line(self, pts, mat, s, w=1):
        m = self._mask(lambda d: d.line(pts, fill=255, width=w)); self.mat[m] = mat; self.sh[m] = s
    def px(self, pts, mat, s):
        for x, y in pts:
            if 0 <= x < S and 0 <= y < S: self.mat[y, x] = mat; self.sh[y, x] = s
    def orb(self, cx, cy, r, mat, f=0):
        """glowing core: rings of intensity, frame f shifts brightness (0 normal, 1 bright, 2 dim)"""
        boost = [0, 1, -1][f]
        for i, rr in enumerate([r, r - 1, int(r * 0.66), int(r * 0.33)]):
            if rr < 1: continue
            self.ell(cx - rr, cy - rr, cx + rr - 1, cy + rr - 1, mat, max(0, min(5, i + 1 + boost)), bevel=False)
        sx, sy = cx - max(1, r // 3) - 1, cy - max(1, r // 3) - 1
        self.px([(sx, sy)], mat, 5)
    def clear(self, m): self.mat[m] = ''
    def mirror(self):
        mat = self.mat; sh = self.sh
        if True:
            for x in range(HALF):
                xr = S - 1 - x
                mat[:, xr] = mat[:, x]
                col = sh[:, x].copy()
                dark = np.array([m not in GLOW and m != '' for m in mat[:, x]])
                col[dark] = np.maximum(col[dark] - 1, 0)
                sh[:, xr] = col
    def render(self):
        mat = self.mat; sh = self.sh
        im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); p = im.load()
        filled = mat != ''
        for y in range(S):
            for x in range(S):
                if filled[y, x]:
                    p[x, y] = H(RAMPS[mat[y, x]][0][sh[y, x]])
        # outline: hue-dark of neighbour material
        for y in range(S):
            for x in range(S):
                if filled[y, x]: continue
                for dx, dy in ((0,1),(1,0),(0,-1),(-1,0)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < S and 0 <= ny < S and filled[ny, nx]:
                        m = mat[ny, nx]
                        p[x, y] = H(RAMPS[m][1]) if m not in GLOW else H(RAMPS[m][0][0]); break
        return im

def damage(c, seed, breaches, ncracks=10):
    """post-process a Canvas: cracks, blown plates exposing hot interior, scorch."""
    r = random.Random(seed)
    solid = [(y, x) for y in range(S) for x in range(S) if c.mat[y, x] not in ('',) and c.mat[y, x] not in GLOW]
    for _ in range(ncracks):
        y, x = r.choice(solid)
        for _ in range(r.randint(4, 9)):
            if 0 <= y < S and 0 <= x < S and c.mat[y, x] not in ('',) and c.mat[y, x] not in GLOW:
                c.sh[y, x] = 0; c.mat[y, x] = 'gun' if r.random() < .5 else c.mat[y, x]
                if x + 1 < S and c.mat[y, x+1] not in GLOW and c.mat[y, x+1] != '': c.sh[y, x+1] = min(c.sh[y, x+1] + 2, 5)
            x += r.choice((-1, 0, 1)); y += r.choice((1, 1, -1, 0))
    for (bx, by, br) in breaches + [(r.randrange(20, 92), r.randrange(20, 92), 3) for _ in range(3)]:   # exposed hot interior
        for y in range(by - br, by + br + 1):
            for x in range(bx - br, bx + br + 1):
                d = math.hypot(x - bx, y - by) + r.random() * 1.2
                if 0 <= x < S and 0 <= y < S and c.mat[y, x] != '':
                    if d < br * 0.45: c.mat[y, x] = 'gfire'; c.sh[y, x] = 3 if d < br * 0.25 else 1
                    elif d < br * 0.75: c.mat[y, x] = 'gun'; c.sh[y, x] = 0; c.mat[y, x] = 'gun' if r.random() < .5 else c.mat[y, x]
                    elif d < br: c.sh[y, x] = max(c.sh[y, x] - 2, 0)
    # torn edge: knock out a few silhouette pixels
    for _ in range(14):
        y, x = r.choice(solid)
        if any(c.mat[y + dy, x + dx] == '' for dx, dy in ((0,1),(1,0),(0,-1),(-1,0)) if 0 <= x+dx < S and 0 <= y+dy < S):
            c.mat[y, x] = ''

def sparks(im, seed, n=12):
    r = random.Random(seed); p = im.load(); a = np.array(im)[:, :, 3]
    cols = [H('#fee761'), H('#ffffff'), H('#f77622')]
    ys, xs = np.nonzero(a)
    for _ in range(n):
        i = r.randrange(len(xs)); x, y = xs[i] + r.choice((-2, 2, -3, 3)), ys[i] + r.choice((-2, 2, -3))
        if 0 <= x < S and 0 <= y < S and a[y, x] == 0:
            p[x, y] = r.choice(cols)
            if r.random() < .5 and 0 <= x+1 < S and a[y, x+1] == 0: p[x+1, y] = cols[2]
    return im
