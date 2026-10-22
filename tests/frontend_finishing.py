import asyncio,json
from playwright.async_api import async_playwright
PATHS=['/','/about','/buyers','/sellers','/how-it-works','/contact','/properties','/register','/register?role=buyer','/register?role=seller','/login','/forgot-password','/reset-password','/privacy','/terms','/disclaimer','/refund-policy','/cookie-policy','/payment-policy','/verification-policy','/seller-guidelines','/buyer-guidelines']
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for width in [1280,768,390]:
   page=await b.new_page(viewport={'width':width,'height':1800})
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script("window.cls=0;new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.cls+=e.value}).observe({type:'layout-shift',buffered:true})")
   for route in PATHS:
    await page.goto('http://localhost:8080'+route,wait_until='networkidle')
    await page.evaluate('document.fonts.ready')
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,route,'overflow')
    assert await page.locator('main').count()>0,(width,route)
    assert await page.title() not in ['', 'Lovable App','ELITEOZ'],(width,route,'title')
    assert await page.evaluate("getComputedStyle(document.documentElement).scrollBehavior")=='auto'
    if route=='/':
     await page.screenshot(path=f'/tmp/browser/finishing/home-{width}.png')
     print(width,'home:',json.dumps(await page.evaluate("({cls:window.cls,hero:document.querySelector('.nx-hero>img').currentSrc.split('/').pop(),fonts:performance.getEntriesByType('resource').filter(r=>r.name.includes('fonts.google')).length,family:getComputedStyle(document.body).fontFamily})")))
    if route=='/register?role=buyer':
     await page.locator('#password').fill('Test-only-password')
     assert await page.locator('#password').get_attribute('type')=='password'
     await page.get_by_role('button',name='Show password',exact=True).click()
     assert await page.locator('#password').get_attribute('type')=='text'
     await page.get_by_role('button',name='Hide password',exact=True).click()
     await page.screenshot(path=f'/tmp/browser/finishing/register-{width}.png')
   print(width,len(PATHS),'public pages checked; runtime errors',len(errors))
   assert not errors,errors
   await page.close()
  await b.close()
asyncio.run(main())
