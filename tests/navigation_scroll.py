import asyncio
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for width in [1280,768,390]:
   page=await browser.new_page(viewport={'width':width,'height':1800})
   errors=[]
   page.on('pageerror', lambda error: errors.append(str(error)))
   await page.goto('http://localhost:8080', wait_until='networkidle')
   await page.wait_for_timeout(1000)
   destinations=await page.locator('footer a[href^="/"]').evaluate_all('(links)=>links.map(a=>({href:a.getAttribute("href"),text:a.textContent}))')
   for destination in destinations:
    await page.goto('http://localhost:8080', wait_until='networkidle')
    await page.evaluate('document.fonts.ready')
    await page.wait_for_function("document.querySelector('.nx-hero>img').complete")
    link=page.locator('footer').get_by_role('link',name=destination['text'],exact=True)
    await link.scroll_into_view_if_needed()
    await page.evaluate('''()=>{window.outgoingTop=false;window.sampling=true;function sample(){if(location.pathname==='/' && scrollY<20)window.outgoingTop=true;if(window.sampling)requestAnimationFrame(sample)}requestAnimationFrame(sample)}''')
    await link.click()
    await page.wait_for_url('**'+destination['href'])
    await page.wait_for_timeout(350)
    await page.evaluate('window.sampling=false')
    assert not await page.evaluate('window.outgoingTop'), destination
    assert await page.evaluate('scrollY')==0, destination
   print(width,':',len(destinations),'footer destinations at top; outgoing page never scrolled to top')
   await page.goto('http://localhost:8080', wait_until='networkidle')
   await page.wait_for_timeout(500)
   await page.locator('footer').scroll_into_view_if_needed()
   start=await page.evaluate('scrollY')
   await page.locator('footer').get_by_role('link',name='About',exact=True).click()
   await page.wait_for_url('**/about')
   await page.wait_for_timeout(300)
   await page.go_back()
   await page.wait_for_timeout(500)
   assert page.url=='http://localhost:8080/'
   restored=await page.evaluate('scrollY')
   assert abs(restored-start)<3,(start,restored)
   await page.go_forward()
   await page.wait_for_timeout(400)
   assert page.url.endswith('/about') and await page.evaluate('scrollY')==0
   await page.goto('http://localhost:8080', wait_until='networkidle')
   await page.wait_for_timeout(500)
   # Exercise native same-page anchor behavior without adding visible application content.
   await page.evaluate('''()=>{const a=document.createElement('a');a.href='#standard';a.id='anchor-check';a.textContent='Anchor test';document.querySelector('main').prepend(a)}''')
   await page.locator('#anchor-check').click()
   await page.wait_for_timeout(300)
   assert page.url.endswith('/#standard'), page.url
   assert abs(await page.locator('#standard').evaluate('(el)=>el.getBoundingClientRect().top'))<3
   await page.screenshot(path=f'/tmp/browser/navigation-scroll/anchor-{width}.png')
   print(width,': Back/Forward restored position; same-page anchor reached target; runtime errors:',len(errors))
   assert not errors,errors
   await page.close()
  await browser.close()
asyncio.run(main())
