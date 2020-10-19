const puppeteer = require("puppeteer");
const mysql = require("./connection");
const { scrollPageToBottom } = require("puppeteer-autoscroll-down");

async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

(async ()=>{  
    const keyword = 'laptop';
    const extractProducts = async url=>{
        const page = await browser.newPage();
        await page.goto(url,{waitUntil:'networkidle0'}); 
        console.log(url)           
        await page.setViewport({
            width: 1200,
            height: 800
        });
    
        await autoScroll(page);
        
        await page.screenshot({path:'web.png',fullPage:true})

        const productsOnPage = await page.evaluate(() => 
            Array.from(document.querySelectorAll("div.shopee-search-item-result__item")).map(compact =>({                
                title: compact.querySelector("div.shopee-search-item-result__item div._1NoI8_").innerHTML.trim(),
                image: compact.querySelector("div.shopee-search-item-result__item div._39-Tsj > img").src,
                price: compact.querySelector("div.shopee-search-item-result__item span._341bF0").innerHTML.trim().replace('.','').replace('.',''),
                website: "Shopee"
            }))
        );        
        await page.close();        
        const nextPageNumber = parseInt(url.match(/page=(\d+)$/)[1],10)+1;
        if(nextPageNumber > 5){
            return productsOnPage
        }else{                   
            const nextUrl = `https://shopee.co.id/search?keyword=${keyword}&page=${nextPageNumber}`;          
            return productsOnPage.concat(await extractProducts(nextUrl))
        }

    };  
    const url = `https://shopee.co.id/search?keyword=${keyword}&page=1`;        
    const browser = await puppeteer.launch({headless: false});
    const dataProduct = await extractProducts(url)                   
    const insertToDatbase = (dataProduct)=>{        
        for (let index = 0; index < dataProduct.length; index++) {
            const data = dataProduct[index];
            mysql.query("INSERT INTO products (nama,img_url,harga,website) VALUES(?,?,?,?)",[data.title,data.image,data.price,data.website],(err,rows,fields)=>{
                if(err) throw err;
                console.log("Insert Success")
            })
        }        
    }  
    console.log(dataProduct)  
    // insertToDatbase(dataProduct)
    await browser.close();
})();