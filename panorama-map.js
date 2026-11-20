(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else factory({window:root,document:root.document}).start();
})(typeof window==='object'?window:this,function({window:win,document:doc}){
 const point=(new URLSearchParams(win.location.search).get('point')||'').split(',').map(Number),valid=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
 let map=null,manager=null,disposed=false;
 const $=id=>doc.getElementById(id);
 function send(type,extra={}){if(win.parent!==win)win.parent.postMessage({type:'yard-panorama-'+type,...extra},'*');}
 function fail(text){if(disposed)return;$('notice').textContent=text;$('fallback').hidden=false;send('error',{message:text});}
 function changed(player){
  if(disposed)return;const p=player.getPanorama().getPosition().slice(0,2);if(!valid(p))return;
  $('notice').textContent='';map?.container.fitToViewport();player.fitToViewport();$('location').textContent='Место съёмки: '+p[1].toFixed(6)+', '+p[0].toFixed(6);
  send('position',{point:p});
 }
 async function init(api){
  if(disposed)return;
  map=new api.Map('panoramaMap',{center:point,zoom:18,controls:['zoomControl'],behaviors:['drag','scrollZoom','multiTouch']},{suppressMapOpenBlock:false});
  map.geoObjects.add(new api.Placemark(point,{hintContent:'Выбранная точка на маршруте',balloonContent:'Выбранная точка: '+point[1].toFixed(6)+', '+point[0].toFixed(6)},{preset:'islands#orangeCircleDotIcon',zIndex:1000}));
  manager=await map.getPanoramaManager();if(disposed)return;
  manager.events.add('openplayer',()=>{const player=manager.getPlayer();if(!player)return;changed(player);player.events.add('panoramachange',()=>changed(player));player.events.add('error',()=>fail('Изображение панорамы не загрузилось. Можно повторить загрузку или открыть Яндекс Карты.'));});
  manager.events.add('closeplayer',()=>{if(disposed)return;$('notice').textContent='Выберите место на синей линии карты, чтобы открыть панораму.';send('map');});
  // Yandex's map-bound player owns the blue camera marker, viewing sector and their synchronization.
  manager.enableLookup();await manager.openPlayer(point);
 }
 async function start(){
  if(point.length!==2||!valid(point)){fail('Не удалось определить выбранную точку. Закройте окно и нажмите на маршрут ещё раз.');return;}
  $('fallbackLink').href='https://yandex.ru/maps/?'+new URLSearchParams({'panorama[point]':point.join(','),'panorama[full]':'true',l:'stv',ll:point.join(','),z:'18'});
  try{
   const api=await new Promise((resolve,reject)=>{
    const script=doc.createElement('script');let done=false;
    const timer=setTimeout(()=>finish(new Error('Панорама не успела загрузиться. Повторите загрузку или откройте Яндекс Карты.')),20000);
    function finish(error,value){if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);}
    script.src='https://api-maps.yandex.ru/2.1/?lang=ru_RU&coordorder=longlat&ns=yardPanoramaApi&apikey='+encodeURIComponent(win.MAP_CONFIG?.yandexApiKey||'');
    script.onerror=()=>finish(new Error('Не удалось загрузить Яндекс Панорамы. Проверьте подключение к интернету.'));
    script.onload=()=>{const api=win.yardPanoramaApi;if(!api)return finish(new Error('Не удалось подключить Яндекс Панорамы.'));api.ready(()=>finish(null,api),e=>finish(e));};doc.head.append(script);
   });
   await init(api);
  }catch(error){fail('Не удалось открыть панораму выбранного места. Нажмите «Повторить» или откройте Яндекс Карты.');}
 }
 win.addEventListener('resize',()=>{if(!disposed)map?.container.fitToViewport();});
 win.addEventListener('pagehide',()=>{disposed=true;map?.destroy();});
 return {start,init,changed};
});
