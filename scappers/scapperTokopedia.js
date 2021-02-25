const puppeteer = require("puppeteer");
const mysql = require("../database/connection");
const { scrollPageToBottom } = require("puppeteer-autoscroll-down");

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

const getLinks = async () => {
  const keyword = "laptop%20asus";
  const extractProducts = async (url) => {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    console.log(url);
    await page.setViewport({
      width: 1200,
      height: 800,
    });

    await autoScroll(page);

    await page.screenshot({ path: "web.png", fullPage: true });

    const productsOnPage = await page.evaluate(() =>
      Array.from(document.querySelectorAll("div.css-1sn1xa2")).map(
        (compact) => ({
          link: `${compact.getElementsByTagName("a")[0]}`,
        })
      )
    );
    await page.close();
    const nextPageNumber = parseInt(url.match(/(\d+)$/)[1], 10) + 1;
    console.log(nextPageNumber);
    if (nextPageNumber > 5) {
      return productsOnPage;
    } else {
      const nextUrl = `https://www.tokopedia.com/kurmanurmecca/product/page/${nextPageNumber}`;
      console.log(nextUrl);
      return productsOnPage.concat(await extractProducts(nextUrl));
    }
  };
  const url = "https://www.tokopedia.com/haali-store/product/page/1";
  const browser = await puppeteer.launch({ headless: false });
  const dataProduct = await extractProducts(url);
  const insertToDatbase = (dataProduct) => {
    for (let index = 0; index < dataProduct.length; index++) {
      const data = dataProduct[index];
      mysql.query(
        "INSERT INTO tokped_link (link) VALUES(?)",
        [data.link],
        (err, rows, fields) => {
          if (err) throw err;
          console.log("Insert Success");
        }
      );
    }
  };

  insertToDatbase(dataProduct);
  await browser.close();
};

(async () => {  
  await getLinks();  
  const browser = await puppeteer.launch({ headless: false });
  mysql.query("SELECT link FROM tokped_link", async (err, result, fields) => {
    if (err) throw err;
    let links = JSON.parse(JSON.stringify(result));
    // console.log(links);
    for (let i = 0; i < links.length; i++) {
      await extractProduct(links[i].link);
    }
    await browser.close();
  });

  const extractProduct = async (url) => {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    // console.log(url);
    await page.setViewport({
      width: 1200,
      height: 800,
    });

    await autoScroll(page);

    const productsOnPage = await page.evaluate(
      () =>
        (data = {
          nameProduct: document.querySelector("h1.css-v7vvdw").innerHTML,
          desc:document.querySelector("div[data-testid='lblPDPDescriptionProduk'").innerHTML,
          price: document.querySelector("div.price").innerHTML,
          berat: document
            .querySelectorAll("li.css-r0v3c0")[1]
            .querySelector("span.main").innerHTML,
        })
    );
    await page.close();
    console.log(productsOnPage);
    await mysql.query(
      "INSERT INTO products (nama,desc,harga,berat) VALUES(?,?,?,?)",
      [productsOnPage.nameProduct,productsOnPage.desc, productsOnPage.price, productsOnPage.berat],
      (err, rows, fields) => {
        if (err) throw err;
        console.log("Insert Success");
      }
    );
  };
})();
