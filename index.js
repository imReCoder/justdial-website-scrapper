const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
// Change These Values To Search
const CITY = 'Bangalore';
const KEYWORD = 'Plumber';
const INITIAL_PAGE = 0;
const NUMBER_OF_PAGES = 1;

const NUMBER_CODE_MAP = {
  'icon-acb': '0',
  'icon-yz': '1',
  'icon-wx': '2',
  'icon-vu': '3',
  'icon-ts': '4',
  'icon-rq': '5',
  'icon-po': '6',
  'icon-nm': '7',
  'icon-lk': '8',
  'icon-ji': '9',
  'icon-dc': '+',
  'icon-fe': '(',
  'icon-hg': ')',
  'icon-ba': '-',
};

const autoScroll = async (page) => {
  await page.evaluate(async () => {
    await new Promise((resolve, _) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
};

const parsePage = async (pageNumber) => {
  puppeteer.use(stealthPlugin());

  let directory = [];
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();

    await page.goto(
      `https://www.justdial.com/${CITY}/${KEYWORD}/page-${pageNumber}`, { waitUntil: 'load', timeout: 0 }
    );
    await page.addScriptTag({ url: "https://html2canvas.hertzen.com/dist/html2canvas.min.js" });
    await page.addScriptTag({ url: "https://unpkg.com/tesseract.js@v2.0.0-alpha.4/dist/tesseract.min.js" });


    const filepath = path.join(__dirname, "inject.js");
    await page.addScriptTag({ path: require.resolve(filepath) });
    await autoScroll(page);

    directory = await page.evaluate(async (NUMBER_CODE_MAP) => {
      const entries = [];
      const listings = document.getElementsByClassName('cntanr');

      for await (const listing of listings) {
        console.log('listing', listing);
        const name = listing.getElementsByClassName('lng_cont_name')[0]
          .textContent;
        const url = listing.attributes[1].value;
        const p = await screenshot(listing.getElementsByClassName('contact-info')[0]);
        console.log("phone is ", p);
        // const phoneNumberArr = Array.from(
        //   listing.getElementsByClassName('mobilesv')
        // );
        // console.log("Phone number arr ", phoneNumberArr);
        // const phoneNumber = phoneNumberArr
        //   .map((number) => NUMBER_CODE_MAP[number.classList[1]])
        //   .join('');

        entries.push({ name, url, phoneNumber: p });
      }

      return entries;
    }, NUMBER_CODE_MAP);

    console.log('Total Listing.s Found:', directory.length);

    for await (const listing of directory) {
      console.log('Navigating to Listing:', listing.name);

      await page.goto(listing.url);
      console.log("listing info is ", listing);
      const details = await page.evaluate(() => {
        const name = document
          .getElementsByClassName('rstotle')[0]
          ?.textContent?.trim() | '';
        const rating = document.getElementsByClassName('total-rate')[0]
          ?.textContent || '';
        const votes = document
          .getElementsByClassName('votes')[0]
          .textContent.trim();
        const address = document
          .getElementById('fulladdress')
          .getElementsByClassName('lng_add')[0]?.textContent || '';
        removedn('showmore');
        const categoriesArr = Array.from(
          document.getElementsByClassName('showmore')[0].children
        );
        const categories = categoriesArr
          .map((category) => category.textContent.trim())
          .join(', ');
        const servicesNode = document.getElementsByClassName(
          '.quickinfowrp'
        )[0];
        const businfo =
          document.getElementsByClassName('detl') &&
          document.getElementsByClassName('detl')[0]
            ? document.getElementsByClassName('detl')[0]?.innerText || ''
            : '-';
        const faq =
          document.getElementsByClassName('city_sec') &&
          document.getElementsByClassName('city_sec')[0]
            ? document.getElementsByClassName('city_sec')[0]?.innerText
            : '-';

        let details = {
          name,
          rating,
          votes,
          address,
          categories,
          businfo,
          faq
        };

        if (servicesNode) {
          const servicesArr = Array.from(
            document
              .getElementsByClassName('.quickinfowrp')[0]
              .getElementsByClassName('text')
          );
          const services = servicesArr
            .map((service) => service.textContent.trim())
            .join(', ');

          details = {
            ...details,
            services,
          };
        }

        return details;
      });

      const listingIndex = directory.findIndex((x) => x.url === listing.url);
      directory[listingIndex] = { ...directory[listingIndex], ...details };
      console.log(directory);
    }
  } catch (e) {
    console.error(e);
  } finally {
    fs.readFile('results.json', function (err, data) {
      if (err) throw err;

      var json = [...JSON.parse(data), ...directory];
      fs.writeFile(
        'results.json',
        JSON.stringify(json, null, 2),
        function (err) {
          if (err) throw err;
        }
      );
    });
    await browser.close();
  }
};

const main = async () => {
  const pages = [...Array(NUMBER_OF_PAGES).keys()];

  try {
    for await (const page of pages) {
      const pageNumber = INITIAL_PAGE + page + 1;

      console.log('Starting with page', pageNumber);

      await parsePage(pageNumber);
    }
  } catch (e) {
    console.error(e);
  }

  console.log('Script Execution Complete');
};

main();
