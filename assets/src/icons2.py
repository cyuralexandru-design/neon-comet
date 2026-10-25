# Procedural/hand-authored 24x24 full-width icons for Neon Comet (v2).
# Every icon returns 24 strings of 24 chars using palette keys; '.' = transparent.
import math
EXTRA={'R':'#ff0044','A':'#feae34','a':'#d77643','e':'#ead4aa','h':'#193c3e','j':'#265c42',
       'Z':'#c65197','z':'#7a367b','y':'#a23e8c','q':'#402751','s':'#3e2731','u':'#151d28',
       'S':'#ffffff','U':'#888888'}
# tier: S=highlight, T=bright, t=dark
TIERX=[('#b6f08f','#63c74d','#265c42'),('#a8f8ff','#2ce8f5','#0099db'),('#f0a0d8','#c65197','#7a367b'),
       ('#fff6c0','#fee761','#d77643'),('#ffb0a0','#ff4a5a','#a22633')]
N=24
class C:
    def __init__(s): s.g=[['.']*N for _ in range(N)]
    def set(s,x,y,c):
        if 0<=x<N and 0<=y<N: s.g[y][x]=c
    def get(s,x,y): return s.g[y][x] if 0<=x<N and 0<=y<N else '.'
    def rect(s,x0,y0,x1,y1,c):
        for y in range(y0,y1+1):
            for x in range(x0,x1+1): s.set(x,y,c)
    def hline(s,x0,x1,y,c): s.rect(x0,y,x1,y,c)
    def vline(s,x,y0,y1,c): s.rect(x,y0,x,y1,c)
    def disc(s,cx,cy,r,f):  # f(dx,dy,dist)->char
        for y in range(N):
            for x in range(N):
                dx,dy=x+.5-cx,y+.5-cy; d=math.hypot(dx,dy)
                if d<=r:
                    c=f(dx,dy,d)
                    if c: s.set(x,y,c)
    def poly(s,pts,f):
        for y in range(N):
            for x in range(N):
                if inside(x+.5,y+.5,pts):
                    c=f(x,y) if callable(f) else f
                    if c: s.set(x,y,c)
    def line(s,x0,y0,x1,y1,c):
        n=max(abs(x1-x0),abs(y1-y0))
        for i in range(n+1):
            s.set(round(x0+(x1-x0)*i/n),round(y0+(y1-y0)*i/n),c)
    def outline(s,col='o',skip=''):
        add=[]
        for y in range(N):
            for x in range(N):
                if s.g[y][x]=='.':
                    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        v=s.get(x+dx,y+dy)
                        if v not in '.o' and v not in skip: add.append((x,y)); break
        for x,y in add: s.g[y][x]=col
        return s
    def text(s,x,y,glyph,c):
        for j,r in enumerate(glyph):
            for i,ch in enumerate(r):
                if ch=='#': s.set(x+i,y+j,c)
    def rows(s): return [''.join(r) for r in s.g]
def inside(x,y,pts):
    c=False; n=len(pts)
    for i in range(n):
        x1,y1=pts[i]; x2,y2=pts[(i+1)%n]
        if (y1>y)!=(y2>y) and x<(x2-x1)*(y-y1)/(y2-y1)+x1: c=not c
    return c
def lit(dx,dy,d,r):  # 0..1 brightness, light from upper-left with some depth
    nz=math.sqrt(max(0,r*r-d*d))/r
    L=(-.55,-.6,.58)
    return max(0,(dx/r)*L[0]+(dy/r)*L[1]+nz*L[2])
def ramp(v,chars):
    i=min(len(chars)-1,int(v*len(chars)))
    return chars[i]

# ---------------- CONSUMABLES ----------------
def mine():
    s=C(); cx=cy=12
    # 8 spikes (prongs) - drawn first, body overwrites base
    for k in range(8):
        a=k*math.pi/4
        for t in range(7,11):
            x=cx-.5+math.cos(a)*t; y=cy-.5+math.sin(a)*t
            ch='l' if t<10 else 'L'
            if k in (3,4,5,2) and t<10: ch='M'
            s.set(round(x),round(y),ch)
        # glowing tip
        s.set(round(cx-.5+math.cos(a)*10.6),round(cy-.5+math.sin(a)*10.6),'X' if k%2 else 'F')
    # body sphere
    s.disc(cx,cy,7.2,lambda dx,dy,d: ramp(lit(dx,dy,d,7.2),'dmMlL'))
    # equator band
    for x in range(5,19):
        if s.get(x,12) not in '.': s.set(x,12,'m' if x>12 else 'M')
    # rivets on band
    for x in (6,9,15,18): s.set(x,12,'L' if x<12 else 'l')
    # glowing core window
    s.disc(cx,cy,3.6,lambda dx,dy,d: 'x' if d>3.0 else ('X' if d>2.0 else ('F' if d>1.1 else 'Y')))
    s.set(11,11,'W')
    s.outline()
    # blinking light on top (outside after outline) + specular
    s.set(8,7,'W')
    return s.rows()

def shield_bubble():
    s=C(); cx=cy=12; R=10.6
    def f(dx,dy,d):
        if d>R-1.2: return 'C' if (dx+dy)<0 else 'c'
        if d>R-2.2: return 'c' if (dx+dy)<2 else 'b'
        return 'u'
    s.disc(cx,cy,R,f)
    # hex grid dots inside
    for y in range(3,22,3):
        for x in range(3+((y//3)%2)*2,22,4):
            if math.hypot(x+.5-cx,y+.5-cy)<R-2.8: s.set(x,y,'b')
    # shield emblem
    sh=[(7,6),(17,6),(17,13),(12,19),(7,13)]
    s.poly(sh,lambda x,y: 'L' if x<12 else 'l')
    s.poly([(9,8),(15,8),(15,13),(12,16),(9,13)],lambda x,y: 'C' if x<12 else 'c')
    s.set(10,9,'W'); s.set(11,9,'W'); s.set(10,10,'W')
    # emblem outline
    for (x,y) in [(x,y) for y in range(N) for x in range(N)]:
        pass
    edge=[]
    for y in range(5,21):
        for x in range(6,19):
            if s.get(x,y) in 'u b'.replace(' ','') and any(s.get(x+a,y+b) in 'Ll' for a,b in ((1,0),(-1,0),(0,1),(0,-1))): edge.append((x,y))
    for x,y in edge: s.set(x,y,'o')
    # bubble specular arc
    for a in range(200,250,6):
        r=R-3.4; s.set(round(cx-.5+math.cos(math.radians(a))*r),round(cy-.5+math.sin(math.radians(a))*r),'W')
    s.outline()
    return s.rows()

def magnet():
    s=C(); cx,cy=12,12.5; Ro,Ri=10,4.2
    # U: legs from y=2..12, bottom half annulus
    def body(x,y):
        dx,dy=x+.5-cx,y+.5-cy
        if dy<=0: return (Ri<=abs(dx)<=Ro) and y>=2
        return Ri<=math.hypot(dx,dy)<=Ro
    for y in range(N):
        for x in range(N):
            if body(x,y):
                dx,dy=x+.5-cx,y+.5-cy
                if y<=5: c='L'
                else: c='X'
                # shading across thickness: outer-left & inner-right lit
                if dy<=0:
                    pos=(abs(dx)-Ri)/(Ro-Ri)
                    if dx<0: c2 = 0 if pos>.75 else (1 if pos>.35 else 2)
                    else: c2 = 0 if pos<.2 else (1 if pos<.6 else 2)
                else:
                    ang=math.atan2(dy,dx); pos=(math.hypot(dx,dy)-Ri)/(Ro-Ri)
                    # light upper-left: outer rim on left lit, bottom dark
                    lv=(-math.cos(ang)*.6-math.sin(ang)*.4)*pos+(0.25 if pos<.3 else 0)
                    c2=0 if lv>.35 else (1 if lv>-.1 else 2)
                if y<=5: c='LlM'[c2] if y>2 else 'WLl'[c2]
                else: c='QXx'[c2]
                s.set(x,y,c)
    # dividing line between tip and body
    for x in range(N):
        if s.get(x,6) in 'QXx': s.set(x,6,'x' if s.get(x,6)!='x' else 'p')
    s.outline()
    # sparks between the tips
    for (x,y,c) in [(11,2,'C'),(12,4,'W'),(11,5,'C'),(12,1,'C'),(10,7,'Y'),(13,8,'Y')]: s.set(x,y,c)
    return s.rows()

DIG={'x':["#...#",".#.#.","..#..",".#.#.","#...#"],'2':["###","..#","###","#..","###"]}
def gem(s,ox,oy,w):  # faceted gem, w=half width
    # top crown trapezoid + bottom pavilion triangle
    top=[(ox-w+2,oy),(ox+w-2,oy),(ox+w,oy+3),(ox-w,oy+3)]
    bot=[(ox-w,oy+3),(ox+w,oy+3),(ox,oy+3+w+1)]
    def ft(x,y):
        rx=x+.5-ox
        if y<oy+1: return 'W' if rx<0 else 'C'
        return 'C' if rx<-w/3 else ('W' if rx<w/3-1 else 'c')
    def fb(x,y):
        rx=x+.5-ox
        return 'C' if rx<-w/2 else ('c' if rx<0 else ('b' if rx<w/2 else 'b'))
    s.poly(top,ft); s.poly(bot,fb)
    for x in range(ox-w,ox+w):
        if s.get(x,oy+3)!='.': s.set(x,oy+3,'C' if x<ox else 'c')

def crystals_x2():
    s=C()
    gem(s,9,3,8)
    s.outline()
    # x2 digits bottom right with outline
    t=C(); t.text(11,15,DIG['x'],'L'); t.text(17,15,['####','...#','####','#...','####'],'Y')
    # shade digits: bottom row orange
    for y in range(N):
        for x in range(N):
            if t.g[y][x]=='Y' and y>=18: t.g[y][x]='A'
    t.outline()
    for y in range(N):
        for x in range(N):
            if t.g[y][x]!='.': s.g[y][x]=t.g[y][x]
    # sparkles
    for (x,y,c) in [(20,2,'W'),(19,3,'C'),(21,3,'C'),(20,4,'C'),(2,17,'C')]: s.set(x,y,c)
    return s.rows()

def repair():
    s=C()
    for i in range(-9,10):
        x=12+i; y=11-i
        s.set(x,y,'L'); s.set(x+1,y,'l'); s.set(x+1,y+1,'M')
    s.disc(20.5,3.5,3.3,lambda dx,dy,d: 'L' if dx+dy<0 else 'l')
    s.disc(3.5,20.5,3.3,lambda dx,dy,d: 'L' if dx+dy<0 else 'l')
    for (x,y) in [(21,2),(22,1),(23,0),(21,1),(22,2),(20,1),(22,3)]: s.set(x,y,'.')
    for (x,y) in [(2,21),(1,22),(0,23),(1,21),(2,22),(3,22),(1,20)]: s.set(x,y,'.')
    s.outline()
    A,B=9,14; P,Q=4,19
    for y in range(P,Q+1):
        for x in range(P,Q+1):
            if A<=x<=B or A<=y<=B:
                c='G'
                top = y==P or (y==A and not A<x<B) 
                left= x==P or (x==A and not A<y<B)
                bot = y==Q or (y==B and not A<x<B)
                right=x==Q or (x==B and not A<y<B)
                if bot or right: c='g'
                if top or left: c='W' if not (bot or right) else 'G'
                s.set(x,y,c)
    for y in range(N):
        for x in range(N):
            if s.get(x,y) not in 'WGg' and any(s.get(x+a,y+b) in 'WGg' for a,b in ((1,0),(-1,0),(0,1),(0,-1))): s.set(x,y,'o')
    s.set(11,11,'W'); s.set(12,11,'S'); s.set(11,12,'W')
    s.outline()
    return s.rows()

# ---------------- PICKUPS ----------------
def star():
    s=C(); cx,cy=12,12.8; Ro,Ri=11.6,4.8
    pts=[]
    for k in range(10):
        a=-math.pi/2+k*math.pi/5; r=Ro if k%2==0 else Ri
        pts.append((cx+math.cos(a)*r,cy+math.sin(a)*r))
    def f(x,y):
        px,py=x+.5-cx,y+.5-cy
        a=(math.atan2(py,px)+math.pi/2)%(2*math.pi)
        seg=int(a/(math.pi/5))%10
        (x1,y1),(x2,y2)=pts[seg],pts[(seg+1)%10]
        nx,ny=(y2-y1),-(x2-x1); l=math.hypot(nx,ny); nx/=l; ny/=l
        if nx*(x1-cx)+ny*(y1-cy)<0: nx,ny=-nx,-ny
        v=-(nx*.6+ny*.8)
        return 'Y' if v>.25 else ('Y' if v>-.2 else ('A' if v>-.75 else 'a'))
    s.poly(pts,f)
    s.outline()
    for (x,y) in [(12,3),(12,4),(11,6),(11,7),(10,9),(10,10),(9,11)]:
        if s.get(x,y) in 'YA': s.set(x,y,'W')
    return s.rows()

def crystal_pickup():
    s=C(); gem(s,12,5,9); s.outline()
    for (x,y,c) in [(3,3,'W'),(21,16,'C'),(4,18,'C')]: s.set(x,y,c)
    return s.rows()

# ---------------- WEAPON: missile launcher ----------------
def launcher():
    s=C()
    tubes=[(5,8),(10,13),(15,18)]
    for i,(a,b) in enumerate(tubes):
        top=6 if i!=1 else 4
        # missile head poking out
        mx=(a+b)/2
        s.rect(a+1,top-3,b-1,top-1,'X'); s.set(a+1,top-3,'Q'); s.set(b-1,top-1,'x'); s.set(b-1,top-2,'x')
        s.rect(a+1,top-4,b-1,top-4,'.'); s.set(a+1,top-4,'Q') ; s.set(b-1,top-4,'X')
        s.rect(a+1,top-5,b-1,top-5,'.'); s.set(int(mx),top-5,'W') if False else None
        # tube
        s.rect(a,top,b,15,'M'); s.vline(a,top,15,'L'); s.vline(a+1,top,15,'l'); s.vline(b,top,15,'m')
        s.hline(a,b,top,'L'); s.hline(a+1,b-1,top+1,'d')  # muzzle opening
        s.hline(a,b,top+5,'d'); s.hline(a,b,top+6,'l')   # band
    # base housing
    s.rect(3,14,20,19,'M'); s.hline(3,20,14,'L'); s.vline(3,14,19,'L'); s.vline(4,15,19,'l'); s.vline(20,14,19,'m'); s.hline(3,20,19,'m')
    for x in (6,9,12,15,18): s.set(x-1,16,'X' if x!=18 else 'x'); s.set(x-1,17,'x')
    s.hline(5,18,18,'d')
    # stem like other weapons
    s.rect(9,20,14,20,'d'); s.rect(10,21,13,21,'M'); s.rect(10,22,13,22,'d')
    s.outline()
    return s.rows()

# ---------------- CHESTS ----------------
def chest(t):
    s=C()
    x0,x1=1,22; ly0,ly1=4,8; by0,by1=10,20
    # lid: flat trapezoid
    s.poly([(x0+2,ly0),(x1+1-2,ly0),(x1+1,ly1+1),(x0,ly1+1)],'M')
    s.hline(x0+2,x1-2,ly0,'L'); s.hline(x0+1,x1-1,ly0+1,'l')
    for y in range(ly0,ly1+1):
        for x in range(N):
            if s.get(x,y)=='M' and s.get(x-1,y)=='.': s.set(x,y,'L')
            if s.get(x,y)=='M' and s.get(x+1,y)=='.': s.set(x,y,'m')
    s.hline(x0,x1,ly1,'m')
    # energy seam
    s.hline(x0,x1,9,'T'); s.hline(x0,x0+2,9,'t'); s.hline(x1-2,x1,9,'t')
    # body
    s.rect(x0,by0,x1,by1,'M')
    s.vline(x0,by0,by1,'L'); s.vline(x1,by0,by1,'d'); s.hline(x0,x1,by1,'d'); s.hline(x0+1,x1-1,by0,'l')
    # corner struts (straight)
    for xs in (x0+1,x1-3):
        s.rect(xs,by0,xs+2,by1-1,'m'); s.vline(xs,by0,by1-1,'l')
        s.set(xs+1,by0+1,'L'); s.set(xs+1,by1-2,'L')
    for xs in (x0+1,x1-3):
        s.rect(xs,ly0+2,xs+2,ly1-1,'m'); s.vline(xs,ly0+2,ly1-1,'l')
    # panel grooves
    s.hline(x0+4,x1-4,by0+5,'m'); s.hline(x0+4,x1-4,by0+6,'l')
    # lock panel
    s.rect(9,7,14,14,'d'); s.rect(10,8,13,13,'u')
    s.rect(10,9,13,10,'T'); s.set(10,9,'S'); s.hline(10,13,12,'t')
    s.set(11,12,'T')
    if t>=1:  # tier glow strips on panel faces
        s.hline(x0+5,x0+7,by0+3,'T'); s.hline(x1-7,x1-5,by0+3,'T')
        s.hline(x0+5,x0+7,by1-2,'t'); s.hline(x1-7,x1-5,by1-2,'t')
    if t>=2:  # glowing vertical seams in struts + lid vents
        for xs in (x0+2,x1-2): s.vline(xs,by0+1,by1-2,'T'); s.set(xs,by0+1,'S')
        for x in range(x0+5,x1-4,2):
            if not 9<=x<=14: s.set(x,ly0+3,'d'); s.set(x,ly0+4,'t')
    if t>=3:  # gold-trimmed edges & corners
        for (x,y) in [(x0,by0),(x1,by0),(x0,by1),(x1,by1),(x0+2,ly0),(x1-2,ly0)]: s.set(x,y,'A')
        s.hline(x0+3,x1-3,ly0,'Y' if t==3 else 'S'); s.hline(x0+1,x0+3,by1,'A'); s.hline(x1-3,x1-1,by1,'a')
        s.hline(x0+1,x0+3,by0,'Y'); s.hline(x1-3,x1-1,by0,'A')
        s.rect(10,9,13,10,'T'); s.set(10,9,'S'); s.set(11,9,'S')
    if t>=4:  # beacon antennas + power cells
        s.vline(x0+3,1,3,'l'); s.set(x0+3,0,'T'); s.vline(x1-3,1,3,'m'); s.set(x1-3,0,'T')
        s.hline(x0+5,x0+7,by0+3,'S'); s.hline(x1-7,x1-5,by0+3,'S')
        s.rect(x0+5,by0+7,x0+7,by0+8,'t'); s.rect(x1-7,by0+7,x1-5,by0+8,'t'); s.set(x0+5,by0+7,'T'); s.set(x1-7,by0+7,'T')
    s.outline()
    return s.rows()

NEW={'k_mine':mine,'k_shield':shield_bubble,'k_magnet':magnet,'k_x2':crystals_x2,'k_heal':repair,
     'p_star':star,'p_crystal':crystal_pickup,'missile':launcher}

def equip_tweaks(I):
    a=list(I['e_armor'])
    a[3]="...oLlMMMMMM"; a[4]="...oLlMMMMoo"; a[5]="...oLlMMMoCC"; a[6]="...oLlMMoCWC"
    a[7]="...oLlMMoCCc"; a[8]="....oLlMMocc"; a[9]="....oLlMMMoo"; a[1]="...oWLLLLLLL"
    I['e_armor']=a
    g=list(I['e_gen']); g[2]=".....ocCWWcc"; g[9]="...oLlMCMYMC"; I['e_gen']=g
    c=list(I['e_core']); c[7]=".oLlMoGWWGGG"; I['e_core']=c
    b=list(I['e_boost'])
    b[10]="...oLmmMoooo"; b[11]="......ooFYYY"; b[12]=".......oFYWW"; b[13]="........oFYY"; b[14]=".........oFF"
    b.append("..........of")
    I['e_boost']=b
