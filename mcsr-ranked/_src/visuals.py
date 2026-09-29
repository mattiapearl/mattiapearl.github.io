"""Original SVG block illustrations. No Minecraft textures or game assets."""
from html import escape
from math import cos, sin, radians


ICONS = {
    "eye": '<path fill="#90b66d" d="M7 3h10v3h4v12h-4v3H7v-3H3V6h4z"/><path fill="#d8ec9f" d="M7 6h10v3h3v6h-3v3H7v-3H4V9h3z"/><path fill="#277e70" d="M9 6h6v3h3v6h-3v3H9v-3H6V9h3z"/><path fill="#142f31" d="M10 8h5v8h-5z"/><path fill="#eaf8bd" d="M9 7h3v3H9z"/>',
    "gravel": '<path fill="#b1b4a6" d="M3 3h18v18H3z"/><path fill="#757b72" d="M3 3h18v3H6v15H3zM8 9h5v4H8zM15 5h4v5h-4zM14 16h7v5h-7z"/><path fill="#dad9c7" d="M6 5h5v3H6zM15 12h5v3h-5zM5 16h5v3H5z"/>',
    "flint": '<path fill="#586567" d="M3 15L13 3h5l4 8-6 10H7z"/><path fill="#c2d0c8" d="M4 14L14 3h4L9 16z"/><path fill="#879b96" d="M9 16l9-13 2 8-5 8z"/>',
    "rod": '<path fill="#784722" d="M2 17h4v-4h4V9h4V5h4V2h4v7h-4v4h-4v4h-4v4H2z"/><path fill="#ffd16c" d="M3 17h4v-4h4V9h4V5h5v3h-4v4h-4v4H8v4H3z"/><path fill="#ffef9a" d="M15 5h5v3h-5zM7 13h4v3H7z"/>',
    "shovel": '<path fill="#563e29" d="M3 18h3v-3h3v-3h3V9h3v6h-3v3H9v3H3z"/><path fill="#b68a51" d="M4 18h3v-3h3v-3h3v3h-3v3H7v3H4z"/><path fill="#718d85" d="M12 3h9v9h-3v3h-6v-3H9V6h3z"/><path fill="#e0e6d3" d="M12 3h9v6h-3v3h-6V9H9V6h3z"/>',
    "map": '<path fill="#aaa987" d="M2 4h20v17H2z"/><path fill="#e9ddb1" d="M4 2h5v17H4zM10 5h5v17h-5zM16 2h5v17h-5z"/><path fill="#7b9e64" d="M4 9h5v3H4zM10 12h5v3h-5zM16 9h5v3h-5z"/><path fill="#ae5847" d="M14 5h2v2h2v2h-2v2h-2V9h-2V7h2z"/>',
    "temple": '<path fill="#c4a66c" d="M2 14h3v-4h4V6h6v4h4v4h3v8H2z"/><path fill="#eddaa0" d="M2 14h20v3H2zM5 10h14v3H5zM9 6h6v3H9z"/><path fill="#63513b" d="M9 17h6v5H9z"/><path fill="#639cb9" d="M10 11h4v4h-4z"/>',
}


def sprite():
    return '<svg class="sprites" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>' + ''.join(
        f'<symbol id="icon-{name}" viewBox="0 0 24 24" shape-rendering="crispEdges">{body}</symbol>'
        for name, body in ICONS.items()
    ) + '</defs></svg>'


def icon(name, class_name="pixel-icon"):
    return f'<svg class="{class_name}" viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-{name}"/></svg>'


def svg(key, box, title, body):
    return f'<svg viewBox="{box}" role="img" aria-labelledby="{key}-title" xmlns="http://www.w3.org/2000/svg"><title id="{key}-title">{escape(title)}</title>{body}</svg>'


def poly(points, fill, extra=""):
    return f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x,y in points)}" fill="{fill}" {extra}/>'


def portal(eyes):
    def position(x, z, height=0):
        return 260 + (x-z)*43, 46 + (x+z)*22 - height

    def tile(x, z, height, color):
        points = [position(x,z,height),position(x+1,z,height),position(x+1,z+1,height),position(x,z+1,height)]
        return poly(points,color,'stroke="#18221c" stroke-width="2"')

    body = '<ellipse cx="260" cy="255" rx="225" ry="48" fill="#0a110e"/>'
    for depth in range(9):
        for x in range(5):
            z = depth-x
            if not 0 <= z < 5: continue
            body += tile(x,z,0,"#354238")
    # An incomplete portal has NO active portal surface. Lava sits below the frames.
    for x in range(1,4):
        for z in range(1,4):
            body += tile(x,z,1,["#c96935","#dd863f","#bd532d"][(x+z)%3])
            body += poly([position(x+.1,z+.15,2),position(x+.65,z+.15,2),position(x+.65,z+.3,2),position(x+.1,z+.3,2)],"#ffbd5c")
    ring = [(x,z) for x in range(5) for z in range(5) if ((x in (0,4)) != (z in (0,4)))]
    # Illustrative positions only: this is not the game's frame-index mapping.
    filled = {(0,2),(1,4)} if eyes == 2 else set(ring[:eyes])
    for x,z in sorted(ring,key=lambda p:sum(p)):
        top = [position(x,z,24),position(x+1,z,24),position(x+1,z+1,24),position(x,z+1,24)]
        bottom = [position(x,z),position(x+1,z),position(x+1,z+1),position(x,z+1)]
        body += '<g class="portal-frame' + (' prefilled' if (x,z) in filled else '') + '">'
        body += poly([top[1],top[2],bottom[2],bottom[1]],"#56716a")
        body += poly([top[2],top[3],bottom[3],bottom[2]],"#38584f")
        body += tile(x,z,24,"#c4c59a")
        body += poly([position(x+.15,z+.15,25),position(x+.85,z+.15,25),position(x+.85,z+.85,25),position(x+.15,z+.85,25)],"#344e43")
        if (x,z) in filled:
            body += poly([position(x+.22,z+.22,31),position(x+.78,z+.22,31),position(x+.78,z+.78,31),position(x+.22,z+.78,31)],"#b5e780")
            body += poly([position(x+.37,z+.32,33),position(x+.63,z+.32,33),position(x+.63,z+.68,33),position(x+.37,z+.68,33)],"#166f65")
            body += poly([position(x+.44,z+.4,34),position(x+.58,z+.4,34),position(x+.58,z+.64,34),position(x+.44,z+.64,34)],"#112e2c")
        else:
            body += poly([position(x+.3,z+.3,26),position(x+.7,z+.3,26),position(x+.7,z+.7,26),position(x+.3,z+.7,26)],"#162c26")
        body += '</g>'
    return svg('portal','0 0 520 310',f'Illustration of an incomplete portal with {eyes} filled and {12-eyes} empty frames. Positions are schematic.',body)


def falling():
    body = '<path d="M12 181H158v24H12z" fill="#465442"/><path d="M12 181H158v7H12z" fill="#8d9770"/>'
    body += '<use href="#icon-gravel" x="48" y="12" width="65" height="65"/>'
    body += '<rect x="58" y="89" width="44" height="44" fill="none" stroke="#70816a" stroke-width="2" stroke-dasharray="6 6"/>'
    body += '<path d="M80 74v83m-7-8 7 8 7-8" fill="none" stroke="#d5e5a4" stroke-width="3"/>'
    body += '<path d="M58 171h45v9H58z" fill="#b49461"/><path d="M58 169h45v5H58z" fill="#e4cb91"/>'
    return svg('falling','0 0 170 215','Gravel falls through an air gap onto a floor button above a full-block floor.',body)


def aiming():
    body = ''.join(f'<path d="M{x} 8v204M8 {x}h250" stroke="#304139" stroke-width="1"/>' for x in range(20,241,40))
    body += '<path d="M42 133L205 176 162 13" fill="none" stroke="#b5e780" stroke-width="3"/>'
    body += '<path d="M205 176h30v30h-30z" fill="#506051" stroke="#eef2d9" stroke-width="2"/>'
    body += '<use href="#icon-gravel" x="208" y="179" width="24" height="24"/>'
    body += '<rect x="199" y="170" width="12" height="12" fill="#fbcb78"/>'
    for x,y in [(42,133),(162,13)]:
        body += f'<rect x="{x-8}" y="{y-8}" width="16" height="16" fill="#b3d5dc" stroke="#14211e" stroke-width="3"/>'
    return svg('aiming','0 0 270 220','Two northwest viewing positions aim at the same northwest hitbox corner. Add 0.125 blocks per axis for the item centre.',body)


def compass():
    body = '<circle cx="110" cy="110" r="76" fill="#17241f" stroke="#6b8265" stroke-width="2"/>'
    body += '<path d="M110 25v170M25 110h170" stroke="#5a6c57" stroke-dasharray="4 5"/>'
    for lo in [92,212,332]:
        x1,y1 = 110+76*cos(radians(lo)),110+76*sin(radians(lo))
        x2,y2 = 110+76*cos(radians(lo+20)),110+76*sin(radians(lo+20))
        body += f'<path d="M110 110L{x1:.3f} {y1:.3f}A76 76 0 0 1 {x2:.3f} {y2:.3f}Z" fill="#739e55"/>'
    body += '<path d="M110 110L179 90" stroke="#e2edbd" stroke-width="3"/><path d="M170 84l12 5-8 10" fill="none" stroke="#e2edbd" stroke-width="3"/>'
    body += '<rect x="106" y="106" width="8" height="8" fill="#efcc84"/>'
    return svg('bearing','0 0 220 220','Three favourable bearing sectors, 120 degrees apart: 92–112, 212–232 and 332–352 degrees. East is zero; south is 90.',body)


def temple():
    body = '<path d="M26 30h168v152H26z" fill="#9b8457" stroke="#d0ba81" stroke-width="3"/>'
    for i,color in [(0,'#baa36f'),(1,'#d6be85'),(2,'#e8d39c')]:
        inset=40+i*18;size=140-i*36
        body += f'<rect x="{inset}" y="{inset-2}" width="{size}" height="{size}" fill="{color}" stroke="#9b8457" stroke-width="4"/>'
    body += '<rect x="97" y="95" width="26" height="26" fill="#518eb5" stroke="#2e617c" stroke-width="4"/>'
    body += '<path d="M180 96h22v26h-22z" fill="#16201b"/><path d="M187 109h44m-9-9 10 9-10 9" fill="none" stroke="#f7e4ad" stroke-width="4"/>'
    return svg('temple','0 0 245 210','Origin desert-temple schematic: blue centre tile at X10 Z10, with entrance facing east.',body)


def timeline(indices):
    slots=[]
    for i in range(1,13):
        flint=i in indices
        slots.append(f'<li class="{"is-flint" if flint else "is-gravel"}" aria-label="Break {i}: {"flint" if flint else "gravel"}">{icon("flint" if flint else "gravel")}<span>{i}</span></li>')
    return ''.join(slots)


def histogram(cases):
    counts=[sum(r['expectedEyesFromCode']==i for r in cases) for i in range(5)]
    counts.append(sum(r['expectedEyesFromCode']>=5 for r in cases))
    maximum=max(counts) or 1
    return ''.join(
        f'<div class="histogram-bin"><b>{n}</b><svg viewBox="0 0 48 90" aria-hidden="true"><rect x="4" y="{90-80*n/maximum:.3f}" width="40" height="{80*n/maximum:.3f}"/></svg><span>{label}</span></div>'
        for label,n in zip(['0','1','2','3','4','5–12'],counts)
    )
