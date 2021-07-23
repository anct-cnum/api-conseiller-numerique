const puppeteer = require('puppeteer');

(async () => {
  const dateDebut = new Date(1625148574000);
  const dateFin = new Date(1627049374000);
  const email = 'morgan.prioux@beta.gouv.fr';
  const password = 'Apqmwn_8';

  console.log(dateDebut.getDay());
  const jourDebut = dateDebut.getDay() > 9 ? '0' + dateDebut.getDay() : '00' + dateDebut.getDay();
  const btnJourDebutClick = '#span-datePickerDebut > .react-datepicker__day--004';
  /**/const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login', {
    waitUntil: 'networkidle2',
  });

  await page.focus('#email');
  await page.keyboard.type(email);

  await page.focus('#password');
  await page.keyboard.type(password);

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
    //page.click('#span-datePickerDebut'),
    page.focus('#datePickerDebutPDF'),
    page.keyboard.type(dateDebut)
  ]);

  await Promise.all([
    page.pdf({ path: 'statistiques.pdf', format: 'A4', printBackground: true })
  ]);
  await browser.close(); /**/
})();
