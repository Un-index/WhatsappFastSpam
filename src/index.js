/**
 * @fileoverview a fast message spam tool for whatsapp
 * @author un-index
 * @todo  support a dynamically loaded wordlist for spam messages?
 * @todo make the sending part work in headless mode (testing showed this isn't possible but try again)
 */

// NOTE: .prettierrc.json file to specify single-quotes

const playwright = require('playwright-chromium');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

// NOTE: make sure to cd the whatsappspammer dir in the terminal before the code is executed via node,
// otherwise the relative path below will cause playwright to look for Chrome in the directory  where
// node is being run from instead of the file dir

// default (Win): %USERPROFILE%\AppData\Local\ms-playwright
// const executablePath = './chromium-907428/chrome-win/chrome.exe';
// change to false to log uncaughtException errors
const hookProcessUncaughtException = true;

// how many messages to send
let send;
// message to send
let message;
// exact Contact Name as it appears on whatsapp
let contactName;

// config
const characterTypeDelay = 0; // default 0.65 (but 0.25 works without issues)
const iterationDelay = 0; // default 100  (but 60 works without issues)
const assumedEnterKeypressDelay = 5; // default 5

let messagesSent = 0;

// prettier-ignore
function estimateDuration(){
  // each iteration takes:
  const iterationTime = (message.length * characterTypeDelay*10**(-3)) + assumedEnterKeypressDelay*10**(-3) + iterationDelay*10**(-3)
  const totalIterationTime = iterationTime * send


  return totalIterationTime;
  // e.g 1000 * (((0.65 * 10^-3)*12)+(100*10^-3)+(5*10^-3))
  // return send * (((characterTypeDelay * 10**(-3))*message.length)+(iterationDelay*10**(-3))+(assumedEnterKeypressDelay*10**(-3)))
}

(async () => {
  let timeStart, timeEnd;
  // find a better way to hide errors encountered in terminating child processes
  // process.on('unhandledRejection', () => {});

  /**
   * displays some statistics and exits
   * @function
   */
  // prettier-ignore
  let exit = (msg) => {
    // to seconds
    const timeTaken = (timeEnd - timeStart) * 10 ** -3;
    // something seems off about the line below...
    console.error('\x1b[31m%s\x1b[0m', msg+"\n" ||'ERR: UncaughtException error\n');
    console.log('\x1b[33m%s\x1b[0m','# Statistics\n------------')
    // console.table({'messages sent': messagesSent,'time taken': timeTaken,'average messages/second':messagesSent/timeTaken + ' msg/sec' })
    console.log(
      // '\x1b[33m%s\x1b[0m',
      `
       messages sent: ${messagesSent},
       time taken: ${timeTaken.toPrecision(5)}s, 
       average messages/second: ${(messagesSent / timeTaken).toPrecision(5)} msg/sec
      `.replace(/^\s+/gm, '')
    );
    process.exit();
  };
  // e.g on ctrl ^ c interrupt and stuff

  // NOTE IN CASE OF THINGS NOT WORKING AS EXPECTED, REMOVE THIS LINE AND SEE WHAT'S WRONG
  if (hookProcessUncaughtException) {
    // console.log('not logging uncaughtException errors');
    process.on('uncaughtException', exit);
  }

  contactName = await new Promise((resolve, reject) => {
    readline.question('\nenter contact name: ', (v) => {
      resolve(
        (v && v) ||
          exit(
            `bad argument, expected non-empty string contact name; got ${typeof v} '${v}'`
          )
      );
    });
  });

  message = await new Promise((resolve, reject) => {
    readline.question('\nenter the message to spam: ', (v) => {
      resolve(
        v ||
          (!console.log(
            "no message specified, using default message: 'spam message'"
          ) &&
            'spam message')
      );
    });
  });
  send = await new Promise((resolve, reject) => {
    readline.question('\nhow many times to send the message?: ', (v) => {
      if (!v || isNaN(v)) {
        exit(`bad argument, expected number; got ${typeof v} '${v}'`);
      }
      resolve(Number(v));
    });
  });

  // console.log(contactName, message, send);
  // console.log(typeof contactName, typeof message, typeof send);

  const estimated = estimateDuration();

  // prettier-ignore
  console.log(
    `\nestimated time duration: ${estimated} seconds (or around (${(estimated / 60).toPrecision(3)} m) (or around ${(estimated / 60 ** 2).toPrecision(3)} h)\n`
  );
  // NOTE: default viewport size isn't working, testing in emulator made it work
  const browser = await playwright['chromium'].launch({
    headless: false,
    // executablePath: executablePath,
  });

  // browser.on('disconnected', exit);

  // turn to headless once the QR is scanned (although testing that once didn't work)

  const context = await browser.newContext();
  const page = await context.newPage();

  // setting size
  await page.setViewportSize({ width: 986, height: 496 });

  await page.goto('https://web.whatsapp.com/');

  // deselect chrome omnibox
  // await page.tap('._26aja');

  // first wait for QR to appear
  await page.waitForFunction(() => document.querySelector('.b77wc'));

  // now wait for it to disappear (QR has been scanned after it)
  await page.waitForFunction(() => !document.querySelector('.b77wc'));

  //   QR has been scanned
  //   storageState = await page.context().storageState();

  //   note: doesn't seem to be working in headless mode
  //   const browser = await playwright["chromium"].launch({ headless: false });

  //   // use saved cookies and stuff
  //   const context = await browser.newContext({ storageState: storageState });

  //   const page = await context.newPage();
  //   ????

  // wait for page to load
  await page.waitForFunction(() => document.querySelector('._2JIth'));

  // click the correct contact button
  // await page.click(`text=${contactName}`);

  setTimeout(async () => {
    if ((await page.$(`span[title='${contactName}']`)) === null) {
      browser.close();
      exit(`no contact found with name: '${contactName}'`);
    }
  }, 1200);
  await page.click(`[title="${contactName}"]`);

  // wait for textbox to load
  await page.waitForFunction(() => document.querySelector('._13NKt'));

  // await page.keyboard.type(message, { delay: 1 });
  // await page.keyboard.press("Enter");

  /**
   * recursively sends the specified number of messages
   * @function
   */

  async function loop() {
    if (messagesSent === send) {
      timeEnd = Date.now();
      setTimeout(() => {
        browser.close();
        exit('job complete');
      }, characterTypeDelay * message.length + 4000);
      return;
    }

    setTimeout(async () => {
      // type the message and press the Enter key
      await page.keyboard.type(message, { delay: characterTypeDelay });
      await page.keyboard.press('Enter');
      ++messagesSent;
      loop();
    }, iterationDelay);
  }

  timeStart = Date.now();
  await loop();

  // note: maybe we could use playwright to do the spamming for us?
  // maybe no Python required?
  // await browser.close();

  // main();
  // return;
})();
