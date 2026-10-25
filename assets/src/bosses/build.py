import sys; sys.path.insert(0, '/home/claude/nc3/art/bosses')
from bosses import *
from PIL import Image, ImageDraw, ImageFont
import random
src = open('/home/claude/nc3/art/s32.py').read().split('r=random.Random(4)')[0]
ns = {}; exec(src, ns)
ship = ns['sprite'](ns['SHIPS'][0][2], 'steel')
OUT = '/home/claude/nc3/art/bosses/'
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', 30)
f2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 18)
f3 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', 15)
RH = 470; W = 40 + 336 + 30 + 336 + 30 + 3 * 224 + 2 * 8 + 30 + 300 + 40; Hh = 90 + 5 * RH
sh = Image.new('RGB', (W, Hh), (9, 10, 20)); d = ImageDraw.Draw(sh)
r = random.Random(7)
for _ in range(900):
    x, y = r.randrange(0, W // 3) * 3, r.randrange(0, Hh // 3) * 3
    d.rectangle([x, y, x + 2, y + 2], fill=r.choice([(32, 46, 55), (37, 58, 94), (90, 105, 136), (21, 29, 40)]))
d.text((40, 28), 'NEON COMET - BOSSI (112 px)', font=F, fill=(192, 203, 220))
d.text((620, 38), 'baza x3  |  avariat x3  |  animatie miez/motoare 3 cadre x2  |  scara in joc x2', font=f2, fill=(139, 155, 180))
for i, (name, concept, fn, br) in enumerate(BOSSES):
    y0 = 90 + i * RH
    base = make(i); dmg = make(i, 0, True); fr = [make(i, f) for f in range(3)]
    base.save(OUT + f'boss_{i+1}.png'); dmg.save(OUT + f'boss_{i+1}_damaged.png')
    strip = Image.new('RGBA', (336, 112), (0, 0, 0, 0))
    for k, im in enumerate(fr): strip.paste(im, (k * 112, 0))
    strip.save(OUT + f'boss_{i+1}_anim.png')
    d.text((40, y0 + 6), f'{i+1}. {name}  ({(i+1)*50}k)', font=F, fill=(254, 231, 97) if i == 4 else (192, 203, 220))
    d.text((40, y0 + 44), concept, font=f2, fill=(139, 155, 180))
    yy = y0 + 80
    x = 40; b3 = base.resize((336, 336), Image.NEAREST); sh.paste(b3, (x, yy), b3)
    x += 366; d3 = dmg.resize((336, 336), Image.NEAREST); sh.paste(d3, (x, yy), d3)
    d.text((x, yy + 340), 'avariat', font=f3, fill=(228, 59, 68))
    x += 366
    for k, im in enumerate(fr):
        i2 = im.resize((224, 224), Image.NEAREST); sh.paste(i2, (x + k * 232, yy + 56), i2)
        d.text((x + k * 232, yy + 284), f'cadru {k+1}', font=f3, fill=(90, 105, 136))
    x += 3 * 232 + 22
    # in-game scale patch: 150x168 art px, x2
    g = Image.new('RGB', (150, 168), (16, 20, 31)); gd = ImageDraw.Draw(g)
    for _ in range(40): gd.point((r.randrange(150), r.randrange(168)), fill=r.choice([(37, 58, 94), (90, 105, 136)]))
    g.paste(base, (19, 6), base); g.paste(ship, (59, 130), ship)
    g = g.resize((300, 336), Image.NEAREST); sh.paste(g, (x, yy))
    d.text((x, yy + 340), 'scara 1:1 vs VANATOR 32px', font=f3, fill=(90, 105, 136))
sh.save(OUT + 'bosses_sheet.png'); print(sh.size)
