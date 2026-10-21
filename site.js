/* Общий код сайта: данные фида, рендер карточек, анимации */
window.NN = (function(){
  let _data = null;

  /* Нормализация сырой записи фида в формат сайта */
  function norm(c){
    return {
      id: c.id, make: c.make, model: c.model, year: c.year, price: c.price,
      km: c.km || 0, color: c.color || '', body: c.body || '', fuel: c.fuel || '',
      gear: c.gear || '', drive: c.drive || '', power: c.power, vol: c.vol || '',
      img: (c.img || []).slice(0,6), disc: c.disc || 0,
      tradein: c.tradein || 0, credit: c.credit || 0, compl: c.compl || ''
    };
  }

  function load(){
    if (_data) return Promise.resolve(_data);
    // 1) локальный срез фида (если есть рядом с сайтом)
    return fetch('cars-data.json')
      .then(r => { if(!r.ok) throw new Error('local '+r.status); return r.json(); })
      .catch(() =>
        // 2) живой фид напрямую (если CORS разрешён / сайт на домене дилера)
        fetch('https://autonnmotors.ru/data/cars.json')
          .then(r => { if(!r.ok) throw new Error('direct '+r.status); return r.json(); })
          .then(d => d.filter(c => c.new === 1).map(norm))
      )
      .catch(() =>
        // 3) живой фид через CORS-прокси (для GitHub Pages и сторонних хостингов)
        fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://autonnmotors.ru/data/cars.json'))
          .then(r => { if(!r.ok) throw new Error('proxy '+r.status); return r.json(); })
          .then(d => d.filter(c => c.new === 1).map(norm))
      )
      .then(d => { _data = d; return d; });
  }

  function fmt(n){ return (n==null ? '' : Number(n).toLocaleString('ru-RU')); }
  function price(c){ return fmt(c.price) + ' ₽'; }
  function oldPrice(c){ return c.disc ? fmt(c.price + c.disc) + ' ₽' : ''; }
  function specs(c){
    return [c.fuel, c.vol ? c.vol + ' л' : '', c.power ? c.power + ' л.с.' : '']
      .filter(Boolean).join(', ') + ' · ' + (c.gear || '—') + ' · ' + (c.drive || '—');
  }
  function makeName(m){ return m === 'ВАЗ (LADA)' ? 'Lada' : m; }

  function badge(c){
    if (c.disc) return '<span class="badge disc">Выгода ' + fmt(c.disc) + ' ₽</span>';
    if (c.credit) return '<span class="badge">Льготный кредит</span>';
    return '';
  }

  function card(c){
    return '<a class="card" href="car.html?id=' + encodeURIComponent(c.id) + '">' +
      '<div class="card__img">' + badge(c) +
        '<img loading="lazy" src="' + c.img[0] + '" alt="' + makeName(c.make) + ' ' + c.model + '"></div>' +
      '<div class="card__body">' +
        '<div class="card__name">' + makeName(c.make) + ' ' + c.model + '</div>' +
        '<div class="card__specs">' + specs(c) + '</div>' +
        '<div class="card__price"><span class="price-now">' + price(c) + '</span>' +
          (c.disc ? '<span class="price-old">' + oldPrice(c) + '</span>' : '') + '</div>' +
        '<div class="stock-line">' + (c.compl || '') + '</div>' +
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

  return { load, fmt, price, oldPrice, specs, makeName, card, reveal, counters, annuity };
})();
