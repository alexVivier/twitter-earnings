#!/usr/bin/env node

import puppeteer from 'puppeteer';
import inquirer from "inquirer";
import {CURRENCY_RATES} from "./constants.js";
import ora from 'ora';


const TWEET_URL = 'https://twitter.com/nocontextfooty/status/1694049910771880160';

(async () => {

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'tweetURL',
            message: 'Please enter the tweet link:',
            validate: input => input.startsWith('https://twitter.com/') ? true : 'Veuillez entrer un lien de tweet valide.'
        },
        {
            type: 'list',
            name: 'currency',
            message: 'Choose your currency:',
            choices: ['$', '€', '£'],
            default: '$'
        }
    ]);

    const spinner = ora('Loading tweet...').start();

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--log-level=3',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36');

    // Intercepter les logs de la console du navigateur.
    // page.on('console', consoleObj => console.log(consoleObj.text()));
    const currency =  answers.currency;
    await page.goto(answers.tweetURL, { waitUntil: 'load' });
    const selector = "#react-root > div > div > div.css-1dbjc4n.r-18u37iz.r-13qz1uu.r-417010 > main > div > div > div > div > div > section > div > div > div > div > div:nth-child(1) > div > div > article > div > div > div:nth-child(3) > div.css-1dbjc4n.r-1r5su4o > div > div.css-1dbjc4n.r-1wbh5a2.r-1b7u577 > div > div.css-901oao.r-18jsvk2.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-qvutc0 > span > div > span > span > span";
    await page.waitForSelector(selector, { timeout: 5000 });

    const tweetEarnings = await page.evaluate((selector, currency, CURRENCY_RATES) => {
        function getEarningsFromViews(views, currency) {
            const rate = CURRENCY_RATES[currency];
            let number = parseFloat(views.replace(',', '.'));

            if (views.includes('k')) {
                number *= 1e3;
            } else if (views.includes('M')) {
                number *= 1e6;
            }

            return number * rate;
        }

        const element = document.querySelector(selector);
        if (element) {
            return getEarningsFromViews(element.textContent, currency);
        }
        return 0;
    }, selector, currency, CURRENCY_RATES);
    spinner.succeed(`The tweet earned its creator ${tweetEarnings.toFixed(2)} ${currency}\n`)
    await browser.close();
})();
