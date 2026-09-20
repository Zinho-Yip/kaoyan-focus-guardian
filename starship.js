(() => {
  const scene = document.getElementById('launchScene');
  const button = document.getElementById('launchBtn');
  const status = document.getElementById('launchStatus');
  const gold = '#cba735';
  const pad = {width:480, height:424, rocketX:270, rocketY:46, mountY:346, groundY:412};
  let progress = 0, day = '', flight = null, frame = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function line(ctx, points) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
  }

  function rocket(ctx, x, y, scale, ignition = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineWidth = 1.35;
    ctx.lineJoin = 'round';
    const booster = clamp(progress / 50), ship = clamp((progress - 50) / 20);
    ctx.fillStyle = progress >= 50 ? gold : '#e6e9e8';
    ctx.fillRect(-10, 300 - 160 * booster, 20, 160 * booster);
    ctx.fillStyle = progress >= 70 ? gold : '#e6e9e8';
    ctx.fillRect(-10, 132 - 84 * ship, 20, 84 * ship);
    ctx.beginPath();ctx.moveTo(-11,300);ctx.lineTo(-11,32);
    ctx.bezierCurveTo(-11,20,-6,5,-2,1);
    ctx.quadraticCurveTo(0,-1,2,1);
    ctx.bezierCurveTo(6,5,11,20,11,32);
    ctx.lineTo(11,300);ctx.closePath();ctx.stroke();
    line(ctx, [[-11,48],[11,48]]);
    line(ctx, [[-11,132],[11,132]]);
    line(ctx, [[-11,140],[11,140]]);
    line(ctx, [[-6,14],[-22,28],[-22,36],[-10,33],[-7,18]]);
    line(ctx, [[6,14],[22,28],[22,36],[10,33],[7,18]]);
    line(ctx, [[-11,95],[-23,114],[-23,132],[-11,132]]);
    line(ctx, [[11,95],[23,114],[23,132],[11,132]]);
    line(ctx, [[-11,245],[-18,251],[-18,300]]);
    line(ctx, [[11,245],[18,251],[18,300]]);
    for (let x = -8; x <= 8; x += 4) line(ctx, [[x,134],[x-1,138]]);
    line(ctx, [[-23,143],[-11,143]]);
    line(ctx, [[11,143],[23,143]]);
    if (ignition) {
      const plume = ctx.createLinearGradient(0,301,0,301+ignition);
      plume.addColorStop(0,'#d5dfff');
      plume.addColorStop(.16,'#8c9fff');
      plume.addColorStop(.48,'#b4a0fa');
      plume.addColorStop(.78,'#f2b6ea');
      plume.addColorStop(1,'rgba(164,161,255,0)');
      ctx.fillStyle=plume;ctx.shadowColor='#9f9bff';ctx.shadowBlur=9;
      ctx.beginPath();ctx.moveTo(-9,301);
      ctx.bezierCurveTo(-11,301+ignition*.22,-18,301+ignition*.62,-8,301+ignition*.9);
      ctx.quadraticCurveTo(0,301+ignition*1.1,8,301+ignition*.9);
      ctx.bezierCurveTo(18,301+ignition*.62,11,301+ignition*.22,9,301);
      ctx.closePath();ctx.fill();
      const core=ctx.createLinearGradient(0,301,0,301+ignition*.9);
      core.addColorStop(0,'#ffffff');core.addColorStop(.35,'#fff2ff');
      core.addColorStop(.7,'rgba(255,210,248,.85)');core.addColorStop(1,'rgba(238,177,255,0)');
      ctx.fillStyle=core;ctx.shadowColor='#efd5ff';ctx.shadowBlur=5;
      ctx.beginPath();ctx.moveTo(-5,301);
      ctx.bezierCurveTo(-4,301+ignition*.2,-7,301+ignition*.55,0,301+ignition*.92);
      ctx.bezierCurveTo(7,301+ignition*.55,4,301+ignition*.2,5,301);
      ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }

  function drawMount(ctx) {
    const left=pad.rocketX-41, right=pad.rocketX+41;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--paper').trim();
    ctx.beginPath();ctx.moveTo(pad.rocketX-110,pad.groundY);ctx.lineTo(left,pad.mountY);
    ctx.lineTo(right,pad.mountY);ctx.lineTo(pad.rocketX+110,pad.groundY);ctx.closePath();ctx.fill();ctx.stroke();
    line(ctx, [[left,pad.groundY],[left,pad.mountY]]);
    line(ctx, [[right,pad.mountY],[right,pad.groundY]]);
    line(ctx, [[30,pad.groundY],[450,pad.groundY]]);
  }

  function drawScene() {
    const ctx = scene.getContext('2d');
    ctx.clearRect(0,0,scene.width,scene.height);
    ctx.save();ctx.scale(scene.width/pad.width,scene.height/pad.height);
    ctx.strokeStyle = getComputedStyle(scene).color;ctx.lineWidth = 1.3;
    // Tower, service arm and launch mount follow the reference silhouette.
    ctx.strokeRect(158,20,29,361);ctx.strokeRect(162,20,21,361);
    ctx.strokeRect(187,20,32,17);
    line(ctx, [[199,37],[199,381]]);line(ctx, [[204,37],[204,381]]);
    line(ctx, [[211,37],[211,122],[187,122]]);
    for(let y=80;y<120;y+=14)ctx.strokeRect(201,y,6,9);
    line(ctx, [[187,76],[261,76],[259,94],[208,94],[208,122]]);
    line(ctx, [[211,119],[221,94],[234,108],[234,94]]);
    if (!flight) rocket(ctx,pad.rocketX,pad.rocketY,1);
    ctx.strokeRect(148,381,50,15);
    line(ctx, [[148,396],[155,412],[163,396],[176,412],[189,396]]);
    drawMount(ctx);
    ctx.restore();
  }

  function drawSmoke(ctx, t) {
    const expansion = 1-Math.exp(-t*3.8), fade = 1-clamp((t-4.4)/2.6);
    ctx.save();
    ctx.beginPath();ctx.rect(20,0,440,pad.groundY);ctx.clip();
    ctx.globalAlpha = fade;
    // Opaque overlapping lobes merge into a cloud, with darker billows behind it.
    for(let layer=0;layer<2;layer++) {
      ctx.fillStyle = layer ? '#e3e5e3' : '#888e8c';
      ctx.beginPath();
      for(let i=0;i<13;i++) {
        const offset=i-6, edge=Math.abs(offset)/6;
        const spread=offset*29*expansion;
        const radius=(14+(1-edge)*30+Math.sin(i*2.7+layer)*9)*expansion;
        const rise=(1-edge)*(62+18*Math.sin(i*1.9+layer))*expansion;
        const x=pad.rocketX+spread+(layer ? -5 : 6);
        const y=pad.groundY-radius*.35-rise+(layer ? 9 : -5);
        ctx.moveTo(x+radius,y);
        ctx.arc(x,y,radius,0,Math.PI*2);
      }
      ctx.fill();
    }
    // A dense central plume joins the exhaust to the spreading ground cloud.
    ctx.fillStyle='#e3e5e3';ctx.beginPath();
    ctx.ellipse(pad.rocketX,pad.mountY+16,32*expansion,64*expansion,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function render() {
    const booster = Math.round(clamp(progress/50)*100), ship = Math.round(clamp((progress-50)/20)*100);
    document.getElementById('launchPercent').textContent = `${Math.floor(progress)}%`;
    document.getElementById('boosterStatus').textContent = `一级助推器 · ${booster}%`;
    document.getElementById('shipStatus').textContent = `二级舰体 · ${ship}%`;
    document.getElementById('boosterStatus').classList.toggle('fueled', progress >= 50);
    document.getElementById('shipStatus').classList.toggle('fueled', progress >= 70);
    button.disabled = progress < 70 || !!flight;
    button.classList.toggle('ready', progress >= 70);
    button.textContent = progress >= 70 ? 'Launch' : 'Pending';
    button.title = flight ? '发射进行中' : progress >= 70 ? '发射星舰' : '今日专注达到 70% 后可发射';
    if (!flight) status.textContent = progress >= 70 ? '加注完成 · READY FOR LAUNCH' : progress >= 50 ? '二级舰体加注中 · 70% 解锁发射' : '一级助推器加注中 · 70% 解锁发射';
    scene.setAttribute('aria-label', `星舰发射场，今日专注 ${Math.floor(progress)}%，一级加注 ${booster}%，二级加注 ${ship}%`);
    drawScene();
  }

  function stopFlight() {
    cancelAnimationFrame(frame);
    flight?.canvas.remove();flight = null;
    render();
  }

  window.updateStarship = (percent, studyDay) => {
    progress = Math.max(0, Math.min(100, Number(percent) || 0));
    if (day !== studyDay) { day = studyDay; stopFlight(); }
    render();
  };

  button.addEventListener('click', () => {
    if (progress < 70 || flight) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'launch-flight';canvas.setAttribute('aria-hidden','true');
    document.body.append(canvas);
    flight = {canvas, start: performance.now()};render();
    const ctx = canvas.getContext('2d');
    function animate(now) {
      if (!flight) return;
      // A frame timestamp can precede a click handled in that same browser frame.
      const t = Math.max(0,(now-flight.start)/1000), rect = scene.getBoundingClientRect();
      const overlay = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1,2);
      const width=Math.round(overlay.width*dpr),height=Math.round(overlay.height*dpr);
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
      // Match the overlay's actual CSS box, including scrollbar and zoom differences.
      ctx.setTransform(canvas.width/overlay.width,0,0,canvas.height/overlay.height,0,0);
      // Clip the entire plume, including its glow, at the fixed launch-site ground.
      ctx.save();ctx.beginPath();
      ctx.rect(0,0,overlay.width,Math.max(0,rect.top-overlay.top+rect.height*pad.groundY/pad.height));
      ctx.clip();
      ctx.translate(rect.left-overlay.left,rect.top-overlay.top);
      ctx.scale(rect.width/pad.width,rect.height/pad.height);
      const lift = Math.max(0,t-1.3);
      const distance = reducedMotion.matches ? 0 : lift*lift*(overlay.height+rect.height)/12/(rect.height/pad.height);
      ctx.strokeStyle = getComputedStyle(scene).color;
      ctx.lineWidth=1.3;
      ctx.globalAlpha = reducedMotion.matches ? Math.max(0,1-t/1.5) : 1;
      rocket(ctx,pad.rocketX,pad.rocketY-distance,1,(140+Math.sin(t*43)*9)*Math.min(1,t*6));
      drawSmoke(ctx,t);
      ctx.globalAlpha=1;
      drawMount(ctx);
      ctx.restore();
      status.textContent = t<1.3 ? '点火 · IGNITION' : '星舰升空 · LIFTOFF';
      if (t > (reducedMotion.matches ? 1.6 : 7)) {
        stopFlight();status.textContent = '发射成功 · 今日的专注已化作推力';
        return;
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
  });
  new MutationObserver(drawScene).observe(document.body,{attributes:true,attributeFilter:['class']});
  const tasksButton = document.createElement('button');
  tasksButton.type='button';tasksButton.className='ghost';tasksButton.textContent='本段任务';
  document.querySelector('.focus-actions').append(tasksButton);
  const tasksModal=document.getElementById('currentTasksModal');
  tasksButton.onclick=()=>tasksModal.showModal();
  document.getElementById('currentTasksClose').onclick=()=>tasksModal.close();
  tasksModal.addEventListener('click',event=>{
    if(event.target.closest('[data-plan-edit]'))tasksModal.close();
  },true);
  document.getElementById('taskHistoryBtn').addEventListener('click',()=>tasksModal.close());
  render();
})();
