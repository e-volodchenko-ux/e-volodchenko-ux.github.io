/* Общий код сайта: данные фида, рендер карточек, анимации.
   Источник данных — models-data.json (срез фида по моделям: min-цена, остаток, фото).
   Фолбэки: живой фид напрямую → CORS-прокси (агрегация в модели на клиенте). */
window.NN = (function(){
  let _data = null;

  /* Агрегация сырого фида в модели (как scripts/build_data.py + группировка) */
  function aggregate(raw){
    const groups = {};
    raw.filter(c => c.new === 1).forEach(c => {
      const k = c.make + '|' + c.model;
      (groups[k] = groups[k] || []).push(c);
    });
    const models = Object.keys(groups).map(k => {
      const cars = groups[k].sort((a,b) => a.price - b.price);
      const mn = cars[0];
      const make = k.split('|')[0], model = k.split('|')[1];
      return { make, model, count: cars.length, min: {
        id: mn.id, price: mn.price, year: mn.year, vol: mn.vol || '',
        power: mn.power, gear: mn.gear || '', drive: mn.drive || '',
        fuel: mn.fuel || '', body: mn.body || '', color: mn.color || '',
        compl: mn.compl || '', disc: mn.disc || 0,
        tradein: mn.tradein || 0, credit: mn.credit || 0,
        img: (mn.img || []).slice(0,6)
      }};
    });
    models.sort((a,b) => (a.make + a.model).localeCompare(b.make + b.model));
    return models;
  }

  function load(){
    if (_data) return Promise.resolve(_data);
    return fetch('models-data.json')
      .then(r => { if(!r.ok) throw new Error('local '+r.status); return r.json(); })
      .catch(() =>
        fetch('https://autonnmotors.ru/data/cars.json')
          .then(r => { if(!r.ok) throw new Error('direct '+r.status); return r.json(); })
          .then(aggregate)
      )
      .catch(() =>
        fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://autonnmotors.ru/data/cars.json'))
          .then(r => { if(!r.ok) throw new Error('proxy '+r.status); return r.json(); })
          .then(aggregate)
      )
      .then(d => { _data = d; return d; });
  }

  function fmt(n){ return (n==null ? '' : Number(n).toLocaleString('ru-RU')); }
  function makeName(m){ return m === 'ВАЗ (LADA)' ? 'Lada' : m; }
  function priceStr(p){ return fmt(p) + ' ₽'; }
  function countWord(n){
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return n + ' авто';
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return n + ' авто';
    return n + ' авто';
  }
  function specsOf(c){
    return [c.fuel, c.vol ? c.vol + ' л' : '', c.power ? c.power + ' л.с.' : '']
      .filter(Boolean).join(', ') + ' · ' + (c.gear || '—') + ' · ' + (c.drive || '—');
  }
  function modelUrl(m){ return 'car.html?m=' + encodeURIComponent(m.make + '|' + m.model); }

  function badge(min){
    if (min.disc) return '<span class="badge disc">Выгода ' + fmt(min.disc) + ' ₽</span>';
    if (min.credit) return '<span class="badge">Льготный кредит</span>';
    return '';
  }

  /* Карточка модели: min-фото, «от» цена, остаток */
  function modelCard(m){
    const c = m.min;
    return '<a class="card" href="' + modelUrl(m) + '">' +
      '<div class="card__img">' + badge(c) +
        '<img loading="lazy" src="' + c.img[0] + '" alt="' + makeName(m.make) + ' ' + m.model + '"></div>' +
      '<div class="card__body">' +
        '<div class="card__name">' + makeName(m.make) + ' ' + m.model + '</div>' +
        '<div class="card__specs">' + specsOf(c) + '</div>' +
        '<div class="card__price">от <span class="price-now">' + priceStr(c.price) + '</span>' +
          (c.disc ? '<span class="price-old">' + priceStr(c.price + c.disc) + '</span>' : '') + '</div>' +
        '<div class="stock-line"><b>В наличии:</b> ' + countWord(m.count) + '</div>' +
      '</div></a>';
  }

  function reveal(){
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    }), {threshold:.12});
    document.querySelectorAll('.rv').forEach(el => io.observe(el));
  }

  function counters(){
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, t = +el.dataset.count, t0 = performance.now();
      const f = now => {
        const k = Math.min(1,(now-t0)/1600), ez = 1-Math.pow(1-k,4);
        el.textContent = Math.round(t*ez).toLocaleString('ru-RU');
        if (k<1) requestAnimationFrame(f);
      };
      requestAnimationFrame(f); cio.unobserve(el);
    }), {threshold:.4});
    document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));
  }

  /* Аннуитетный платёж: S — сумма кредита, pct — годовая ставка %, n — месяцев */
  function annuity(S, pct, n){
    const r = pct/100/12;
    if (r <= 0) return Math.round(S/n);
    return Math.round(S * r / (1 - Math.pow(1+r, -n)));
  }

  return { load, models: () => _data || [], fmt, makeName, priceStr, countWord, specsOf, modelUrl, modelCard, reveal, counters, annuity };
})();
