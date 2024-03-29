
const { GeneralError } = require('@feathersjs/errors');
const puppeteer = require('puppeteer');

const downBrowser = async (noWss, browser) => {
  if (noWss) {
    await browser.close();
  } else {
    await browser.disconnect();
  }
};

const generatePdf = async (app, res, logger, accessToken, user, finUrl = null) => {

  let browser = null;

  const noWss = app.get('espace_coop_hostname') === 'http://localhost:3000';
  if (noWss) {
    //fonctionnement en local
    browser = await puppeteer.launch({
      executablePath: app.get('puppeteer_browser')
    });
  } else {
    //fonctionnement sur les autres environnements
    const browserURL = app.get('browser_wss_link') + '?token=' + app.get('browser_wss_token');
    browser = await puppeteer.connect({
      browserWSEndpoint: browserURL,
    });
  }
  if (browser !== null) {
    try {
      browser.on('targetchanged', async target => {
        const targetPage = await target.page();
        const client = await targetPage.target().createCDPSession();
        await client.send('Runtime.evaluate', {
          expression: `localStorage.setItem('user', '{"accessToken":"${accessToken}",` +
        `"authentication":{` +
          `"strategy":"local",` +
          `"accessToken":"${accessToken}"},` +
        `"user":${JSON.stringify(user)}}')`
        });
      });
    } catch (error) {
      await downBrowser(noWss, browser);
      app.get('sentry').captureException(error);
      logger.error(error);
    }

    let pdf;
    try {
      const page = await browser.newPage();
      await Promise.all([
        await page.goto(app.get('espace_coop_hostname') + '/statistiques' + finUrl, { waitUntil: 'networkidle0', timeout: 60000 }),
        await page.waitForTimeout(500),
        await page.addStyleTag({ content: '#burgerMenu { display: none} .no-print { display: none }' }),
        pdf = page.pdf({ format: 'A4', printBackground: true })
      ]);

      await downBrowser(noWss, browser);

      res.contentType('application/pdf');
      pdf.then(buffer => res.send(buffer));
    } catch (error) {
      await downBrowser(noWss, browser);
      app.get('sentry').captureException(error);
      logger.error(error);
      res.status(500).send(new GeneralError('Une erreur est survenue lors de la création du PDF, veuillez réessayer ultérieurement.').toJSON());
    }
  }
  return;
};

module.exports = { generatePdf };
