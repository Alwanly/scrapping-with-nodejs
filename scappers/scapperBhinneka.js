const puppeteer = require("puppeteer");
const mysql = require("../database/connection");

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
            Array.from(document.querySelectorAll("div.bt-product-catalog-item")).map(compact =>({                
                title: compact.querySelector("div.bt-product-catalog-item__title > p").innerHTML.trim(),
                image: compact.querySelector("div.bt-product-catalog-item__image > img").src,
                price: compact.querySelector("p.bt-product-catalog-item__price-normal").innerHTML.trim().replace("Rp","").replace('.','').replace('.',''),
                website: "Bhinneka"
            }))
        );        
        await page.close();        
        const nextPageNumber = parseInt(url.match(/page=(\d+)$/)[1],10)+1;
        if(nextPageNumber > 5){
            return productsOnPage
        }else{                   
            const nextUrl = `https://www.bhinneka.com/jual?cari=${keyword}&page=${nextPageNumber}`;          
            return productsOnPage.concat(await extractProducts(nextUrl))
        }        
    };  
    const url = `https://www.bhinneka.com/jual?cari=${keyword}&page=1`;        
    const browser = await puppeteer.launch({headless: false});
    const dataProduct = await extractProducts(url)                   
    console.log(dataProduct);
    
    const insertToDatbase = (dataProduct)=>{        
        for (let index = 0; index < dataProduct.length; index++) {
            const data = dataProduct[index];
            mysql.query("INSERT INTO products (nama,img_url,harga,website) VALUES(?,?,?,?)",[data.title,data.image,data.price,data.website],(err,rows,fields)=>{
                if(err) throw err;
                console.log("Insert Success")
            })
        }        
    }    
    insertToDatbase(dataProduct)
    await browser.close();
 
})();