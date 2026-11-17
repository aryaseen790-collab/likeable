"""Builds img_specs.json: for each image, the text regions to paint over, with
background colours and pill bounds detected from the English artwork."""
import json, sys
import numpy as np
from PIL import Image

D = sys.argv[1]  # scratchpad dir

def load(name):
    return np.asarray(Image.open(f'{D}/crops/{name}.png').convert('RGB')).astype(int)

def is_navy(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r < 70) & (g < 80) & (b < 130) & (b > r + 10)

def is_cream(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r > 235) & (g > 215) & (b > 150) & (b < 225) & (r - b > 20)

def bbox(a, win, pred, frac=0.25):
    x0, y0, x1, y1 = win
    sub = pred(a[y0:y1, x0:x1])
    rows = np.where(sub.mean(axis=1) > frac)[0]
    cols = np.where(sub.mean(axis=0) > frac)[0]
    if not len(rows) or not len(cols):
        raise SystemExit(f'no match in {win}')
    return [int(x0 + cols[0]), int(y0 + rows[0]), int(x0 + cols[-1] + 1), int(y0 + rows[-1] + 1)]

def colour(a, box, light):
    x0, y0, x1, y1 = box
    px = a[y0:y1, x0:x1].reshape(-1, 3)
    lum = px.mean(axis=1)
    sel = px[lum > 170] if light else px[lum < 90]
    m = np.median(sel, axis=0).astype(int)
    return '#%02x%02x%02x' % tuple(m)

def pill(a, win, pred, light, key, **kw):
    b = bbox(a, win, pred)
    return dict(kind='pill', box=b, bg=colour(a, b, light), key=key, **kw)

def patch(a, box, key, radius=8, **kw):
    return dict(kind='patch', box=box, bg=colour(a, box, True), key=key, radius=radius, **kw)

NAVY_TXT = '#ffffff'
INK = '#14213d'
specs = {}

a = load('image1-two-questions')
specs['image1-two-questions'] = dict(size=[764, 521], regions=[
    pill(a, (100, 0, 720, 75), is_navy, False, 't1', color=NAVY_TXT, size=30, weight=900, pad=26, top_bleed=False),
    patch(a, [66, 92, 216, 166], 'q1', radius=34, color=INK, size=25, weight=800, lines=3),
    patch(a, [596, 92, 734, 166], 'q2', radius=34, color=INK, size=25, weight=800, lines=3),
    pill(a, (30, 440, 720, 515), is_cream, True, 'c1', color=INK, size=19, weight=700, pad=24),
])

a = load('image2-warmth-competence-grid')
specs['image2-warmth-competence-grid'] = dict(size=[764, 528], regions=[
    pill(a, (120, 0, 700, 70), is_navy, False, 't2', color=NAVY_TXT, size=26, weight=900, pad=22),
    patch(a, [14, 92, 92, 124], 'hi', color=INK, size=20, weight=800, radius=4),
    patch(a, [14, 422, 86, 454], 'lo', color=INK, size=20, weight=800, radius=4),
    patch(a, [136, 457, 204, 489], 'lo', color=INK, size=19, weight=800, radius=4),
    patch(a, [618, 457, 700, 489], 'hi', color=INK, size=19, weight=800, radius=4),
    pill(a, (15, 190, 82, 380), is_navy, False, 'warmth', color=NAVY_TXT, size=22, weight=900, pad=14, vertical=True),
    pill(a, (290, 445, 530, 500), is_navy, False, 'comp', color=NAVY_TXT, size=21, weight=900, pad=14),
    patch(a, [254, 104, 412, 234], 'a', color=INK, size=19, weight=800, quad=True, align='left'),
    patch(a, [586, 104, 740, 234], 'b', color=INK, size=19, weight=800, quad=True, align='left'),
    patch(a, [254, 294, 412, 418], 'x', color=INK, size=19, weight=800, quad=True, align='left'),
    patch(a, [586, 294, 742, 418], 'd', color=INK, size=19, weight=800, quad=True, align='left'),
    pill(a, (30, 480, 734, 528), is_cream, True, 'cap2', color=INK, size=16, weight=700, pad=20),
])

a = load('image3-warm-versus-cold')
specs['image3-warm-versus-cold'] = dict(size=[550, 483], regions=[
    pill(a, (40, 0, 500, 70), is_navy, False, 't3', color=NAVY_TXT, size=32, weight=900, pad=24, top_bleed=True),
    pill(a, (20, 385, 530, 483), is_cream, True, 'cap3', color=INK, size=19, weight=700, pad=26),
])

a = load('image4-warmth-signals')
specs['image4-warmth-signals'] = dict(size=[466, 483], regions=[
    pill(a, (0, 0, 466, 65), is_navy, False, 't4', color=NAVY_TXT, size=27, weight=900, pad=20, top_bleed=True),
    patch(a, [40, 176, 232, 214], 'eye', color=INK, size=20, weight=800, radius=6),
    patch(a, [240, 172, 410, 234], 'smile', color=INK, size=20, weight=800, radius=6),
    patch(a, [34, 342, 232, 382], 'posture', color=INK, size=20, weight=800, radius=6),
    patch(a, [238, 342, 434, 382], 'listen', color=INK, size=20, weight=800, radius=6),
    pill(a, (20, 385, 446, 483), is_cream, True, 'cap4', color=INK, size=18, weight=700, pad=24),
])

a = load('image5-take-the-test')
spec5 = [
    pill(a, (30, 0, 470, 70), is_navy, False, 't5', color=NAVY_TXT, size=31, weight=900, pad=22, top_bleed=False),
    dict(kind='patch', box=[162, 196, 362, 286], bg=colour(a, [162, 196, 362, 286], True), key='product', radius=10,
         color=INK, size=31, weight=900, lines=3, rotate=10),
    dict(kind='patch', box=[170, 300, 338, 352], bg='#fd7d05', gradient=['#fe9a05', '#fd6205'], key='start', radius=26,
         color='#ffffff', size=29, weight=900, rotate=10, suffix=' ›'),
    pill(a, (0, 375, 503, 483), is_cream, True, 'cap5', color=INK, size=18, weight=700, pad=26),
]
specs['image5-take-the-test'] = dict(size=[503, 483], regions=spec5)

json.dump(specs, open(f'{D}/img_specs.json', 'w'), indent=1)
for k, v in specs.items():
    print(k, [(r['key'], r['box'], r['bg']) for r in v['regions'] if r['kind'] == 'pill'])
