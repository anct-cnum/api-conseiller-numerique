const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login', {
    waitUntil: 'networkidle2',
  });

  await page.focus('#email');
  await page.keyboard.type('morgan.prioux@beta.gouv.fr');

  await page.focus('#password');
  await page.keyboard.type('Apqmwn_8');

  await Promise.all([
    await page.click('#submit'),
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
  ]);

  await Promise.all([
    page.$eval('a#statistiques', el => el.click()),
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.addStyleTag({ content: '#burgerMenu { display: none} .no-print { display: none } ' }),
    page.waitForTimeout(1500),
  ]);

  await Promise.all([
    page.pdf({ path: 'hn.pdf', format: 'A4', printBackground: true })
  ]);
  await browser.close();
})();
