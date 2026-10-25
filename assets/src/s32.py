from PIL import Image, ImageDraw, ImageFont
import random
def H(h): return (int(h[1:3],16),int(h[3:5],16),int(h[5:7],16),255)
BASE={'o':'#181425','b':'#124e89','c':'#0099db','C':'#2ce8f5','x':'#e43b44','y':'#63c74d','f':'#f77622','F':'#feae34','Y':'#fee761',
'G':'#63c74d','g':'#3e8948','q':'#402751','p':'#68386c','P':'#b55088','Q':'#f6757a'}
METAL={'steel':dict(d='#262b44',m='#3a4466',M='#5a6988',l='#8b9bb4',L='#c0cbdc',W='#ffffff'),
'sand':dict(d='#3e2731',m='#733e39',M='#b86f50',l='#e4a672',L='#ead4aa',W='#fff6e0'),
'stealth':dict(d='#120e1c',m='#2b2142',M='#4a3466',l='#6b4f8c',L='#9a7cc0',W='#e4dcff'),
'carapace':dict(d='#2a1730',m='#4a2450',M='#7a3a7a',l='#a855a0',L='#d88ad0',W='#ffd8f8'),
'white':dict(d='#2b2e44',m='#5a6080',M='#9aa3bf',l='#d0d6e6',L='#f2f4fa',W='#ffffff'),
'jade':dict(d='#193c3e',m='#265c42',M='#3e8948',l='#63c74d',L='#a8e06a',W='#e6ffd0')}
SH={'W':'L','L':'l','l':'M','M':'m','m':'d','C':'c','c':'b','x':'y','F':'f','G':'g','g':'d','P':'p','Q':'P','Y':'F'}
SHIPS=[('VANATOR','steel',[
"...............o","..............oL","..............oL",".............oLl",".............oLl","............oLlb","............oLcC","............oLcW",
"...........oLlcC","...........oLlbc","...........oLllb","..........oLlMll","..........oLlMll",".........oLlMMlL","........oLlMmMlL",".......oLlMcmMlL",
"......oLlMccmMlL",".....oLlMcCcmMlL","....oLlMMccmmMlL","...oLlMMMMmmmMlL","..oLlMMMMMmmmolL",".oxLMMMMMmmmdolL",".oLMmmmmmmddddoL","..ooooooooodMMol",
"..........odmMol",".........odmmMol",".........oddddoo",".........oFYFo..","..........fFf...","...........f....","................","................"]),
('NOVA','white',[
"............o...","...........oLo..","...........oLlo.","...........oLlo.","..........oLlMo.","..........oLlMoo","..........oLlMoC","..........oLlMoW",
".........oLlMMoC",".........oLlMMoc","........oLlMMMMM","........oLlMCMMM",".......oLlMMCMMM","......oLlMMMCMMM",".....oLlMMMMCMMM","....oLlMMMMmCmMM",
"...oLlMMMMmmCmMM","..oLlMMMMmmmCmMM",".oxCCCCCCCCCCmMM","oLlMMmmmmmmmmmMM","oMmmmmddddddmmMM",".oooooooooodmmMl","..........odmMMl",".........odmmMMl",
".........oddmmMo","..........oCCCo.","...........CWC..","............C...","............c...","................","................","................"]),
('FREGATA','sand',[
"...............o","..............oL","..............oL",".............oLl",".............oLl","....oo.......oLl","...oLlo.....oLlb","...oLlo.....oLcC",
"...oLlo.....oLcW","...oLlo....oLlbc","...oLlo....oLllb","..oLlMlo...oLlMl","..oLlMlo..oLlMMl","..oLlMloooLlMMMl","..oLlMlLLLlMMFMl","..oLlMlllllMMFMl",
"..oxlMlMMMMMmMMl","..oLlMlmmmmmmmMl","..oLlMlmooommmMl","..oLlMlmo.oommMl","..oLMmmo....odMl","...oddo.....odmM","...oFFo....oddmM","....Ff.....oddmm",
"............oFYY",".............fFF","..............fF","...............f","................","................","................","................"]),
('UMBRA','stealth',[
"...............o","..............om","..............oM",".............omM",".............omM","............omMP","............omPW","............omPP",
"...........omMMp","...........omMMm","..........omMMmm",".o........omMmmm",".oLo.....omMmmmm","..oLoo..omMMmmmm","..oLMMoomMMmmmmm","...oLMMMMMmmmmmm",
"...oLMMMMPmmmmmm","....oLMMPPmmmdmm","....oxMPPmmmddmm",".....oMMmmmdddmm",".....oMmmmddddmm","......ommmdooodm","......omdoo..odm",".......oo....odm",
".............ooo","..............oP","...............Q","...............P","................","................","................","................"]),
]
def sprite(rows,metal,frame=0):
    pal={**BASE,**METAL[metal]}
    im=Image.new('RGBA',(32,32),(0,0,0,0)); px=im.load()
    for y,r in enumerate(rows):
        r=list(r)
        if frame==1: r=[{'Y':'F','F':'Y'}.get(c,c) for c in r]
        if frame==2: r=[{'Q':'W','P':'Q'}.get(c,c) for c in r]
        full=r+[SH.get(c,c) for c in reversed(r)]
        for x,ch in enumerate(full):
            if ch!='.': px[x,y]=H(pal[ch])
    return im
r=random.Random(4); CW=300
W=40+4*(CW+30); Hh=760
sh=Image.new('RGB',(W,Hh),(9,10,20)); d=ImageDraw.Draw(sh)
for _ in range(240):
    x,y=r.randrange(0,W//4)*4,r.randrange(0,Hh//4)*4; d.rectangle([x,y,x+3,y+3],fill=r.choice([(32,46,55),(37,58,94),(90,105,136)]))
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf',22)
for i,(name,metal,rows) in enumerate(SHIPS):
    x0=40+i*(CW+30)
    s=sprite(rows,metal).resize((256,256),Image.NEAREST); sh.paste(s,(x0+22,50),s)
    d.text((x0+22,320),name,font=F,fill=(192,203,220))
# game-scale strip: 320x110 view x3
ctx=Image.new('RGB',(320,110),(16,20,31)); cd=ImageDraw.Draw(ctx)
for _ in range(60): cd.point((r.randrange(320),r.randrange(110)),fill=r.choice([(37,58,94),(139,155,180)]))
for i,(name,metal,rows) in enumerate(SHIPS):
    s=sprite(rows,metal); ctx.paste(s,(30+i*75,60),s)
ctx=ctx.resize((960,330),Image.NEAREST); sh.paste(ctx,(40,380))
d.text((1020,400),'in joc (x3)',font=F,fill=(192,203,220))
d.text((1020,440),'32 px = ~96-128 px',font=F,fill=(140,148,180)); d.text((1020,470),'pe ecranul telefonului',font=F,fill=(140,148,180))
sh.save('ships32_v4.png'); print(sh.size)
