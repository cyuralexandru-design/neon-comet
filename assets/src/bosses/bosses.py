import sys
sys.path.insert(0, '/home/claude/nc3/art/bosses')
from engine import *

def flame(c, x0, x1, ytop, base, f, mat='gfire', L=(6, 8, 5)):
    """upward exhaust (boss flies down). x0..x1 left-half coords; base = y of nozzle."""
    n = L[f]
    w = x1 - x0
    for i in range(n):
        y = base - 1 - i
        shrink = (i * w) // (2 * n + 1)
        a, b = x0 + shrink, x1 - shrink
        if b < a: break
        s = 4 if i < n * 0.35 else (3 if i < n * 0.6 else (2 if i < n * 0.85 else 1))
        c.rect(a, y, b, y, mat, s, bevel=False)
        if s >= 3 and b - a >= 2: c.px([(a, y), (b, y)], mat, s - 1)

# ---------------------------------------------------------------- 1 COLOS
def colos(c, f):
    flame(c, 28, 38, 0, 12, f, 'gred', L=(10, 12, 8))
    flame(c, 47, 56, 0, 10, f, 'gred', L=(10, 12, 8))
    c.rect(27, 10, 39, 18, 'gun', 2); c.rect(29, 11, 37, 13, 'gun', 1, bevel=False)
    c.rect(46, 8, 56, 18, 'gun', 2); c.rect(48, 9, 56, 11, 'gun', 1, bevel=False)
    # hull
    c.poly([(16, 18), (56, 16), (56, 106), (46, 104), (30, 90), (16, 74)], 'steel', 2)
    # sponsons
    c.poly([(1, 36), (14, 26), (26, 28), (26, 82), (12, 90), (1, 78)], 'steel', 1)
    c.poly([(4, 39), (15, 30), (22, 32), (22, 78), (12, 85), (4, 75)], 'steel', 3)
    c.rect(6, 42, 19, 46, 'steel', 2); c.rect(6, 64, 19, 68, 'steel', 2)
    c.line([(5, 74), (20, 60)], 'red', 2, 1); c.line([(5, 77), (20, 63)], 'red', 1, 1)
    c.rect(8, 50, 11, 60, 'gun', 1); c.px([(9, 52), (9, 55), (9, 58)], 'gred', 3)
    # upper deck
    c.poly([(26, 20), (56, 18), (56, 42), (30, 44), (26, 40)], 'steel', 3)
    c.poly([(44, 22), (56, 21), (56, 38), (44, 38)], 'steel', 4)
    c.rect(47, 32, 56, 34, 'gred', 2, bevel=False)
    c.rect(30, 24, 40, 27, 'steel', 2); c.rect(30, 31, 40, 34, 'steel', 2)
    # lower armour / prow
    c.poly([(30, 84), (56, 92), (56, 108), (46, 106), (32, 92)], 'steel', 3)
    c.poly([(40, 92), (56, 97), (56, 108), (46, 106)], 'steel', 4)
    c.line([(36, 90), (54, 96)], 'red', 2)
    # spine trench + core housing
    c.rect(51, 42, 56, 90, 'gun', 1)
    c.px([(53, 46), (53, 50), (53, 82), (53, 86)], 'gred', 3)
    c.ell(42, 52, 69, 79, 'gun', 2); c.ell(44, 54, 67, 77, 'gun', 0, bevel=False)
    c.orb(56, 66, 9, 'gred', f)
    # turrets
    c.ell(19, 43, 42, 66, 'gun', 0, bevel=False); c.ell(20, 44, 41, 65, 'gun', 2)
    c.rect(24, 58, 28, 86, 'gun', 0, bevel=False); c.rect(31, 58, 35, 86, 'gun', 0, bevel=False)
    c.rect(25, 58, 27, 85, 'steel', 3); c.rect(32, 58, 34, 85, 'steel', 3)
    c.rect(24, 79, 28, 82, 'red', 2); c.rect(31, 79, 35, 82, 'red', 2)
    c.ell(22, 46, 38, 62, 'steel', 3); c.line([(23, 57), (37, 57)], 'red', 2)
    c.px([(26, 85), (27, 85), (33, 85), (34, 85)], 'gred', 3 + (f == 1))
    c.ell(25, 48, 33, 55, 'steel', 4, bevel=False)
    c.px([(26, 49)], 'steel', 5)
    # vents on hull flank
    for y in (70, 74, 78): c.line([(31, y), (40, y + 4)], 'steel', 1)

# ---------------------------------------------------------------- 2 NUCLEU
def nucleu(c, f):
    # outer ring arcs (4 segments incl. mirror) with emitter pods
    ring = c._mask(lambda d: d.ellipse([3, 3, 108, 108], fill=255)) & ~c._mask(lambda d: d.ellipse([12, 12, 99, 99], fill=255))
    import numpy as np
    yy, xx = np.mgrid[0:S, 0:S]
    ang = np.degrees(np.arctan2(yy - 55.5, xx - 55.5)) % 360
    gaps = ((ang > 75) & (ang < 105)) | ((ang > 255) & (ang < 285)) | ((ang > 160) & (ang < 200))
    c.apply(ring & ~gaps, 'purple', 3)
    inner = c._mask(lambda d: d.ellipse([6, 6, 105, 105], fill=255)) & ~c._mask(lambda d: d.ellipse([8, 8, 103, 103], fill=255))
    m = ring & ~gaps & inner; c.mat[m] = 'purple'; c.sh[m] = 4
    # ring rune lights (chase per frame)
    for i, a in enumerate(range(115, 160, 9)):
        r = math.radians(a + 180)
        x, y = int(55.5 + 52 * math.cos(r)), int(55.5 + 52 * math.sin(r))
        c.px([(x, y)], 'gcyan', 4 if (i % 3) == f else 2)
    for i, a in enumerate(range(205, 250, 9)):
        r = math.radians(a + 180)
        x, y = int(55.5 + 52 * math.cos(r)), int(55.5 + 52 * math.sin(r))
        c.px([(x, y)], 'gcyan', 4 if (i % 3) == f else 2)
    # emitter pods at ring ends
    for (px_, py_) in ((10, 32), (10, 79), (40, 4), (40, 104)):
        c.ell(px_ - 6, py_ - 6, px_ + 6, py_ + 6, 'gun', 2)
        c.ell(px_ - 4, py_ - 4, px_ + 4, py_ + 4, 'purple', 3)
        c.orb(px_ + 1, py_ + 1, 3, 'gcyan', f)
    # inner track ring (second, counter-rotating) with light chase
    tr = c._mask(lambda d: d.ellipse([17, 17, 94, 94], fill=255)) & ~c._mask(lambda d: d.ellipse([22, 22, 89, 89], fill=255))
    tgaps = ((ang > 30) & (ang < 50)) | ((ang > 130) & (ang < 150)) | ((ang > 210) & (ang < 230)) | ((ang > 310) & (ang < 330))
    c.apply(tr & ~tgaps, 'gun', 2)
    for i, a in enumerate(range(150, 215, 6)):
        r = math.radians(a)
        c.px([(int(55.5 + 37 * math.cos(r)), int(55.5 + 37 * math.sin(r)))], 'gcyan', 4 if i % 3 == f else 1)
    # arms from core to ring
    c.poly([(12, 50), (40, 46), (40, 62), (12, 60)], 'gun', 3)
    c.poly([(30, 22), (44, 34), (36, 42), (24, 28)], 'gun', 3)
    c.poly([(24, 82), (38, 70), (44, 78), (30, 90)], 'gun', 3)
    c.line([(14, 55), (38, 55)], 'gcyan', 2)
    # hex core hull
    c.poly([(56, 28), (34, 40), (34, 72), (56, 84)], 'purple', 2)
    c.poly([(56, 32), (38, 42), (38, 56), (56, 56)], 'purple', 4)
    c.poly([(38, 58), (56, 58), (56, 80), (38, 70)], 'purple', 2)
    # core cage
    c.ell(42, 42, 69, 69, 'gun', 1); c.ell(44, 44, 67, 67, 'gun', 0, bevel=False)
    c.orb(56, 56, 10, 'gcyan', f)
    for (x, y) in ((44, 44), (43, 55), (44, 66)): c.rect(x - 2, y - 1, x + 1, y + 1, 'purple', 4)
    # top antenna + bottom emitter (weapon)
    c.poly([(52, 20), (56, 14), (56, 30), (52, 30)], 'purple', 3)
    c.px([(55, 15)], 'gcyan', 4)
    c.poly([(50, 84), (56, 84), (56, 98), (53, 98)], 'gun', 2)
    c.rect(54, 96, 56, 99, 'gcyan', 3 + (f == 1), bevel=False)

# ---------------------------------------------------------------- 3 LEVIATAN
def leviatan(c, f):
    # side engine nacelles exhaust
    flame(c, 12, 24, 0, 12, f, 'gfire', L=(11, 14, 9))
    flame(c, 47, 56, 0, 18, f, 'gfire', L=(8, 10, 6))
    # pylons
    c.poly([(22, 36), (44, 30), (44, 40), (22, 46)], 'sand', 2)
    c.poly([(22, 62), (44, 58), (44, 66), (22, 70)], 'sand', 1)
    # nacelles
    c.rect(10, 12, 26, 80, 'sand', 2)
    c.rect(13, 14, 22, 76, 'sand', 3)
    c.rect(11, 10, 25, 16, 'gun', 2); c.rect(13, 11, 23, 12, 'gun', 1, bevel=False)
    for y in range(22, 70, 8): c.rect(10, y, 26, y + 1, 'gun', 2)
    c.poly([(10, 80), (26, 80), (22, 90), (14, 90)], 'sand', 3)
    c.px([(18, 88), (18, 87)], 'gfire', 3)
    c.line([(16, 30), (16, 60)], 'gold', 3)
    # spine hull (long)
    c.poly([(44, 18), (56, 16), (56, 110), (52, 110), (40, 80)], 'sand', 2)
    c.poly([(46, 20), (56, 19), (56, 76), (44, 76)], 'sand', 3)
    c.rect(46, 16, 56, 20, 'gun', 2)
    # engine block
    c.rect(36, 18, 46, 30, 'sand', 1); c.rect(38, 20, 44, 28, 'gun', 1)
    c.px([(40, 22), (42, 22), (40, 25), (42, 25)], 'gfire', 2 + (f == 1))
    # reactor vents (weak points) on spine
    for i, y in enumerate((32, 46)):
        c.rect(48, y, 56, y + 8, 'gun', 0, bevel=False)
        for k in range(0, 8, 2): c.rect(49, y + k, 56, y + k, 'gfire', [2, 3, 1][(f + i) % 3], bevel=False)
    # bridge
    c.poly([(48, 60), (56, 58), (56, 72), (48, 70)], 'sand', 4)
    c.rect(51, 66, 56, 67, 'gcyan', 3, bevel=False)
    # ram prow (gold/bronze wedge)
    c.poly([(38, 76), (56, 78), (56, 111), (54, 111)], 'gold', 2)
    c.poly([(42, 80), (56, 82), (56, 104), (52, 100)], 'gold', 3)
    c.poly([(46, 84), (56, 86), (56, 96)], 'gold', 4)
    c.line([(40, 78), (55, 110)], 'gold', 4)
    c.orb(56, 80, 5, 'gfire', f)
    # side guns on pylons
    c.rect(30, 44, 33, 54, 'gun', 3); c.px([(31, 54)], 'gfire', 3)

# ---------------------------------------------------------------- 4 STUP (carrier)
def stup(c, f):
    flame(c, 19, 29, 0, 10, f, 'ggreen', L=(9, 11, 7))
    flame(c, 41, 51, 0, 10, f, 'ggreen', L=(9, 11, 7))
    c.rect(18, 8, 30, 16, 'gun', 2); c.rect(40, 8, 52, 16, 'gun', 2)
    # deck: broad slab
    c.poly([(4, 22), (56, 14), (56, 98), (16, 98), (4, 86)], 'jade', 1)
    c.poly([(6, 24), (56, 16), (56, 30), (6, 34)], 'jade', 3)
    c.poly([(20, 36), (56, 34), (56, 96), (20, 96)], 'jade', 2)
    # hangar bays on flank (3 per side) - recessed, lit, drone inside
    for i, y in enumerate((38, 56, 74)):
        c.rect(2, y, 18, y + 14, 'gun', 3)
        c.rect(4, y + 2, 16, y + 12, 'gun', 0, bevel=False)
        c.rect(4, y + 2, 16, y + 2, 'gun', 1, bevel=False)
        for k in range(4, 15, 3): c.px([(k, y + 12)], 'ggreen', 3 if (k // 3 + i + f) % 3 == 0 else 1)
        # drone silhouette inside bay
        dx, dy = 7, y + 4
        c.px([(dx + 2, dy), (dx + 1, dy + 1), (dx + 2, dy + 1), (dx + 3, dy + 1), (dx, dy + 2), (dx + 1, dy + 2),
              (dx + 2, dy + 2), (dx + 3, dy + 2), (dx + 4, dy + 2), (dx + 2, dy + 3)], 'steel', 2)
        c.px([(dx + 2, dy + 1)], 'ggreen', 3)
    # front launch bays (big doors facing down)
    c.rect(22, 84, 38, 102, 'gun', 3)
    c.rect(24, 86, 36, 100, 'gun', 0, bevel=False)
    for k in range(25, 36, 3): c.px([(k, 100)], 'ggreen', 3 if (k + f) % 2 else 1)
    c.line([(24, 86), (36, 86)], 'gun', 1)
    # armour plates on deck
    c.poly([(20, 36), (38, 36), (38, 58), (20, 58)], 'jade', 3)
    c.poly([(20, 60), (38, 60), (38, 82), (20, 82)], 'jade', 1)
    c.rect(22, 62, 36, 64, 'gun', 1, bevel=False)
    c.poly([(6, 24), (18, 22), (18, 36), (6, 36)], 'jade', 2)
    # deck stripes
    for y in range(40, 56, 5): c.line([(24, y), (34, y)], 'jade', 4)
    for y in range(68, 82, 5): c.line([(24, y), (34, y)], 'gun', 2)
    c.line([(40, 36), (40, 82)], 'jade', 1)
    # command island + core
    c.poly([(44, 22), (56, 20), (56, 48), (44, 48)], 'jade', 4)
    c.rect(46, 26, 56, 28, 'gcyan', 2, bevel=False)
    c.ell(42, 54, 69, 81, 'gun', 2); c.ell(44, 56, 67, 79, 'gun', 0, bevel=False)
    c.orb(56, 68, 9, 'ggreen', f)
    # nose
    c.poly([(40, 88), (56, 88), (56, 106), (48, 106)], 'jade', 3)
    c.rect(52, 100, 56, 104, 'gun', 1)

# ---------------------------------------------------------------- 5 IMPARAT (ultra)
def imparat(c, f):
    # energy wings: feathers of magenta/red light, gold spars
    feathers = [((48, 30), (2, 14), 6), ((46, 40), (1, 36), 6), ((44, 50), (4, 58), 5), ((44, 60), (10, 78), 5), ((44, 68), (20, 94), 4)]
    wing = [(48, 28), (2, 12), (3, 22), (0, 38), (6, 44), (3, 60), (11, 64), (10, 80), (20, 84), (22, 96), (44, 72)]
    c.poly(wing, 'gmag', 2, bevel=False)
    c.poly([(46, 31), (5, 15), (6, 23), (3, 37), (9, 43), (6, 58), (14, 62), (13, 78), (22, 82), (24, 91), (43, 69)], 'purple', 1, bevel=False)
    c.poly([(44, 36), (10, 22), (10, 36), (14, 44), (12, 56), (18, 62), (18, 74), (26, 80), (42, 64)], 'gmag', 0, bevel=False)
    for i, (a, b, w) in enumerate(feathers):
        c.line([a, b], 'gmag', 1, w)
        c.line([a, b], 'gmag', 2 + ((i + f) % 3 == 0), max(1, w - 3))
        c.line([(a[0], a[1] - 1), (b[0], b[1] - 1)], 'gred', 3, 1)
        c.px([b], 'gmag', 4)
    # gold wing spar
    c.poly([(48, 26), (6, 10), (4, 13), (46, 34)], 'gold', 3)
    c.line([(46, 27), (6, 11)], 'gold', 4)
    c.poly([(48, 36), (24, 60), (26, 62), (48, 44)], 'gold', 2)
    # wing-root cores (weak points)
    c.ell(30, 26, 43, 39, 'white', 2); c.orb(37, 33, 5, 'ggold', f)
    # main body: white blade
    c.poly([(56, 6), (44, 22), (40, 56), (46, 80), (56, 110)], 'white', 2)
    c.poly([(56, 10), (47, 24), (44, 52), (56, 52)], 'white', 4)
    c.poly([(44, 56), (56, 56), (56, 104), (48, 80)], 'white', 3)
    c.line([(56, 8), (44, 23)], 'gold', 4); c.line([(44, 23), (41, 54)], 'gold', 3)
    c.line([(41, 58), (47, 80)], 'gold', 3); c.line([(47, 80), (56, 106)], 'gold', 4)
    # crown at top (engine)
    c.poly([(46, 4), (50, 0), (52, 8)], 'gold', 4); c.poly([(52, 2), (56, 0), (56, 8)], 'gold', 3)
    flame(c, 50, 56, 0, 16, f, 'gred', L=(4, 6, 3))
    # dark armour plates
    c.poly([(48, 60), (56, 62), (56, 76), (50, 72)], 'gun', 2)
    c.poly([(50, 86), (56, 88), (56, 100)], 'gun', 3)
    # central core (main weak point)
    c.ell(43, 30, 70, 57, 'gold', 2); c.ell(45, 32, 68, 55, 'gun', 0, bevel=False)
    c.orb(56, 44, 9, 'gred', f)
    # lower weak point
    c.orb(56, 92, 4, 'ggold', f)
    # eye slit
    c.rect(51, 66, 56, 67, 'gred', 3 + (f == 1), bevel=False)

BOSSES = [
 ('COLOS', 'Dreadnought blindat cu doua turele grele si reactor rosu in burta', colos, [(40, 30, 6), (70, 78, 5), (56, 66, 4)]),
 ('NUCLEU', 'Tesator tehnologic: inel rupt cu emitatori si miez cyan instabil', nucleu, [(30, 50, 5), (82, 36, 4), (56, 56, 4)]),
 ('LEVIATAN', 'Crucisator lung cu prova-berbec de bronz si motoare laterale', leviatan, [(18, 40, 5), (60, 50, 5), (93, 64, 4)]),
 ('STUP', 'Portavion-roi: hangare laterale care lanseaza drone verzi', stup, [(30, 50, 5), (82, 74, 6), (56, 68, 4)]),
 ('IMPARAT', 'Boss final: aripi de energie, coroana de aur, trei miezuri slabe', imparat, [(37, 33, 4), (66, 70, 5), (56, 44, 4)]),
]

def make(i, f=0, dmg=False):
    name, concept, fn, br = BOSSES[i]
    c = Canvas(); fn(c, f); c.mirror()
    if dmg:
        cx, cy, cr = br[-1]
        rr = random.Random(i)
        # cracked core: jagged dark fissures + hot orange leaking out
        for k in range(3):
            x, y = cx, cy
            for _ in range(cr + 4):
                if c.mat[y, x] != '': c.mat[y, x] = 'gun'; c.sh[y, x] = 0
                x += rr.choice((-1, 0, 1)) + (1 if k == 0 else -1 if k == 1 else 0); y += rr.choice((-1, 1)) if k < 2 else 1
        damage(c, 100 + i, [(x0, y0, r0 + 2) for x0, y0, r0 in br[:-1]], ncracks=16)
        im = c.render(); sparks(im, 200 + i, 16); return im
    return c.render()
