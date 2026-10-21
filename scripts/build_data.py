#!/usr/bin/env python3
"""Сборка cars-data.json из фида autonnmotors.ru/data/cars.json.
Оставляет только новые авто (new=1) и нужные поля, фото — первые 6.
Используется при переносе сайта на полноценный хостинг (Timeweb и др.)."""
import json, sys

raw_path = sys.argv[1] if len(sys.argv) > 1 else 'cars-raw.json'
out_path = sys.argv[2] if len(sys.argv) > 2 else 'cars-data.json'

raw = json.load(open(raw_path, encoding='utf-8'))
out = []
for c in raw:
    if c.get('new') != 1:
        continue
    out.append({
        'id': c['id'], 'make': c['make'], 'model': c['model'],
        'year': c.get('year'), 'price': c.get('price'),
        'km': c.get('km', 0), 'color': c.get('color', ''),
        'body': c.get('body', ''), 'fuel': c.get('fuel', ''),
        'gear': c.get('gear', ''), 'drive': c.get('drive', ''),
        'power': c.get('power'), 'vol': c.get('vol', ''),
        'img': (c.get('img') or [])[:6],
        'disc': c.get('disc', 0), 'tradein': c.get('tradein', 0),
        'credit': c.get('credit', 0), 'compl': c.get('compl', ''),
    })

out.sort(key=lambda c: (c['make'], c['model'], c['price'] or 0))
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print(f'{len(out)} new cars -> {out_path}')
