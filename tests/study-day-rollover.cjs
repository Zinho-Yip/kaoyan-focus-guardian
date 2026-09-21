const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const url=process.env.STARSHIP_TEST_URL||'http://localhost:8787/';
const timestamp=value=>new Date(value).getTime();
const initial={dayKey:'2026-09-20',focused:130,interruptions:2,dailyFocus:{'2026-09-20':130},updatedAt:timestamp('2026-09-20T23:00:00+08:00'),timer:{running:false,elapsed:0,startedAt:0,changedAt:timestamp('2026-09-20T23:00:00+08:00')}};

(async()=>{
  const browser=await chromium.launch({...process.platform==='win32'?{channel:'msedge'}:{},headless:true});
  async function scenario(name,time,seed,check,remote){
    const context=await browser.newContext({timezoneId:'Asia/Shanghai',serviceWorkers:'block'});
    const errors=[];
    try{
      await context.addInitScript(value=>{
        localStorage.setItem('focus-guardian-v1',JSON.stringify(value));
        localStorage.setItem('focus-sync-initialized','1');
        localStorage.setItem('focus-background-mode','1');
      },seed);
      await context.route('**/api/sync.php',remote||((route)=>route.fulfill({json:{data:null}})));
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.clock.install({time:new Date(time)});
      await page.goto(url);
      await check(page);
      assert.deepEqual(errors,[]);console.log(`PASS: ${name}`);
    }finally{await context.close()}
  }
  async function resetState(page,previous){
    assert.equal(await page.locator('#focusedMinutes').textContent(),'0 分钟');
    assert.equal(await page.locator('#progressPercent').textContent(),'0%');
    assert.equal(await page.locator('#launchPercent').textContent(),'0%');
    assert.equal(await page.locator('#timer').textContent(),'00:00:00');
    assert.equal(await page.locator('#launchBtn').textContent(),'Pending');
    assert.equal(await page.locator('#startBtn').isEnabled(),true);
    assert.equal(await page.locator('#pauseBtn').isDisabled(),true);
    assert.match(await page.locator('[data-date="2026-09-20"]').getAttribute('aria-label'),new RegExp(`专注 ${previous} 分钟`));
    assert.match(await page.locator('[data-date="2026-09-21"]').getAttribute('aria-label'),/专注 0 分钟/);
    assert.match(await page.locator('.weekly-focus-day.today').getAttribute('aria-label'),/专注 0 分钟/);
    assert.equal(await page.evaluate(()=>data.dayKey),'2026-09-21');
  }
  try{
    await scenario('midnight belongs to prior study day; paused 03:00 rollover refreshes all views','2026-09-21T00:30:00+08:00',initial,async page=>{
      assert.equal(await page.locator('#focusedMinutes').textContent(),'130 分钟');
      assert.match(await page.locator('[data-date="2026-09-21"]').getAttribute('aria-label'),/专注 0 分钟/);
      assert.match(await page.locator('.weekly-focus-day.today').getAttribute('aria-label'),/专注 0 分钟/);
      assert.match(await page.locator('.weekly-focus-day').nth(5).getAttribute('aria-label'),/专注 130 分钟/);
      await page.clock.setSystemTime(new Date('2026-09-21T03:00:00+08:00'));
      await page.evaluate(()=>renderCalendar());
      assert.match(await page.locator('[data-date="2026-09-21"]').getAttribute('aria-label'),/专注 0 分钟/);
      await page.clock.runFor(1100);await resetState(page,130);
    });
    const running={...initial,timer:{running:true,startedAt:timestamp('2026-09-21T02:58:00+08:00'),elapsed:0,changedAt:timestamp('2026-09-21T02:58:00+08:00')}};
    await scenario('running timer stops exactly at 03:00','2026-09-21T02:59:58+08:00',running,async page=>{
      await page.clock.runFor(3100);await resetState(page,132);
    });
    await scenario('reopening after 03:00 settles only until boundary','2026-09-21T04:00:00+08:00',running,page=>resetState(page,132));
    const legacy={...initial};delete legacy.dayKey;
    await scenario('legacy state without dayKey keeps old totals on their original date','2026-09-21T04:00:00+08:00',legacy,page=>resetState(page,130));
    let release,held=false;
    await scenario('delayed sync response cannot overwrite newer rollover','2026-09-21T02:59:58+08:00',initial,async page=>{
      assert.ok(held);
      await page.clock.runFor(3100);await resetState(page,130);
      release();await page.waitForFunction(()=>!readBusy);
      await resetState(page,130);
    },async route=>{
      if(route.request().method()==='GET'&&!held){
        held=true;await new Promise(resolve=>{release=resolve});
        await route.fulfill({json:{data:{...initial,dayKey:'2026-09-21',updatedAt:timestamp('2026-09-21T02:59:59+08:00')}}});
      }else await route.fulfill({json:{data:null}});
    });
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
