
const puppeteer = require('puppeteer');

const generatePdf = async (app, res, logger, accessToken, user, finUrl = null) => {

  const browser = await puppeteer.launch();

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
    logger.info('Création du client');
  } catch (error) {
    app.get('sentry').captureException(error);
    logger.error(error);
  }

  try {
    const page = await browser.newPage();
    await Promise.all([
      page.goto(app.get('espace_coop_hostname') + '/statistiques' + finUrl, { waitUntil: 'networkidle0' }),
    ]);
    logger.info('Atterissage sur la page statistiques');
    await page.waitForTimeout(500);

    let pdf;
    await Promise.all([
      page.addStyleTag({ content: '#burgerMenu { display: none} .no-print { display: none }' }),
      pdf = page.pdf({ format: 'A4', printBackground: true })
    ]);
    logger.info('Génération du pdf');
    await browser.close();

    res.contentType('application/pdf');
    pdf.then(buffer => res.send(buffer));
    logger.info('Envoi du pdf');
  } catch (error) {
    app.get('sentry').captureException(error);
    logger.error(error);
  }

  return;
};

module.exports = { generatePdf };
