import sys; sys.path.insert(0,'.')
from bosses import *
from PIL import Image
out=Image.new('RGB',(5*(112*3+10),112*3*2+10),(9,10,20))
for i in range(5):
    for j,d in enumerate((False,True)):
        im=make(i,0,d).resize((336,336),Image.NEAREST); out.paste(im,(i*346,j*346),im)
out.save('/tmp/claude-0/prev.png')
