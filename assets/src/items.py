from PIL import Image, ImageDraw, ImageFont
import random, importlib.util
def H(h): return (int(h[1:3],16),int(h[3:5],16),int(h[5:7],16),255)
PAL={'o':'#181425','d':'#262b44','m':'#3a4466','M':'#5a6988','l':'#8b9bb4','L':'#c0cbdc','W':'#ffffff',
'b':'#124e89','c':'#0099db','C':'#2ce8f5','G':'#63c74d','g':'#3e8948','F':'#f77622','f':'#be4a2f','Y':'#fee761',
'X':'#e43b44','x':'#a22633','P':'#b55088','p':'#68386c','Q':'#f6757a','V':'#a68cff','v':'#6a4ac0',
'N':'#b86f50','n':'#733e39','k':'#3e2731','T':'#ffffff','t':'#888888'}
SH={'W':'L','L':'l','l':'M','M':'m','m':'d','C':'c','c':'b','G':'g','Y':'F','F':'f','X':'x','Q':'P','P':'p','V':'v','N':'n','n':'k','T':'t'}
DARK=dict(m='#262b44',d='#181425',M='#3a4466',l='#5a6988',L='#8b9bb4')
PURP=dict(L='#c9a8db',l='#9068ad',M='#634080',m='#3f2850',d='#22162a')
TIERC=[('#63c74d','#265c42'),('#2ce8f5','#0099db'),('#c65197','#7a367b'),('#fee761','#feae34'),('#ff6b6b','#a22633')]
I={}
I['laser']=["............","..........oo",".........oCC",".........oCW",".........oLl",".........oLl",".........oLl","........ooLl",".......oLLlC",".......oLlMC","......oLlMMc","......oLlMMM",".....oLlMMMM",".....oLlMCCM",".....oLlMCWM",".....oLlMCCM",".....oLlMMMM","......oLmmmm","......odddoo",".......oddo.",".......oMMo.",".......oddo.","........oo..","............"]
I['plasma']=["............","........oooo",".......ogGGG","......ogGYYY","......ogGYWW","......ogGGYY",".......ogGGG","........oooo",".........oLl",".......ooLlM","......oLLlMM",".....oLlMMMM",".....oLlGGMM",".....oLlMMMM",".....oLlGGMM",".....oLlMMMM",".....oLlmmmm","......odddoo",".......oMMo.",".......oddo.","........oo.."]
I['missile']=["............","...o....o...","..oXo..oXo..","..oXo..oXo..","..oLo..oLo..","..oLo..oLo..","..oLo..oLo..","..oLo..oLo..","oooooooooooo","oLLLLLLLLLLL","oLllllllllll","oLlMMMMMMMMM","oLlMoMoMoMoM","oLlMMMMMMMMM","oLlmmmmmmmmm","oddddddddddd",".ooooooooooo"]
I['rail']=["........oo..","........oLo.","........oLoV","........oLov","........oLoV","........oLoW","........oLoV","........oLov","........oLoV",".......ooLoo","......oLLlll",".....oLlMMMM",".....oLlVVMM",".....oLlMMMM",".....oLlVVMM",".....oLlmmmm","......odddoo",".......oMMo.",".......oddo.","........oo.."]
I['flame']=["............",".......ooooo","......oFYYYY","......oFfFFF",".......ooooo","........oLll","........oLlM",".......ooLlM","......oNNNNN",".....oNnNNNN",".....oNnNNNN",".....oNnNNNN",".....oNnnnnn",".....oNnNNNN",".....oNnNNNN",".....okkkkkk","......oooooo",".......oMMo.",".......oddo.","........oo.."]
I['t_pulse']=["........oooo","......ooLLLL",".....oLLllll","....oLlllMMM","oo..oLlMMMMM","ooooLlMMoooo","...oLlMoCCCC","...oLlMoCWCC","...oLlMoCCCC","...oLlMMoooo","ooooLlMMMMMM","oo..oLmmMMMM",".....ommmmmm","......oodddd","........oooo"]
I['t_missile']=["...........o","..........oX","..........oX","..........oL",".........ooL","........oLLl",".......oLllM","......oLlMMM",".....oLlMMMM","....oLlMMoFF","...oLlMMMoYF","..oLlMMMMMoo",".oLlMMMMMMMM","oLlmmmmmmmmm","oddddddddddd",".ooooooooooo"]
I['t_arc']=["..........oo","........ooLL","......ooLlll","V....oLllMMM","....oLlMMoVV","....oLlMoVWW","....oLlMoVVV",".V..oLlMMoVV",".....oLlMMoo",".....oLlMMMM","......oLmmmm",".......ooddd",".........ooo"]
I['c_wing']=["...........o","..........oL","..........oL",".........oLl",".........oLC",".........oLW","........oLlM","....oo..oLlM","...oLlooLlMM","...oLlLLlMMM","..oLlMMMMMMM",".oLlMMMMMmmM","oLlMMmmmmmmM","oXmmmddddmMM",".oooooooodmM",".........odm","..........oF","...........Y"]
I['c_orb']=["........oooo","......ooLLLL",".....oLLWWll","....oLLWLlll","....oLLLllll","oCCCCCCCCCCC",".ooLllllMMMM","....oLllMMMM","....oLlMMMMm",".....oMMmmmm","......oommmm","........oooo"]
I['c_guard']=["...........o","..........oL",".........oLl","........oLlM",".......oLlMM","......oLlMoo",".....oLlMoGG","....oLlMoGWG",".....oLlMoGG","......oLlMoo",".......oLlMM","........oLlM",".........oLm","..........om","...........o"]
I['e_armor']=["....oooooooo","...oLLLLLLLL","...oLlllllll","...oLlMMMMMM","...oLlMdMMMM","...oLlMMMMMM","...oLlMMMMMM","...oLlMMMMMM","....oLlMMMMM","....oLlMMMMM",".....oLlMMMM","......oLlMMM",".......oLlMM","........oLlM",".........oLm","..........oo"]
I['e_gen']=["........oooo","......oocccc",".....ocCWccc","....ocCWcccc","....ocCcccbb","...ocCccccbb","...oLLLLLLLL","...oLlllllll","...oLlMMMMMM","...oLlMCMCMC","...oLlMMMMMM","...oLmmmmmmm","...odddddddd","....oooooooo"]
I['e_core']=["....o.o.o.o.","....o.o.o.o.","..oooooooooo",".oLLLLLLLLLL","ooLlMMMMMMMM",".oLlMooooooo","ooLlMoGGGGGG",".oLlMoGWGGGG","ooLlMoGGGGGG",".oLlMooooooo",".oLlMMMMMMMM",".odddddddddd","..oooooooooo","....o.o.o.o.","....o.o.o.o."]
I['e_boost']=["......oooooo",".....oLLLLLL",".....oLlllll",".....oLlMMMM",".....oLlMMMM","....ooLlMmmm","...oLLlMMMMM","...oLlMMoooo","...oLlModddd","...oLlModddd","...oLmmMoooo",".......oFYYY","........fFFF",".........fFF","..........ff"]
I['k_bomb']=["...........Y","...........F","..........oo",".........oMM",".......oommm",".....oommmmm","....omLLmmmm","...omLWLmmmm","...omLLmmmmm","..ommmmmmmmm","..ommmmmmmmm","..ommmmmmmmd","..ommmmmmmdd","...ommmmmddd","...ommmmdddd","....oodddddd","......oooddd",".........ooo"]
I['k_shield']=["........oooo","......oocccc",".....ocCCccc","....ocCWCccc","....ocCCcccc","...occcccccc","...occcoLLLL","...occcoLlll","...occcoLllM","...occccoLlM","....occccoLM","....occcccoo",".....occcccc","......oocccc","........oooo"]
I['k_magnet']=["..ooooo.....","..oLLLo.....","..oLlLo.....","..ooooo.....","..oXXxo.....","..oXXxo.....","..oXXxo.....","..oXXxo.....","..oXXxoooooo","..oXXXxxxxxx","...oXXxxxxxx","....oxxxxxxx",".....ooooooo"]
I['k_x2']=["..........oo","...Y.....oCW","........oCCW",".......oCCcW","......oCCccC",".Y...oCCcccC","....oCCccccC","....oooooooo","....obbccccc",".....obbcccc","......obbccc",".......obbcc","........obbc",".........obb","..........oo"]
I['k_heal']=["...ooooooooo","...oLLLLLLLL","...oLlllllll","...oLlllllll","...oLlllllgG","...oLlllllgG","...oLllggggG","...oLllgGGGG","...oLllgGGGG","...oLlllllgG","...oLlllllgG","...oLlllllll","...oMmmmmmmm","...ooooooooo"]
I['chest']=["...ooooooooo","..oTTNNNNNNN","..oTtNNNNNNN",".oTtnnnnnnnn",".oTtnnnnnoTT","ooooooooooTY","oTTNNNNNNoTY","oTtNNNNNNNoT","oTtnnnnnnnnn","oTtNNNNNNNNN","oTtnnnnnnnnn","oTtNNNNNNNNN","oTtkkkkkkkkk","oooooooooooo"]
I['p_star']=["...........o","..........oY","..........oY",".........oYY","...ooooooYYW","...oFYYYYYYY","....oFYYYYYY",".....oFYYYYY","......oFYYYY",".......oFYYY","......oFYYYY","......oFYYFF",".....oFYFoof",".....oFoo...","....oFo.....","....oo......"]
I['p_capsule']=["........oooo","......ooFFFF",".....oFYYYYY","....oFYYoooo","....oFYoLWWW","...oFYoLWWWW","...oFYoLWWWW","...oFYoLLWWW","....oFYoLLLL","....oFYYoooo",".....oFYYYYY","......ooFFFF","........oooo"]
def icon(rows,over=None,tier=None,size=24):
    pal=dict(PAL); 
    if over: pal.update(over)
    if tier is not None: pal['T'],pal['t']=TIERC[tier]
    im=Image.new('RGBA',(size,size),(0,0,0,0)); px=im.load()
    top=(size-len(rows))//2
    for y,r in enumerate(rows):
        full=list(r)+[SH.get(c,c) for c in reversed(r)]
        for x,ch in enumerate(full):
            if ch!='.': px[x,y+top]=H(pal[ch])
    return im
spec=importlib.util.spec_from_file_location('s32','s32.py')
src=open('s32.py').read().split('r=random.Random(4)')[0]
ns={}; exec(src,ns)
ships=[ns['sprite'](rows,metal) for name,metal,rows in ns['SHIPS']]
shipnames=[n for n,_,_ in ns['SHIPS']]
TC=[H(a) for a,b in TIERC]; TN=['COMMON','RARE','EPIC','LEGENDARY','ULTRA']
CELL=132; GAP=14
def frame(d,x0,y0,t,cell=CELL):
    c=TC[t][:3]; bg=tuple(int(v*0.12+b) for v,b in zip(c,(14,15,26)))
    d.rectangle([x0,y0,x0+cell,y0+cell],fill=bg,outline=c,width=3)
    if t>=1:
        for (ax,ay,bx,by) in [(x0,y0+9,x0+9,y0),(x0+cell-9,y0,x0+cell,y0+9),(x0,y0+cell-9,x0+9,y0+cell),(x0+cell-9,y0+cell,x0+cell,y0+cell-9)]:
            d.polygon([(ax,ay),(bx,by),(min(ax,bx) if ax<x0+5 or bx<x0+5 else max(ax,bx), min(ay,by) if ay<y0+5 or by<y0+5 else max(ay,by))],fill=(9,10,20)); d.line([(ax,ay),(bx,by)],fill=c,width=3)
    if t>=2: d.rectangle([x0+6,y0+6,x0+cell-6,y0+cell-6],outline=tuple(int(v*0.55) for v in c),width=2)
    if t>=3:
        for px,py in [(x0+cell//2,y0),(x0+cell//2,y0+cell)]: d.polygon([(px-8,py),(px,py-8),(px+8,py),(px,py+8)],fill=c,outline=(9,10,20))
    if t>=4:
        for px,py in [(x0,y0),(x0+cell,y0),(x0,y0+cell),(x0+cell,y0+cell)]: d.polygon([(px-7,py),(px,py-11),(px+7,py),(px,py+11)],fill=(254,174,52))
    n=t+1
    for k in range(n):
        px=x0+cell//2-(n-1)*8+k*16; py=y0+cell-13; d.polygon([(px-5,py),(px,py-6),(px+5,py),(px,py+6)],fill=c,outline=(9,10,20))
SECT=[('NAVE',[(s,shipnames[i],[0,1,2,3][i],'ship') for i,s in enumerate(ships)]),
('ARME',[(icon(I['laser']),'Laser',0,0),(icon(I['plasma']),'Plasma',1,0),(icon(I['missile']),'Rachete',2,0),(icon(I['rail']),'Railgun',3,0),(icon(I['flame']),'Aruncator flacari',4,0)]),
('TURELE',[(icon(I['t_pulse']),'Drona Puls',0,0),(icon(I['t_missile']),'Drona Racheta',2,0),(icon(I['t_arc']),'Drona Fulger',3,0)]),
('COMPANIONI',[(icon(I['c_wing']),'Aripa',0,0),(icon(I['c_orb']),'Orbita',1,0),(icon(I['c_guard']),'Gardian',2,0),(icon(I['c_wing'],PURP),'Fantoma',4,0)]),
('ECHIPAMENT',[(icon(I['e_armor']),'Armura',1,0),(icon(I['e_gen']),'Generator scut',2,0),(icon(I['e_core']),'Modul',3,0),(icon(I['e_boost']),'Propulsor',0,0)]),
('CONSUMABILE',[(icon(I['k_bomb'],DARK),'Bomba',1,0),(icon(I['k_shield']),'Scut 10s',1,0),(icon(I['k_magnet']),'Magnet',0,0),(icon(I['k_x2']),'Cristale x2',2,0),(icon(I['k_heal']),'Reparatii',0,0)]),
('CUFERE',[(icon(I['chest'],tier=t),TN[t].title(),t,0) for t in range(5)]),
('PICKUP',[(icon(I['p_star']),'Stea',None,0),(icon(I['k_x2']),'Cristal',None,0),(icon(I['p_capsule']),'Supernova',None,0)]),
]
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf',20); f2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',14)
LW=190; cols=5
W=LW+cols*(CELL+GAP)+20
rowsH=[(CELL+40) for _ in SECT]
Hh=sum(rowsH)+84+30
sheet=Image.new('RGB',(W,Hh),(9,10,20)); d=ImageDraw.Draw(sheet)
r=random.Random(2)
for _ in range(300):
    x,y=r.randrange(0,W//4)*4,r.randrange(0,Hh//4)*4; d.rectangle([x,y,x+3,y+3],fill=r.choice([(20,24,40),(32,40,64)]))
d.text((20,18),'NEON COMET · DESIGN OBIECTE',font=F,fill=(232,234,246))
# tier legend
lx=20
for t in range(5):
    d.rectangle([lx+t*150,46,lx+t*150+14,60],fill=TC[t][:3]); d.text((lx+t*150+20,44),TN[t],font=f2,fill=TC[t][:3])
y=84
for title,items in SECT:
    d.text((20,y+CELL//2-10),title,font=F,fill=(192,203,220))
    for i,(im,label,t,kind) in enumerate(items):
        x0=LW+i*(CELL+GAP)
        if t is None: d.rectangle([x0,y,x0+CELL,y+CELL],fill=(18,20,34),outline=(58,68,102),width=2)
        else: frame(d,x0,y,t)
        sc=4 if kind=='ship' else 5
        big=im.resize((im.width*sc,im.height*sc),Image.NEAREST)
        sheet.paste(big,(x0+(CELL-big.width)//2,y+(CELL-big.height)//2-4),big)
        d.text((x0+4,y+CELL+6),label,font=f2,fill=(160,168,198))
    y+=CELL+40
sheet.save('items_sheet.png'); print(sheet.size)
