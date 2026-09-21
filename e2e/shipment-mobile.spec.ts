import { test, expect } from '@playwright/test';
const uid='00000000-0000-4000-8000-000000000001';
const tid='00000000-0000-4000-8000-000000000002';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'qa@example.invalid',user_metadata:{name:'Trackbliss QA'},app_metadata:{provider:'email'},created_at:'2026-01-01T00:00:00Z'};
const token=[{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+86400}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.local-test-fixture';
const session={access_token:token,refresh_token:'local-test-only',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+86400,expires_in:86400,user};
const product={id:uid,tenant_id:tid,name:'Mobiler QA-Produkttest mit langem Produktnamen',manufacturer:'QA Hersteller',gtin:'4006381333931',serial_number:'QA-001',category:'Test',description:'Isolierte Testdaten',status:'active',created_at:'2026-09-01T00:00:00Z',updated_at:'2026-09-01T00:00:00Z',materials:[],certifications:[],product_batches:[],product_components:[]};
const shipment={id:uid,tenant_id:tid,shipment_number:'SHP-20260921-QA1234',status:'draft',recipient_type:'customer',recipient_name:'Testperson mit langem Empf?ngernamen',shipping_street:'Teststrasse 123',shipping_city:'Teststadt',shipping_postal_code:'12345',shipping_country:'DE',total_items:2,priority:'normal',order_reference:'Etsy QA-0001',created_at:'2026-09-21T08:00:00Z',updated_at:'2026-09-21T08:00:00Z'};
const order={id:uid,tenant_id:tid,platform:'etsy',external_order_id:'QA-0001',external_order_number:'QA-0001',customer_name:'QA Testkunde',customer_country:'DE',currency:'EUR',total_amount:51.98,item_count:2,dpp_linked_count:1,dpp_total_count:1,financial_status:'paid',fulfillment_status:'unfulfilled',order_status:'open',placed_at:'2026-09-21T08:00:00Z',created_at:'2026-09-21T08:00:00Z',metadata:{}};

test.use({ reducedMotion: 'no-preference', serviceWorkers: 'block' });
test('shipment wizard retains input on rotation and actions remain reachable', async ({ context, page }, testInfo) => {
  test.setTimeout(120000);
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
   if(!url.hostname.endsWith('supabase.co')){return route.abort();}
   const table=url.pathname.split('/').at(-1);
   const single=route.request().headers()['accept']?.includes('object+json');
   let rows=[];
   if(table==='admin-api'){
    const operation=route.request().postDataJSON()?.operation;
    rows={success:true,data:operation==='get_platform_stats'?{totalTenants:0,totalUsers:0,totalProducts:0,activeReturns:0,paidTenants:0,mrr:0,recentSignups7d:0,aiCreditsUsedMonth:0,planDistribution:{free:0,pro:0,enterprise:0}}:[]};
   }
   else if(table==='countries')rows=[{id:uid,code:'DE',name:'Germany',name_de:'Deutschland',alpha2:'DE',is_active:true}];
   else if(table==='product_batches')rows=[{id:uid,product_id:uid,serial_number:'QA-BATCH',status:'active',quantity:20}];
   else if(table==='wh_stock_levels')rows=[{id:uid,product_id:uid,batch_id:uid,location_id:uid,quantity_available:20,quantity_reserved:0}];
   else if(table==='products')rows=[product];
   else if(table==='wh_shipments')rows=[shipment];
   else if(table==='wh_locations')rows=[{id:uid,tenant_id:tid,name:'QA Lager',code:'QA',type:'warehouse',is_active:true,created_at:'2026-09-01T00:00:00Z'}];
   else if(table==='wh_shipment_items')rows=[{id:uid,tenant_id:tid,shipment_id:uid,product_id:uid,location_id:uid,batch_id:null,quantity:2,quantity_picked:0,quantity_packed:0,unit_price:25.99,currency:'EUR',products:product}];
   else if(table==='commerce_orders')rows=[order];
   else if(table==='commerce_order_items')rows=[{id:uid,tenant_id:tid,order_id:uid,title:product.name,quantity:2,unit_price:25.99,total_price:51.98,product_id:uid,match_method:'manual',created_at:'2026-09-21T08:00:00Z'}];
   else if(table==='user')rows=user;
   else if(table==='token')rows=session;
   else if(table==='profiles')rows=[{id:uid,tenant_id:tid,email:user.email,full_name:'Trackbliss QA',role:'admin',is_super_admin:true,admin_role:'super_admin'}];
   else if(table==='tenants')rows=[{id:tid,name:'QA Testunternehmen',slug:'qa-test',settings:{},created_at:'2026-01-01T00:00:00Z'}];
   else if(table==='billing_subscriptions')rows=[{tenant_id:tid,plan:'enterprise',status:'active'}];
   else if(table==='billing_module_subscriptions')rows=['returns_hub_business','warehouse_business','commerce_hub_business','feedback_business'].map(module_id=>({module_id,status:'active'}));
   else if(table==='billing_credits')rows=[{monthly_allowance:1000,monthly_used:0,purchased_balance:1000}];
   let body=single && Array.isArray(rows)?(rows[0]??null):rows;
   if(route.request().method()==='HEAD')body='';
   await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','content-range':`0-0/${Array.isArray(rows)?rows.length:1}`},body:body===''?'':JSON.stringify(body)});
  });
await context.addInitScript(({session,storageKey})=>{
   for (const key of ['sb-xbnybrqzsjlbieqlwsas-auth-token', 'sb-placeholder-auth-token', storageKey]) {
     localStorage.setItem(key,JSON.stringify(session));
   }
   localStorage.setItem('dpp-language','de');
  },{session,storageKey:`sb-${new URL(process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co').hostname.split('.')[0]}-auth-token`});

  await page.setViewportSize({width:390,height:844});
  await page.goto('/warehouse/shipments');
  const shipmentCard = page.getByRole('link').filter({hasText:'SHP-20260921-QA1234'}).filter({visible:true});
  await expect(shipmentCard).toBeVisible({timeout:15000});
  await expect(page.getByText('SHP-20260921-QA1234').filter({visible:true})).toHaveJSProperty('scrollWidth', await page.getByText('SHP-20260921-QA1234').filter({visible:true}).evaluate(e=>e.clientWidth));
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({width,height:844});
    await expect.poll(() => shipmentCard.evaluate(e => e.getBoundingClientRect().right)).toBeLessThanOrEqual(width);
    const clipped = await shipmentCard.locator('span, div').evaluateAll(elements => elements.filter(e => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
    expect(clipped).toEqual([]);
  }
  await page.screenshot({path:testInfo.outputPath('shipment-list-390.png'),fullPage:true});
  await page.getByRole('link',{name:'Sendung erstellen',exact:true}).click();
  await expect(page.getByPlaceholder('Vollst\u00e4ndiger Name')).toHaveCount(1);
  const name = page.getByPlaceholder('Vollst\u00e4ndiger Name');
  await name.fill('QA Rotation Test');
  await page.getByPlaceholder('Stra\u00dfe und Hausnummer').fill('Teststra\u00dfe 12');
  await page.getByPlaceholder('PLZ').fill('12345');
  await page.getByRole('textbox',{name:'Stadt',exact:true}).fill('Berlin');
  await page.setViewportSize({width:844,height:390});
  await expect(name).toHaveValue('QA Rotation Test');
  await expect(page.getByPlaceholder('PLZ')).toHaveValue('12345');
  await page.setViewportSize({width:390,height:844});
  await expect(name).toHaveValue('QA Rotation Test');
  const next=page.getByRole('button',{name:'Weiter',exact:true}).filter({visible:true});
  await expect(next).toBeEnabled();
  await expect(next).toBeInViewport();
  await page.screenshot({path:testInfo.outputPath('shipment-recipient-390.png')});
  await next.click();
  await expect(page.getByRole('heading',{name:'Positionen',exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:/Position hinzuf\u00fcgen/}).click();
  await page.getByRole('combobox').filter({hasText:/^Produkt ausw\u00e4hlen$/}).click();
  await page.getByRole('option',{name:product.name}).click();
  await page.getByRole('combobox').filter({hasText:'Charge ausw\u00e4hlen'}).click();
  await page.getByRole('option',{name:/QA-BATCH/}).click();
  await page.getByRole('combobox').filter({hasText:'Lager ausw\u00e4hlen'}).click();
  await page.getByRole('option',{name:'QA Lager'}).click();
  await page.setViewportSize({width:844,height:390});
  await expect(page.getByRole('combobox').filter({hasText:product.name})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByText('3 / 4')).toBeVisible();
  await next.click();
  await expect(page.getByText('4 / 4')).toBeVisible();
  await expect(page.getByRole('button',{name:'Erstellen & Senden'}).filter({visible:true})).toBeInViewport();
  await expect(page.getByText('QA Rotation Test', {exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('shipment-review-390.png'),fullPage:true});
});



