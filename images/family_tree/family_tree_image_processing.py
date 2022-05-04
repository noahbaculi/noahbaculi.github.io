# import PIL
# from PIL import Image
import os, sys
path = "path"
dirs = os.listdir( "images/family_tree" )
def resize():
    for item in dirs:
        if os.path.isfile(path+item):
            print(path+item)
            # img = Image.open(path+item)
            # f, e = os.path.splitext(path+item)
            # img = img.resize((width,hight ), Image.ANTIALIAS)
            # img.save(f + '.jpg') 
resize()